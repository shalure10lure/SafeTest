
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { MoreThan, Repository } from 'typeorm';

import { Paralelo } from '../paralelo/entity/paralelo.entity';
import { Estudiante } from '../estudiante/entity/estudiante.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';
import {
  EstadoInvitacion,
  Invitacion,
} from './entity/invitacion.entity';
import { CreateInvitacionDto } from './dto/create-invitacion.dto';
import { ConexionCorreoService } from '../conexion-correo/conexion-correo.service';

@Injectable()
export class InvitacionService {
  constructor(
    @InjectRepository(Invitacion)
    private readonly invitacionRepository: Repository<Invitacion>,

    @InjectRepository(Paralelo)
    private readonly paraleloRepository: Repository<Paralelo>,

    @InjectRepository(Estudiante)
    private readonly estudianteRepository: Repository<Estudiante>,

    @InjectRepository(Inscripcion)
    private readonly inscripcionRepository: Repository<Inscripcion>,
    private readonly conexionCorreoService: ConexionCorreoService,
    private readonly configService: ConfigService,
  ) {}

  private async validarParalelo(
    paraleloId: number,
    docenteId: number,
  ) {
    const paralelo = await this.paraleloRepository.findOne({
      where: {
        paralelo_id: paraleloId,
        docente_id: docenteId,
      },
      relations: {
        materia: true,
        semestre: true,
      },
    });

    if (!paralelo) {
      throw new NotFoundException(
        'Paralelo no encontrado o no autorizado.',
      );
    }

    return paralelo;
  }

  async findAll(paraleloId: number, docenteId: number) {
    await this.validarParalelo(paraleloId, docenteId);

    return this.invitacionRepository.find({
      select: {
        invitacion_id: true,
        paralelo_id: true,
        correo_institucional: true,
        estado: true,
        fecha_creacion: true,
        fecha_envio: true,
        fecha_expiracion: true,
      },
      where: { paralelo_id: paraleloId },
      order: { fecha_creacion: 'DESC' },
    });
  }

  async create(
    paraleloId: number,
    docenteId: number,
    body: CreateInvitacionDto,
  ) {
    const paralelo = await this.validarParalelo(
      paraleloId,
      docenteId,
    );

    const correo = body.correo_institucional
      ?.trim()
      .toLowerCase();

    if (
      !correo ||
      correo.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
      throw new BadRequestException(
        'Introduce un correo electrónico válido.',
      );
    }

    const estudiante = await this.estudianteRepository.findOne({
      where: { correo_institucional: correo },
    });

    if (estudiante) {
      const inscripcion = await this.inscripcionRepository.findOne({
        where: {
          estudiante_id: estudiante.estudiante_id,
          paralelo_id: paraleloId,
        },
      });

      if (inscripcion) {
        throw new ConflictException(
          'El estudiante ya pertenece a este paralelo.',
        );
      }
    }

    const pendiente = await this.invitacionRepository.findOne({
      where: {
        paralelo_id: paraleloId,
        correo_institucional: correo,
        estado: EstadoInvitacion.PENDIENTE,
        fecha_expiracion: MoreThan(new Date()),
      },
    });

    if (pendiente) {
      throw new ConflictException(
        'Ya existe una invitación pendiente para este correo.',
      );
    }

    
// Obtener la dirección del frontend para crear el enlace.
const frontendUrl = this.configService.get<string>(
  'FRONTEND_URL',
);

if (!frontendUrl) {
  throw new ServiceUnavailableException(
    'La dirección del frontend no está configurada.',
  );
}

// Verificar que el docente haya autorizado Gmail.
const conexionGmail =
  await this.conexionCorreoService.obtenerEstado(
    docenteId,
  );

if (!conexionGmail.conectado) {
  throw new ForbiddenException(
    'Debes conectar Gmail antes de enviar invitaciones.',
  );
}


    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const fechaExpiracion = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    const invitacion = this.invitacionRepository.create({
      paralelo_id: paraleloId,
      correo_institucional: correo,
      estado: EstadoInvitacion.PENDIENTE,
      token_hash: tokenHash,
      fecha_expiracion: fechaExpiracion,
      fecha_envio: null,
    });

    const guardada =
      await this.invitacionRepository.save(invitacion);

    const enlace = new URL(
      '/invitaciones/aceptar',
      frontendUrl,
    );
    enlace.searchParams.set('token', token);

    
try {
  // Enviar desde el Gmail autorizado del docente.
  await this.conexionCorreoService.enviarInvitacion(
    docenteId,
    correo,
    paralelo.nombre_paralelo,
    enlace.toString(),
  );
} catch (error: unknown) {
  // La invitación existe, pero Gmail no confirmó
  // correctamente el envío.
  guardada.estado = EstadoInvitacion.ERROR;

  await this.invitacionRepository.save(guardada);

  // Conservar los mensajes específicos del servicio:
  // por ejemplo, Gmail desconectado o autorización vencida.
  if (error instanceof HttpException) {
    throw error;
  }

  throw new ServiceUnavailableException(
    'La invitación se registró, pero Gmail no pudo enviarla.',
  );
}


    guardada.fecha_envio = new Date();

    try {
      await this.invitacionRepository.save(guardada);
    } catch {
      throw new InternalServerErrorException(
        'El correo se envió, pero no se pudo actualizar el registro.',
      );
    }

    return {
      invitacion_id: guardada.invitacion_id,
      correo_institucional: guardada.correo_institucional,
      estado: guardada.estado,
      fecha_creacion: guardada.fecha_creacion,
      fecha_envio: guardada.fecha_envio,
      message: 'Invitación enviada correctamente.',
    };
  }
}
