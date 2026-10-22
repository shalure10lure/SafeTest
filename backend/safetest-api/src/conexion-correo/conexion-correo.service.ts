
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { Repository } from 'typeorm';

import { Docente } from '../docente/entity/docente.entity';
import { ConexionCorreo } from './entity/conexion-correo.entity';
import { isEmail } from 'class-validator';
const GMAIL_SEND =
  'https://www.googleapis.com/auth/gmail.send';

interface ContextoOAuth {
  docenteId: number;
  estado: string;
  codeVerifier: string;
  creadoEn: number;
}

@Injectable()
export class ConexionCorreoService {
  private readonly logger = new Logger(ConexionCorreoService.name);
  private readonly clave: Buffer;

  constructor(
    @InjectRepository(ConexionCorreo)
    private readonly conexionRepository:
      Repository<ConexionCorreo>,

    @InjectRepository(Docente)
    private readonly docenteRepository:
      Repository<Docente>,

    private readonly configService: ConfigService,
  ) {
    const claveBase64 =
      this.configService.getOrThrow<string>(
        'GOOGLE_TOKEN_ENCRYPTION_KEY',
      );

    this.clave = Buffer.from(claveBase64, 'base64');

    if (this.clave.length !== 32) {
      throw new Error(
        'GOOGLE_TOKEN_ENCRYPTION_KEY debe contener 32 bytes en base64.',
      );
    }
  }

  // Cliente OAuth específico para autorizar Gmail.
  private crearClienteGoogle(): OAuth2Client {
    return new OAuth2Client(
      this.configService.getOrThrow<string>(
        'GOOGLE_CLIENT_ID',
      ),
      this.configService.getOrThrow<string>(
        'GOOGLE_CLIENT_SECRET',
      ),
      this.configService.getOrThrow<string>(
        'GOOGLE_MAIL_REDIRECT_URI',
      ),
    );
  }

  // CIFRADO AES-256-GCM
  private cifrar(texto: string): string {
    const iv = randomBytes(12);

    const cifrador = createCipheriv(
      'aes-256-gcm',
      this.clave,
      iv,
    );

    const contenido = Buffer.concat([
      cifrador.update(texto, 'utf8'),
      cifrador.final(),
    ]);

    const etiqueta = cifrador.getAuthTag();

    return [iv, etiqueta, contenido]
      .map((parte) => parte.toString('base64url'))
      .join('.');
  }

  private descifrar(valor: string): string {
    const partes = valor.split('.');

    if (partes.length !== 3) {
      throw new Error('Formato cifrado inválido.');
    }

    const [ivTexto, etiquetaTexto, contenidoTexto] =
      partes;

    const iv = Buffer.from(ivTexto, 'base64url');
    const etiqueta = Buffer.from(
      etiquetaTexto,
      'base64url',
    );
    const contenido = Buffer.from(
      contenidoTexto,
      'base64url',
    );

    if (iv.length !== 12 || etiqueta.length !== 16) {
      throw new Error('Datos cifrados inválidos.');
    }

    const descifrador = createDecipheriv(
      'aes-256-gcm',
      this.clave,
      iv,
    );

    descifrador.setAuthTag(etiqueta);

    return Buffer.concat([
      descifrador.update(contenido),
      descifrador.final(),
    ]).toString('utf8');
  }

