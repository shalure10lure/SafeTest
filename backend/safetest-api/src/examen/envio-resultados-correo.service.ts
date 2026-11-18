import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { isEmail } from 'class-validator';
import { DataSource, In, type EntityManager } from 'typeorm';

import { ConexionCorreoService } from '../conexion-correo/conexion-correo.service';
import { EnvioCalificacion } from '../enviocalificacion/entity/enviocalificacion.entity';
import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { Examen } from './entity/examen.entity';

// Usamos la tabla existente. No creamos una nueva tabla para HU-34.
type EstadoEnvio = 'pendiente' | 'enviando' | 'enviado' | 'error';

@Injectable()
export class EnvioResultadosCorreoService {
  private readonly logger = new Logger(EnvioResultadosCorreoService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly conexionCorreo: ConexionCorreoService,
  ) {}

  /** El docente decide antes de publicar si quiere enviar los resultados. */
  async configurar(examenId: number, docenteId: number, habilitado: unknown) {
    if (typeof habilitado !== 'boolean') {
      throw new BadRequestException('enviar_resultados_correo debe ser true o false.');
    }
    const activarCorreo: boolean = habilitado;
    if (activarCorreo) {
      const gmail = await this.conexionCorreo.obtenerEstado(docenteId);
      if (!gmail.conectado) {
        throw new ConflictException('Conecta tu Gmail institucional antes de activar el envío.');
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const examen = await manager.getRepository(Examen)
        .createQueryBuilder('examen')
        .where('examen.examen_id = :examenId', { examenId })
        .andWhere('examen.docente_id = :docenteId', { docenteId })
        .setLock('pessimistic_write')
        .getOne();

      if (!examen) throw new NotFoundException('La evaluación no existe o no pertenece al docente.');
      if (examen.resultados_publicados_en !== null) {
        throw new ConflictException('No puedes cambiar el envío por correo después de publicar las notas.');
      }
      await manager.getRepository(Examen).update(
        { examen_id: examenId, docente_id: docenteId },
        { enviar_resultados_correo: activarCorreo },
      );
    });
    return this.obtenerEstado(examenId, docenteId);
  }

  /** Se llama DENTRO de la transacción que publica las notas. */
  async prepararPendientes(
    manager: EntityManager,
    examenId: number,
    rendiciones: Rendicion[],
  ): Promise<void> {
    const repositorio = manager.getRepository(EnvioCalificacion);
    const existentes = await repositorio.find({ where: { examen_id: examenId } });
    const registrados = new Set(existentes.map((fila) => fila.estudiante_id));
    const fecha = new Date();

    const nuevos = rendiciones
      .filter((rendicion) => !registrados.has(rendicion.estudiante_id))
      .map((rendicion) => ({
        examen_id: examenId,
        estudiante_id: rendicion.estudiante_id,
        fecha,
        estado: 'pendiente' as EstadoEnvio,
      }));

    if (nuevos.length) await repositorio.insert(nuevos);
  }

  /** Estado real de la configuración y de cada envío. Solo docente propietario. */
  async obtenerEstado(examenId: number, docenteId: number) {
    const examen = await this.dataSource.getRepository(Examen).findOne({
      where: { examen_id: examenId, docente_id: docenteId },
    });
    if (!examen) throw new NotFoundException('La evaluación no existe o no pertenece al docente.');

    const [gmail, registros, rendiciones] = await Promise.all([
      this.conexionCorreo.obtenerEstado(docenteId),
      this.dataSource.getRepository(EnvioCalificacion).find({
        where: { examen_id: examenId },
        order: { envio_id: 'ASC' },
      }),
      this.dataSource.getRepository(Rendicion).find({
        where: { examen_id: examenId },
        relations: { estudiante: true },
      }),
    ]);
    const porEstudiante = new Map(rendiciones.map((r) => [r.estudiante_id, r.estudiante]));

    return {
      examen_id: examenId,
      enviar_resultados_correo: examen.enviar_resultados_correo,
      resultados_publicados_en: examen.resultados_publicados_en,
      gmail_conectado: gmail.conectado,
      correo_remitente: gmail.correo,
      total: registros.length,
      enviados: registros.filter((r) => r.estado === 'enviado').length,
      errores: registros.filter((r) => r.estado === 'error').length,
      pendientes: registros.filter((r) => r.estado === 'pendiente').length,
      enviando: registros.filter((r) => r.estado === 'enviando').length,
      envios: registros.map((r) => ({
        envio_id: r.envio_id,
        estudiante_id: r.estudiante_id,
        nombre_completo: porEstudiante.get(r.estudiante_id)?.nombre_completo ?? `Estudiante #${r.estudiante_id}`,
        correo_institucional: porEstudiante.get(r.estudiante_id)?.correo_institucional ?? null,
        estado: r.estado,
        fecha: r.fecha,
      })),
    };
  }

  /** Reintento explícito: solo registros 'error' o 'pendiente', nunca 'enviado'. */
  async reintentar(examenId: number, docenteId: number) {
    return this.procesar(examenId, docenteId, true);
  }

