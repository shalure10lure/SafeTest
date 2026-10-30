
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource, Repository } from 'typeorm';

import { Estudiante } from '../estudiante/entity/estudiante.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';

import {
  EstadoInvitacion,
  Invitacion,
} from './entity/invitacion.entity';

@Injectable()
export class InvitacionAceptacionService {
  constructor(
    @InjectRepository(Invitacion)
    private readonly invitacionRepository:
      Repository<Invitacion>,

    @InjectRepository(Estudiante)
    private readonly estudianteRepository:
      Repository<Estudiante>,

    private readonly dataSource: DataSource,
  ) { }

  // Convertir el token recibido en su hash.
  // La base de datos nunca guarda el token original.
  private obtenerHash(token: string): string {
    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
      throw new BadRequestException(
        'El enlace de invitación no es válido.',
      );
    }

    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  // Comprobar que el estudiante puede usar la invitación.
  private verificarInvitacion(
    invitacion: Invitacion | null,
    estudiante: Estudiante,
  ): asserts invitacion is Invitacion {
    if (!invitacion) {
      throw new NotFoundException(
        'La invitación no existe o no es válida.',
      );
    }

    const destinatario =
      invitacion.correo_institucional
        .trim()
        .toLowerCase();

    const correoEstudiante =
      estudiante.correo_institucional
        .trim()
        .toLowerCase();

    if (destinatario !== correoEstudiante) {
      throw new ForbiddenException(
        'Esta invitación no está dirigida a tu cuenta.',
      );
    }

    if (invitacion.estado !== EstadoInvitacion.PENDIENTE) {
      throw new ConflictException(
        'Esta invitación ya no está pendiente.',
      );
    }

    if (
      new Date(invitacion.fecha_expiracion).getTime() <=
      Date.now()
    ) {
      throw new GoneException(
        'Esta invitación ha expirado.',
      );
    }
  }

  // HU-05: CONSULTAR INVITACIÓN
  async consultar(token: string, estudianteId: number) {
    const tokenHash = this.obtenerHash(token);

    const estudiante =
      await this.estudianteRepository.findOne({
        where: { estudiante_id: estudianteId },
      });

    if (!estudiante) {
      throw new UnauthorizedException(
        'Estudiante no encontrado.',
      );
    }

    const invitacion =
      await this.invitacionRepository.findOne({
        where: { token_hash: tokenHash },
        relations: {
          paralelo: {
            materia: true,
            semestre: true,
          },
        },
      });

    this.verificarInvitacion(invitacion, estudiante);

    // El enlace demuestra acceso al token secreto
    // enviado al correo del estudiante.
    // Solo consideramos invitaciones cuyo envío fue
    // confirmado por el backend.
    if (!invitacion.fecha_envio) {
      throw new ForbiddenException(
        'Esta invitación no tiene un envío confirmado.',
      );
    }

    if (!estudiante.correoVerificado) {
      await this.estudianteRepository.update(
        { estudiante_id: estudianteId },
        { correoVerificado: true },
      );
    }

    return {
      invitacion_id: invitacion.invitacion_id,
      correo_institucional:
        invitacion.correo_institucional,
      estado: invitacion.estado,
      fecha_expiracion: invitacion.fecha_expiracion,
      paralelo: {
        paralelo_id: invitacion.paralelo_id,
        nombre: invitacion.paralelo.nombre_paralelo,
        materia:
          invitacion.paralelo.materia?.nombre ?? null,
        periodo:
          invitacion.paralelo.semestre?.gestion ?? null,
      },
    };
  }

  // HU-05: ACEPTAR INVITACIÓN
  async aceptar(token: string, estudianteId: number) {
    const tokenHash = this.obtenerHash(token);

    // La inscripción y la actualización de la invitación
    // deben completarse juntas o deshacerse juntas.
    return this.dataSource.transaction(async (manager) => {
      const estudiante =
        await manager.getRepository(Estudiante).findOne({
          where: { estudiante_id: estudianteId },
        });

      if (!estudiante) {
        throw new UnauthorizedException(
          'Estudiante no encontrado.',
        );
      }

      // Bloqueamos la invitación durante la aceptación
      // para evitar que dos solicitudes la acepten a la vez.
      const invitacion = await manager
        .getRepository(Invitacion)
        .createQueryBuilder('invitacion')
        .where('invitacion.token_hash = :tokenHash', {
          tokenHash,
        })
        .setLock('pessimistic_write')
        .getOne();

      this.verificarInvitacion(invitacion, estudiante);

      // Registrar al estudiante en el paralelo.
      // La clave primaria compuesta impide duplicados.
      await manager
        .createQueryBuilder()
        .insert()
        .into(Inscripcion)
        .values({
          estudiante_id: estudianteId,
          paralelo_id: invitacion.paralelo_id,
        })
        .orIgnore()
        .execute();

      // La invitación ya fue utilizada.
      invitacion.estado = EstadoInvitacion.ACEPTADA;

      await manager
        .getRepository(Invitacion)
        .save(invitacion);
      await manager.getRepository(Estudiante).update(
        { estudiante_id: estudianteId },
        { correoVerificado: true },
      );
      return {
        message: 'Invitación aceptada correctamente.',
        invitacion_id: invitacion.invitacion_id,
        paralelo_id: invitacion.paralelo_id,
        estado: invitacion.estado,
      };
    });
  }

