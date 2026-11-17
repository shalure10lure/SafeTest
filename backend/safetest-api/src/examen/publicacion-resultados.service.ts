import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';

import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';
import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { ExamenPoolSnapshotPregunta } from '../examenpoolsnapshot/entity/examen-pool-snapshot-pregunta.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import { escalarPuntajeProporcional, formatearPuntaje } from '../reglacorreccion/correccion-puntaje';
import { Examen } from './entity/examen.entity';

@Injectable()
export class PublicacionResultadosService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** HU-32: publica notas SOLO después de la confirmación de HU-31. */
  async publicar(examenId: number, docenteId: number) {
    return this.dataSource.transaction(async (manager) => {
      // Este bloqueo también se usa en HU-31 al confirmar o modificar notas.
      const examen = await manager.getRepository(Examen)
        .createQueryBuilder('examen')
        .where('examen.examen_id = :examenId', { examenId })
        .andWhere('examen.docente_id = :docenteId', { docenteId })
        .setLock('pessimistic_write')
        .getOne();

      if (!examen) throw new NotFoundException('La evaluación no existe o no pertenece al docente.');
      if (examen.estado !== 'publicado') {
        throw new ConflictException('Primero debes publicar la evaluación para que se pueda rendir.');
      }

      // Idempotencia: nunca cambiar la fecha de una publicación ya realizada.
      if (examen.resultados_publicados_en !== null) {
        return {
          examen_id: examenId,
          resultados_publicados_en: examen.resultados_publicados_en,
          ya_publicados: true,
        };
      }
      if (examen.calificaciones_revisadas_en === null) {
        throw new ConflictException('Primero confirma la revisión de calificaciones (HU-31).');
      }
      if (!examen.disponible_hasta || new Date(examen.disponible_hasta).getTime() > Date.now()) {
        throw new ConflictException('La evaluación debe haber finalizado antes de publicar resultados.');
      }

      const rendiciones = await manager.getRepository(Rendicion).find({ where: { examen_id: examenId } });
      if (!rendiciones.length) throw new ConflictException('No existen rendiciones para publicar.');
      if (rendiciones.some((r) => r.estado !== 'corregida' || r.nota_final === null)) {
        throw new ConflictException('Existen rendiciones sin corregir o con nota pendiente.');
      }

      const fecha = new Date();
      await manager.getRepository(Examen).update(
        { examen_id: examenId, docente_id: docenteId },
        { resultados_publicados_en: fecha },
      );
      return { examen_id: examenId, resultados_publicados_en: fecha, ya_publicados: false };
    });
  }

  /** El estudiante ve sus propias rendiciones; una nota nunca sale antes de publicarse. */
  async listarParaEstudiante(estudianteId: number) {
    const rendiciones = await this.dataSource.getRepository(Rendicion)
      .createQueryBuilder('rendicion')
      .innerJoin('rendicion.estudiante', 'estudiante', 'estudiante.activo = true')
      .innerJoinAndSelect('rendicion.examen', 'examen')
      .leftJoinAndSelect('examen.materia', 'materia')
      .leftJoinAndSelect('examen.docente', 'docente')
      .where('rendicion.estudiante_id = :estudianteId', { estudianteId })
      .andWhere('rendicion.estado <> :estadoEnCurso', { estadoEnCurso: 'en_curso' })
      .andWhere('examen.estado = :estadoExamen', { estadoExamen: 'publicado' })
      .orderBy('rendicion.fecha_envio', 'DESC')
      .getMany();

    return rendiciones.map((rendicion) => {
      const examen = rendicion.examen;
      const publicado = examen.resultados_publicados_en !== null &&
        examen.calificaciones_revisadas_en !== null &&
        rendicion.estado === 'corregida' && rendicion.nota_final !== null;
      return {
        examen_id: examen.examen_id,
        titulo: examen.titulo,
        materia: examen.materia?.nombre ?? null,
        docente: examen.docente?.nombre ?? null,
        fecha_envio: rendicion.fecha_envio,
        resultados_publicados_en: publicado ? examen.resultados_publicados_en : null,
        estado: publicado ? 'publicado' : 'pendiente',
        // Nunca revelar una nota todavía no publicada.
        nota_final: publicado ? rendicion.nota_final : null,
        puntaje_total: publicado ? examen.puntaje_total : null,
      };
    });
  }

  /** Detalle oficial: pregunta, puntaje y retroalimentación, SIN soluciones. */
  async detalleParaEstudiante(examenId: number, estudianteId: number) {
    const rendicion = await this.dataSource.getRepository(Rendicion)
      .createQueryBuilder('rendicion')
      .innerJoin('rendicion.estudiante', 'estudiante', 'estudiante.activo = true')
      .innerJoinAndSelect('rendicion.examen', 'examen')
      .leftJoinAndSelect('examen.materia', 'materia')
      .leftJoinAndSelect('examen.docente', 'docente')
      .where('rendicion.examen_id = :examenId', { examenId })
      .andWhere('rendicion.estudiante_id = :estudianteId', { estudianteId })
      .getOne();
    if (!rendicion) throw new NotFoundException('No se encontró el resultado solicitado.');

    const examen = rendicion.examen;
    if (examen.estado !== 'publicado' ||
        examen.calificaciones_revisadas_en === null ||
        examen.resultados_publicados_en === null ||
        rendicion.estado !== 'corregida' || rendicion.nota_final === null) {
      throw new ForbiddenException('El resultado oficial todavía no fue publicado.');
    }

    const asignaciones = await this.dataSource.getRepository(AsignacionPregunta).find({
      where: { examen_id: examenId, estudiante_id: estudianteId },
      relations: { pregunta: true },
      order: { orden: 'ASC' },
    });
    const ids = [...new Set(asignaciones.map((a) => a.pregunta_id))];
    if (!ids.length) throw new ConflictException('La rendición no tiene preguntas asignadas.');

    // La autorización de respuestas correctas es distinta de la publicación de notas.
    // Antes de autorizar, NO consultamos tablas de soluciones.
    const solucionesPublicadas = examen.respuestas_publicadas_en !== null;
    const [incisos, respuestas, puntajesManuales, puntajesSnapshot] = await Promise.all([
      this.dataSource.getRepository(Inciso).find({
        where: { pregunta_id: In(ids) },
        order: { letra: 'ASC' },
        ...(solucionesPublicadas ? {
          relations: { solucion: true, solucionesOpcion: true, opciones: true },
        } : {}),
      }),
      this.dataSource.getRepository(RespuestaInciso).find({
        where: { examen_id: examenId, estudiante_id: estudianteId, pregunta_id: In(ids) },
      }),
      this.dataSource.getRepository(ExamenPregunta).find({ where: { examen_id: examenId, pregunta_id: In(ids) } }),
      this.dataSource.getRepository(ExamenPoolSnapshotPregunta).find({ where: { examen_id: examenId, pregunta_id: In(ids) } }),
    ]);

    const maximos = new Map<number, number>();
    for (const fila of puntajesSnapshot) {
      const max = Number(fila.puntaje_maximo_pregunta);
      if (Number.isFinite(max) && max > 0) maximos.set(fila.pregunta_id, max);
    }
    for (const fila of puntajesManuales) {
      const max = Number(fila.puntaje);
      if (fila.puntaje !== null && Number.isFinite(max) && max > 0) maximos.set(fila.pregunta_id, max);
    }
    const respuestasPorClave = new Map(respuestas.map((r) => [`${r.pregunta_id}:${r.letra}`, r]));

    const preguntas = asignaciones.map((asignacion) => {
      const incisosPregunta = incisos.filter((i) => i.pregunta_id === asignacion.pregunta_id);
      const maximoBanco = incisosPregunta.reduce((s, i) => s + Number(i.puntaje_max), 0);
      const maximoExamen = maximos.get(asignacion.pregunta_id) ?? maximoBanco;
      const obtenidoBanco = incisosPregunta.reduce((s, inciso) => {
        const respuesta = respuestasPorClave.get(`${inciso.pregunta_id}:${inciso.letra}`);
        return s + Number(respuesta?.puntaje_obtenido ?? 0);
      }, 0);
      const obtenido = Number.isFinite(maximoBanco) && maximoBanco > 0 && maximoExamen !== maximoBanco
        ? escalarPuntajeProporcional(obtenidoBanco, maximoExamen, maximoBanco)
        : obtenidoBanco;

      return {
        pregunta_id: asignacion.pregunta_id,
        orden: asignacion.orden,
        enunciado: asignacion.pregunta.enunciado,
        // La explicación de la pregunta también es contenido restringido.
        explicacion: solucionesPublicadas ? (asignacion.pregunta.explicacion ?? null) : null,
        puntaje_max: formatearPuntaje(maximoExamen),
        puntaje_obtenido: formatearPuntaje(obtenido),
        incisos: incisosPregunta.map((inciso) => {
          const respuesta = respuestasPorClave.get(`${inciso.pregunta_id}:${inciso.letra}`);
          const correctas = solucionesPublicadas
            ? new Set((inciso.solucionesOpcion ?? []).map((solucion) => solucion.nro_opcion))
            : new Set<number>();
          return {
            letra: inciso.letra,
            enunciado_inciso: inciso.enunciado_inciso,
            puntaje_max: inciso.puntaje_max,
            puntaje_obtenido: respuesta?.puntaje_obtenido ?? '0.00',
            retroalimentacion: respuesta?.retroalimentacion ?? null,
            respuesta_estudiante: respuesta?.respuesta_texto ?? null,
            // Solo se incluyen soluciones tras la autorización explícita del docente.
            respuesta_correcta: solucionesPublicadas ? {
              opciones_correctas: (inciso.opciones ?? [])
                .filter((opcion) => correctas.has(opcion.nro_opcion))
                .map((opcion) => ({
                  nro_opcion: opcion.nro_opcion,
                  texto_opcion: opcion.texto_opcion,
                })),
              valor_correcto: inciso.solucion?.valor_correcto ?? null,
              tolerancia: inciso.solucion?.tolerancia ?? null,
              solucion_referencia: inciso.solucion?.rubrica ?? null,
            } : null,
          };
        }),
      };
    });

    return {
      examen_id: examenId,
      titulo: examen.titulo,
      materia: examen.materia?.nombre ?? null,
      docente: examen.docente?.nombre ?? null,
      nota_final: rendicion.nota_final,
      puntaje_total: examen.puntaje_total,
      fecha_publicacion: examen.resultados_publicados_en,
      respuestas_correctas_disponibles: examen.respuestas_publicadas_en !== null,
      preguntas,
    };
  }
}
