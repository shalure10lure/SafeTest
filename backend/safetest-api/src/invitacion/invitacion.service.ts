
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { MoreThan, Repository } from 'typeorm';

import { Paralelo } from '../paralelo/entity/paralelo.entity';
import { Estudiante } from '../estudiante/entity/estudiante.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';
import {
  EstadoInvitacion,
  Invitacion,
} from './entity/invitacion.entity';
import { CreateInvitacionDto } from './dto/create-invitacion.dto';

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

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = Number(
      this.configService.get<string>('SMTP_PORT'),
    );
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>(
      'SMTP_PASSWORD',
    );
    const smtpFrom = this.configService.get<string>('SMTP_FROM');
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
    );

    if (
      !smtpHost ||
      !smtpPort ||
      !smtpUser ||
      !smtpPassword ||
      !smtpFrom ||
      !frontendUrl
    ) {
      throw new ServiceUnavailableException(
        'El servicio de correo no está configurado.',
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
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: correo,
        subject: 'Invitación a un paralelo de SafeTest',
        text: [
          'Has recibido una invitación a SafeTest.',
          `Paralelo: ${paralelo.nombre_paralelo}`,
          `Enlace: ${enlace.toString()}`,
          'La invitación vence en 7 días.',
        ].join('\n'),
      });
    } catch {
      guardada.estado = EstadoInvitacion.ERROR;
      await this.invitacionRepository.save(guardada);

      throw new ServiceUnavailableException(
        'La invitación se registró, pero falló el envío del correo.',
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