  // HU-05: LISTAR INVITACIONES DEL ESTUDIANTE
  async listarMisInvitaciones(estudianteId: number) {
    const estudiante =
      await this.estudianteRepository.findOne({
        where: { estudiante_id: estudianteId },
      });

    if (!estudiante) {
      throw new UnauthorizedException(
        'Estudiante no encontrado.',
      );
    }

    if (!estudiante.correoVerificado) {
      throw new ForbiddenException(
        'Para consultar tus invitaciones, primero abre ' +
        'el enlace de invitación recibido en tu correo.',
      );
    }

    const correo =
      estudiante.correo_institucional.trim().toLowerCase();

    const invitaciones =
      await this.invitacionRepository
        .createQueryBuilder('invitacion')
        .leftJoinAndSelect(
          'invitacion.paralelo',
          'paralelo',
        )
        .leftJoinAndSelect(
          'paralelo.materia',
          'materia',
        )
        .leftJoinAndSelect(
          'paralelo.semestre',
          'semestre',
        )
        .leftJoinAndSelect(
          'paralelo.docente',
          'docente',
        )
        .where(
          'LOWER(TRIM(invitacion.correo_institucional)) = :correo',
          { correo },
        )
        .andWhere(
          'invitacion.estado IN (:...estados)',
          {
            estados: [
              EstadoInvitacion.PENDIENTE,
              EstadoInvitacion.ACEPTADA,
            ],
          },
        )
        .andWhere(
          'invitacion.fecha_envio IS NOT NULL',
        )
        .orderBy(
          'invitacion.fecha_creacion',
          'DESC',
        )
        .take(100)
        .getMany();

    const ahora = Date.now();

    return invitaciones.map((invitacion) => {
      const vencida =
        invitacion.estado === EstadoInvitacion.PENDIENTE &&
        new Date(
          invitacion.fecha_expiracion,
        ).getTime() <= ahora;

      return {
        invitacion_id: invitacion.invitacion_id,
        correo_institucional:
          invitacion.correo_institucional,
        estado: vencida
          ? 'vencida'
          : invitacion.estado,
        fecha_creacion: invitacion.fecha_creacion,
        fecha_expiracion: invitacion.fecha_expiracion,

        paralelo: {
          paralelo_id: invitacion.paralelo_id,
          nombre: invitacion.paralelo.nombre_paralelo,
          materia:
            invitacion.paralelo.materia?.nombre ?? null,
          periodo:
            invitacion.paralelo.semestre?.gestion ?? null,
          docente:
            invitacion.paralelo.docente?.nombre ?? null,
        },
      };
    });
  }

  // HU-05: ACEPTAR DESDE EL PANEL DEL ESTUDIANTE
  async aceptarDesdePanel(
    invitacionId: number,
    estudianteId: number,
  ) {
    if (!Number.isSafeInteger(invitacionId) ||
      invitacionId <= 0) {
      throw new BadRequestException(
        'Identificador de invitación inválido.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const estudiante = await manager
        .getRepository(Estudiante)
        .findOne({
          where: { estudiante_id: estudianteId },
        });

      if (!estudiante || !estudiante.correoVerificado) {
        throw new ForbiddenException(
          'Debes verificar tu correo para aceptar desde el panel.',
        );
      }

      const invitacion = await manager
        .getRepository(Invitacion)
        .createQueryBuilder('invitacion')
        .where('invitacion.invitacion_id = :id', {
          id: invitacionId,
        })
        .setLock('pessimistic_write')
        .getOne();

      // Reutilizar la comprobación de correo, estado
      // y expiración que ya desarrollamos en HU-05.
      this.verificarInvitacion(invitacion, estudiante);

      if (!invitacion.fecha_envio) {
        throw new ForbiddenException(
          'Esta invitación no tiene envío confirmado.',
        );
      }

      await manager
        .createQueryBuilder()
        .insert()
        .into(Inscripcion)
        .values({
          estudiante_id: estudianteId,
          paralelo_id: invitacion.paralelo_id,
        })
        .orIgnore()
        .execute();

      invitacion.estado = EstadoInvitacion.ACEPTADA;

      await manager
        .getRepository(Invitacion)
        .save(invitacion);

      return {
        message: 'Invitación aceptada correctamente.',
        invitacion_id: invitacion.invitacion_id,
        paralelo_id: invitacion.paralelo_id,
        estado: invitacion.estado,
      };
    });
  }

}