  // INICIAR AUTORIZACIÓN DE GMAIL
  async iniciarConexion(docenteId: number) {
    const docente = await this.docenteRepository.findOne({
      where: { docente_id: docenteId },
    });

    if (!docente) {
      throw new NotFoundException(
        'Docente no encontrado.',
      );
    }

    const cliente = this.crearClienteGoogle();

    const { codeVerifier, codeChallenge } =
      await cliente.generateCodeVerifierAsync();

    const estado = randomBytes(32).toString('hex');

    const url = cliente.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'openid',
        'email',
        GMAIL_SEND,
      ],
      state: estado,
      login_hint: docente.correo,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });

    const contexto: ContextoOAuth = {
      docenteId,
      estado,
      codeVerifier,
      creadoEn: Date.now(),
    };

    return {
      url,
      cookieCifrada: this.cifrar(
        JSON.stringify(contexto),
      ),
    };
  }

  // COMPLETAR AUTORIZACIÓN DE GMAIL
  async completarConexion(
    codigo: string,
    estadoRecibido: string,
    cookieCifrada: string,
  ) {
    let contexto: ContextoOAuth;

    try {
      contexto = JSON.parse(
        this.descifrar(cookieCifrada),
      ) as ContextoOAuth;
    } catch {
      throw new BadRequestException(
        'Solicitud de autorización inválida.',
      );
    }

    if (
      !Number.isInteger(contexto.docenteId) ||
      contexto.docenteId <= 0 ||
      typeof contexto.estado !== 'string' ||
      typeof contexto.codeVerifier !== 'string' ||
      !Number.isFinite(contexto.creadoEn) ||
      contexto.creadoEn > Date.now() ||
      Date.now() - contexto.creadoEn > 5 * 60 * 1000
    ) {
      throw new BadRequestException(
        'La autorización expiró o es inválida.',
      );
    }

    const recibido = Buffer.from(estadoRecibido);
    const esperado = Buffer.from(contexto.estado);

    if (
      recibido.length !== esperado.length ||
      !timingSafeEqual(recibido, esperado)
    ) {
      throw new BadRequestException(
        'Estado OAuth inválido.',
      );
    }

    const cliente = this.crearClienteGoogle();

    const { tokens } = await cliente.getToken({
      code: codigo,
      codeVerifier: contexto.codeVerifier,
    });

    if (
      !tokens.id_token ||
      !tokens.access_token ||
      !tokens.refresh_token
    ) {
      throw new BadRequestException(
        'Google no devolvió los tokens necesarios. Intenta conectar Gmail nuevamente.',
      );
    }

    // Verificar el permiso concedido.
    const informacionToken =
      await cliente.getTokenInfo(
        tokens.access_token,
      );

    if (
      !informacionToken.scopes.includes(GMAIL_SEND)
    ) {
      throw new ForbiddenException(
        'Debes autorizar el envío de correos.',
      );
    }

    // Verificar la identidad real de Google.
    const ticket = await cliente.verifyIdToken({
      idToken: tokens.id_token,
      audience:
        this.configService.getOrThrow<string>(
          'GOOGLE_CLIENT_ID',
        ),
    });

    const perfil = ticket.getPayload();

    if (
      !perfil?.sub ||
      !perfil.email ||
      perfil.email_verified !== true
    ) {
      throw new ForbiddenException(
        'Google no pudo verificar el correo.',
      );
    }

    const correoGoogle =
      perfil.email.trim().toLowerCase();

    // Obtener también googleSub, que está oculto
    // por select: false en la entidad Docente.
    const docente =
      await this.docenteRepository
        .createQueryBuilder('docente')
        .addSelect('docente.googleSub')
        .where('docente.docente_id = :id', {
          id: contexto.docenteId,
        })
        .getOne();

    if (!docente) {
      throw new NotFoundException(
        'Docente no encontrado.',
      );
    }

    // La cuenta autorizada debe ser la misma
    // que el docente registró en SafeTest.
    if (
      correoGoogle !==
      docente.correo.trim().toLowerCase()
    ) {
      throw new ForbiddenException(
        'Debes autorizar el mismo correo de tu cuenta SafeTest.',
      );
    }

    // Si el docente se registró con Google,
    // exigimos también el mismo identificador.
    if (
      docente.googleSub &&
      docente.googleSub !== perfil.sub
    ) {
      throw new ForbiddenException(
        'La cuenta Google no coincide con tu cuenta SafeTest.',
      );
    }

    let conexion =
      await this.conexionRepository.findOne({
        where: {
          docenteId: docente.docente_id,
        },
      });

    if (!conexion) {
      conexion = this.conexionRepository.create({
        docenteId: docente.docente_id,
      });
    }

    conexion.proveedor = 'google';
    conexion.googleSub = perfil.sub;
    conexion.correoAutorizado = correoGoogle;
    conexion.refreshTokenCifrado = this.cifrar(
      tokens.refresh_token,
    );
    conexion.estado = 'conectada';

    await this.conexionRepository.save(conexion);

    return {
      conectado: true,
      correo: correoGoogle,
    };
  }

  // CONSULTAR EL ESTADO DE LA CONEXIÓN
  async obtenerEstado(docenteId: number) {
    const conexion =
      await this.conexionRepository.findOne({
        where: { docenteId },
      });

    return {
      conectado:
        conexion?.estado === 'conectada',
      correo: conexion?.correoAutorizado ?? null,
      estado: conexion?.estado ?? null,
    };
  }

  // Preparado para el próximo paso: enviar Gmail.
  async obtenerClienteParaEnvio(docenteId: number) {
    const conexion =
      await this.conexionRepository
        .createQueryBuilder('conexion')
        .addSelect(
          'conexion.refreshTokenCifrado',
        )
        .where('conexion.docenteId = :docenteId', {
          docenteId,
        })
        .getOne();

    if (
      !conexion ||
      conexion.estado !== 'conectada'
    ) {
      throw new ForbiddenException(
        'Debes conectar Gmail antes de enviar invitaciones.',
      );
    }

    const cliente = this.crearClienteGoogle();

    cliente.setCredentials({
      refresh_token: this.descifrar(
        conexion.refreshTokenCifrado,
      ),
    });

    return cliente;
  }

  // ENVIAR INVITACIÓN DESDE EL GMAIL DEL DOCENTE
  async enviarInvitacion(
    docenteId: number,
    correoEstudiante: string,
    nombreParalelo: string,
    enlaceInvitacion: string,
  ): Promise<{ mensajeId: string }> {
    // 1. Validar el destinatario.
    const destinatario =
      correoEstudiante.trim().toLowerCase();

    if (
      !isEmail(destinatario) ||
      /[\r\n]/.test(destinatario)
    ) {
      throw new BadRequestException(
        'El correo del estudiante no es válido.',
      );
    }

    // 2. Recuperar la conexión del docente.
    const conexion =
      await this.conexionRepository.findOne({
        where: { docenteId },
      });

    if (
      !conexion ||
      conexion.estado !== 'conectada'
    ) {
      throw new ForbiddenException(
        'Debes conectar Gmail antes de enviar invitaciones.',
      );
    }

    // 3. Obtener el cliente con el refresh token.
    const cliente =
      await this.obtenerClienteParaEnvio(docenteId);

    // 4. Validar el enlace de invitación.
    let urlInvitacion: URL;

    try {
      urlInvitacion = new URL(enlaceInvitacion);

      const frontendUrl = new URL(
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:3000',
      );

      if (urlInvitacion.origin !== frontendUrl.origin) {
        throw new Error('Origen no permitido');
      }
    } catch {
      throw new BadRequestException(
        'El enlace de invitación no es válido.',
      );
    }

    // 5. Preparar el correo.
    const asunto = 'Invitación a SafeTest';

    const contenido = [
      'Hola:',
      '',
      'Has recibido una invitación para unirte',
      'a un paralelo en SafeTest.',
      '',
      `Paralelo: ${nombreParalelo}`,
      '',
      'Para revisar tu invitación, visita:',
      urlInvitacion.toString(),
      '',
      'Si no esperabas esta invitación,',
      'puedes ignorar este mensaje.',
      '',
      'Equipo SafeTest',
    ].join('\n');

    // Codificación MIME para soportar acentos y ñ.
    const asuntoCodificado =
      '=?UTF-8?B?' +
      Buffer.from(asunto, 'utf8').toString('base64') +
      '?=';

    const cuerpoBase64 =
      Buffer.from(contenido, 'utf8')
        .toString('base64')
        .match(/.{1,76}/g)
        ?.join('\r\n') ?? '';

    const mensajeMime = [
      `From: SafeTest <${conexion.correoAutorizado}>`,
      `To: <${destinatario}>`,
      `Subject: ${asuntoCodificado}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      cuerpoBase64,
    ].join('\r\n');

    const raw = Buffer.from(
      mensajeMime,
      'utf8',
    ).toString('base64url');

    // 6. Enviar utilizando Gmail API.
    try {
      const respuesta = await cliente.request<{
        id?: string;
      }>({
        url:
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        method: 'POST',
        data: { raw },
      });

      if (!respuesta.data.id) {
        throw new Error(
          'Gmail no confirmó el envío.',
        );
      }

      return {
        mensajeId: respuesta.data.id,
      };

    } catch (error: unknown) {
      // Obtener información de diagnóstico sin imprimir
      // tokens, correos ni el contenido del mensaje.
      const fallo = error as {
        code?: string;
        response?: {
          status?: number;
          data?: {
            error?:
            | string
            | {
              status?: string;
              errors?: Array<{
                reason?: string;
              }>;
            };
          };
        };
      };

      const detalle = fallo.response?.data?.error;

      const codigoGoogle =
        typeof detalle === 'string'
          ? detalle
          : detalle?.status ?? 'desconocido';

      const motivoGoogle =
        typeof detalle === 'string'
          ? 'no_disponible'
          : detalle?.errors?.[0]?.reason ?? 'no_disponible';

      // Este mensaje aparecerá en la terminal NestJS.
      this.logger.error(
        `Gmail API falló: HTTP=${fallo.response?.status ?? 'sin_estado'}; ` +
        `codigo=${codigoGoogle}; ` +
        `motivo=${motivoGoogle}; ` +
        `red=${fallo.code ?? 'sin_codigo'}`,
      );

      if (codigoGoogle === 'invalid_grant') {
        await this.conexionRepository.update(
          { docenteId },
          { estado: 'requiere_reconexion' },
        );

        throw new ForbiddenException(
          'Tu autorización de Gmail venció o fue revocada. ' +
          'Vuelve a conectar Gmail.',
        );
      }

      throw new ServiceUnavailableException(
        'Gmail no pudo enviar la invitación. ' +
        'Inténtalo nuevamente.',
      );
    }
  }

}
