import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Examen } from '../examen/entity/examen.entity';
import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { EventoSeguridad } from '../eventoseguridad/entity/eventoseguridad.entity';

export type TipoEventoDetectable = 'pestana_oculta';

/**
 * HU-43: seguridad orientada a eventos OBSERVABLES por el navegador.
 * El navegador reporta el evento; no es prueba de uso de una aplicación externa.
 * La autoridad para permitir continuar es PostgreSQL, no un estado de React.
 */
@Injectable()
export class SeguridadRendicionService {
  constructor(private readonly dataSource: DataSource) {}

  async registrarEvento(
    examenId: number,
    estudianteId: number,
    tipo: TipoEventoDetectable,
  ) {
    // Validación en tiempo de ejecución, incluso si faltara ValidationPipe global.
    if (tipo !== 'pestana_oculta') {
      throw new BadRequestException('Tipo de evento de seguridad no admitido.');
    }
    return this.dataSource.transaction(async (manager) => {
      const examen = await manager.getRepository(Examen).findOne({
        where: { examen_id: examenId },
        select: { examen_id: true, bloquear_primer_cambio_pestana: true },
      });
      if (!examen) {
        throw new NotFoundException('La evaluación no existe.');
      }

      // Serializa el evento con el guardado/finalización de respuestas.
      const rendicion = await manager.getRepository(Rendicion).findOne({
        where: { examen_id: examenId, estudiante_id: estudianteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!rendicion) {
        throw new NotFoundException('La rendición no está disponible.');
      }

      // Una entrega finalizada nunca vuelve a bloquearse; tampoco se
      // generan múltiples eventos de bloqueo durante una misma restricción.
      if (rendicion.estado !== 'en_curso' || rendicion.bloqueada_seguridad_en !== null) {
        return {
          examen_id: examenId,
          tipo,
          evento_registrado: false,
          bloqueada_seguridad: rendicion.bloqueada_seguridad_en !== null,
          bloqueada_seguridad_en: rendicion.bloqueada_seguridad_en,
        };
      }

      const fecha = new Date();
      await manager.getRepository(EventoSeguridad).insert({
        examen_id: examenId,
        estudiante_id: estudianteId,
        tipo,
        fecha_hora: fecha,
      });

      if (examen.bloquear_primer_cambio_pestana) {
        // El bloqueo y el evento se confirman en la MISMA transacción.
        rendicion.bloqueada_seguridad_en = fecha;
        await manager.getRepository(Rendicion).save(rendicion);
      }

      return {
        examen_id: examenId,
        tipo,
        evento_registrado: true,
        bloqueada_seguridad: rendicion.bloqueada_seguridad_en !== null,
        bloqueada_seguridad_en: rendicion.bloqueada_seguridad_en,
      };
    });
  }

  async obtenerRendiciones(examenId: number, docenteId: number) {
    const examen = await this.dataSource.getRepository(Examen).findOne({
      where: { examen_id: examenId, docente_id: docenteId },
      select: { examen_id: true, titulo: true, bloquear_primer_cambio_pestana: true },
    });
    if (!examen) throw new NotFoundException('La evaluación no existe.');

    const rendiciones = await this.dataSource.getRepository(Rendicion).find({
      where: { examen_id: examenId },
      relations: { estudiante: true },
      order: { estudiante_id: 'ASC' },
    });
    const eventos = await this.dataSource.getRepository(EventoSeguridad).find({
      where: { examen_id: examenId },
      order: { fecha_hora: 'ASC', evento_id: 'ASC' },
    });
    const eventosPorEstudiante = new Map<number, EventoSeguridad[]>();
    for (const evento of eventos) {
      const lista = eventosPorEstudiante.get(evento.estudiante_id) ?? [];
      lista.push(evento);
      eventosPorEstudiante.set(evento.estudiante_id, lista);
    }

    return {
      examen_id: examenId,
      titulo: examen.titulo,
      bloquear_primer_cambio_pestana: examen.bloquear_primer_cambio_pestana,
      rendiciones: rendiciones.map((rendicion) => ({
        estudiante_id: rendicion.estudiante_id,
        nombre_completo: rendicion.estudiante?.nombre_completo ?? `Estudiante #${rendicion.estudiante_id}`,
        estado: rendicion.estado,
        bloqueada_seguridad_en: rendicion.bloqueada_seguridad_en,
        eventos: (eventosPorEstudiante.get(rendicion.estudiante_id) ?? []).map((evento) => ({
          evento_id: evento.evento_id,
          tipo: evento.tipo,
          fecha_hora: evento.fecha_hora,
        })),
      })),
    };
  }

  async desbloquear(examenId: number, estudianteId: number, docenteId: number) {
    return this.dataSource.transaction(async (manager) => {
      const examen = await manager.getRepository(Examen).findOne({
        where: { examen_id: examenId, docente_id: docenteId },
        select: {
          examen_id: true,
          disponible_hasta: true,
          duracion_min: true,
        },
      });
      if (!examen) throw new NotFoundException('La evaluación no existe.');

      const rendicion = await manager.getRepository(Rendicion).findOne({
        where: { examen_id: examenId, estudiante_id: estudianteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!rendicion) throw new NotFoundException('La rendición no existe.');
      if (rendicion.estado !== 'en_curso') {
        throw new ConflictException('No se puede reabrir una rendición enviada o corregida.');
      }

      const ahora = Date.now();
      const limiteExamen = examen.disponible_hasta
        ? new Date(examen.disponible_hasta).getTime()
        : Infinity;
      const limiteRendicion = rendicion.fecha_inicio && examen.duracion_min !== null
        ? new Date(rendicion.fecha_inicio).getTime() + examen.duracion_min * 60_000
        : Infinity;
      if (ahora >= Math.min(limiteExamen, limiteRendicion)) {
        throw new BadRequestException('El plazo terminó; no es posible desbloquear esta rendición.');
      }
      if (rendicion.bloqueada_seguridad_en === null) {
        return { examen_id: examenId, estudiante_id: estudianteId, desbloqueada: false };
      }

      rendicion.bloqueada_seguridad_en = null;
      await manager.getRepository(Rendicion).save(rendicion);
      await manager.getRepository(EventoSeguridad).insert({
        examen_id: examenId,
        estudiante_id: estudianteId,
        tipo: 'desbloqueo_docente',
        fecha_hora: new Date(),
      });

      return { examen_id: examenId, estudiante_id: estudianteId, desbloqueada: true };
    });
  }
}