  /** Se ejecuta DESPUÉS del COMMIT. Nunca revierte la publicación si falla Gmail. */
  async procesar(examenId: number, docenteId: number, reintento = false) {
    const examen = await this.dataSource.getRepository(Examen).findOne({
      where: { examen_id: examenId, docente_id: docenteId },
    });
    if (!examen) throw new NotFoundException('La evaluación no existe o no pertenece al docente.');
    if (!examen.resultados_publicados_en || !examen.enviar_resultados_correo) {
      throw new ConflictException('Los resultados deben estar publicados con el correo habilitado.');
    }

    const registros = await this.dataSource.getRepository(EnvioCalificacion).find({
      where: {
        examen_id: examenId,
        estado: reintento ? In(['pendiente', 'error']) : 'pendiente',
      },
      order: { envio_id: 'ASC' },
    });
    const rendiciones = await this.dataSource.getRepository(Rendicion).find({
      where: { examen_id: examenId },
      relations: { estudiante: true },
    });
    const porEstudiante = new Map(rendiciones.map((r) => [r.estudiante_id, r]));
    const repo = this.dataSource.getRepository(EnvioCalificacion);

    // Tres envíos simultáneos para evitar que grupos grandes tarden demasiado,
    // sin lanzar todas las solicitudes contra Gmail a la vez.
    const procesarRegistro = async (registro: EnvioCalificacion): Promise<void> => {
      // Reclamar atómicamente: dos solicitudes no envían el mismo registro.
      const reclamado = await repo.update(
        { envio_id: registro.envio_id, estado: reintento ? In(['pendiente', 'error']) : 'pendiente' },
        { estado: 'enviando', fecha: new Date() },
      );
      if (!reclamado.affected) return;

      try {
        const rendicion = porEstudiante.get(registro.estudiante_id);
        if (!rendicion?.estudiante || rendicion.nota_final === null || !rendicion.estudiante.correo_institucional) {
          throw new Error('Faltan datos de la rendición o correo institucional.');
        }
        await this.enviarCorreo(
          docenteId,
          rendicion.estudiante.correo_institucional,
          examenId,
          examen.titulo ?? `Evaluación #${examenId}`,
          rendicion.nota_final,
          examen.puntaje_total,
        );
        await repo.update({ envio_id: registro.envio_id }, { estado: 'enviado', fecha: new Date() });
      } catch (error) {
        this.logger.warn(
          `No se pudo enviar el resultado: examen=${examenId}, estudiante=${registro.estudiante_id}, motivo=${error instanceof Error ? error.name : 'error'}`,
        );
        await repo.update({ envio_id: registro.envio_id }, { estado: 'error', fecha: new Date() });
      }
    };

    for (let i = 0; i < registros.length; i += 3) {
      await Promise.all(registros.slice(i, i + 3).map(procesarRegistro));
    }
    return this.obtenerEstado(examenId, docenteId);
  }

  /** Gmail API existente; remitente autorizado por el docente, destino institucional. */
  private async enviarCorreo(
    docenteId: number,
    correoEstudiante: string,
    examenId: number,
    titulo: string,
    nota: string,
    puntajeTotal: string | null,
  ): Promise<void> {
    const destinatario = correoEstudiante.trim().toLowerCase();
    if (!isEmail(destinatario) || /[\r\n]/.test(destinatario)) {
      throw new BadRequestException('El correo institucional del estudiante es inválido.');
    }
    const gmail = await this.conexionCorreo.obtenerEstado(docenteId);
    if (!gmail.conectado || !gmail.correo || !isEmail(gmail.correo)) {
      throw new ConflictException('El docente debe volver a conectar Gmail.');
    }
    const cliente = await this.conexionCorreo.obtenerClienteParaEnvio(docenteId);
    const origen = process.env.FRONTEND_URL || 'http://localhost:3000';
    const url = new URL(`/estudiante/resultados/${examenId}`, origen).toString();

    const asunto = 'Tu calificación está disponible en SafeTest';
    const contenido = [
      'Hola:',
      '',
      'Tu docente publicó la calificación de tu evaluación en SafeTest.',
      `Evaluación: ${titulo.replace(/[\r\n]/g, ' ')}`,
      `Calificación oficial: ${nota}${puntajeTotal ? ` / ${puntajeTotal}` : ''}`,
      '',
      'Consulta el detalle y la retroalimentación ingresando a tu cuenta:',
      url,
      '',
      'Este mensaje fue enviado automáticamente desde SafeTest.',
    ].join('\n');

    // UTF-8 MIME, igual que en enviarInvitacion() del servicio Gmail existente.
    const asuntoCodificado = `=?UTF-8?B?${Buffer.from(asunto, 'utf8').toString('base64')}?=`;
    const cuerpoBase64 = Buffer.from(contenido, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? '';
    const mime = [
      `From: SafeTest <${gmail.correo}>`,
      `To: <${destinatario}>`,
      `Subject: ${asuntoCodificado}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      cuerpoBase64,
    ].join('\r\n');

    const respuesta = await cliente.request<{ id?: string }>({
      url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      method: 'POST',
      data: { raw: Buffer.from(mime, 'utf8').toString('base64url') },
    });
    if (!respuesta.data.id) throw new Error('Gmail no confirmó el envío del mensaje.');
  }
}
