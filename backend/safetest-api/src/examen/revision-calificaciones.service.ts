import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, type EntityManager } from 'typeorm';

import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';
import { ExamenPoolSnapshotPregunta } from '../examenpoolsnapshot/entity/examen-pool-snapshot-pregunta.entity';
import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { FormulaElegida } from '../formulaelegida/entity/formulaelegida.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { OpcionMarcada } from '../opcionmarcada/entity/opcionmarcada.entity';
import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import { RespuestaModelo } from '../respuestamodelo/entity/respuestamodelo.entity';
import { escalarPuntajeProporcional, formatearPuntaje } from '../reglacorreccion/correccion-puntaje';
import { Examen } from './entity/examen.entity';

const ESTADOS_CORREGIDOS = new Set(['automatica', 'manual', 'revisada']);

interface EntradaValoracion {
  puntaje: number;
  retroalimentacion?: string | null;
}

/** Revisión HUMANA: nunca se vuelve a ejecutar el motor automático. */
@Injectable()
export class RevisionCalificacionesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  private async verificarExamen(
    manager: EntityManager,
    examenId: number,
    docenteId: number,
    bloquear = false,
  ): Promise<Examen> {
    // Filtro por docente_id: nunca permitir consultar notas de otro docente.
    const consulta = manager
      .getRepository(Examen)
      .createQueryBuilder('examen')
      .where('examen.examen_id = :examenId', { examenId })
      .andWhere('examen.docente_id = :docenteId', { docenteId });

    if (bloquear) consulta.setLock('pessimistic_write');
    const examen = await consulta.getOne();

    if (!examen) {
      throw new NotFoundException('La evaluación no existe o no pertenece al docente.');
    }
    if (examen.estado !== 'publicado') {
      throw new BadRequestException('La evaluación debe estar publicada para revisar sus calificaciones.');
    }
    return examen;
  }

  private asegurarEdicionPermitida(examen: Examen): void {
    if (examen.calificaciones_revisadas_en !== null) {
      throw new ConflictException('Las calificaciones ya fueron confirmadas; no se pueden modificar.');
    }
    if (examen.resultados_publicados_en !== null) {
      throw new ConflictException('Los resultados ya fueron publicados; no se pueden modificar.');
    }
  }

  private esPendiente(
    respuesta: RespuestaInciso | undefined,
    rendicion: Rendicion,
  ): boolean {
    // Compatibilidad con rendiciones anteriores a HU-31: el corrector viejo
    // no creaba filas para respuestas vacías calificadas automáticamente con 0.
    if (!respuesta) return rendicion.estado !== 'corregida';
    if (!ESTADOS_CORREGIDOS.has(respuesta.estado_correccion)) return true;
    return respuesta.puntaje_obtenido === null;
  }

  /** Resumen de las rendiciones que existen para este examen. */
  async obtenerResumen(examenId: number, docenteId: number) {
    return this.obtenerResumenConManager(this.dataSource.manager, examenId, docenteId);
  }

  // La confirmación llama a este método con SU MISMO EntityManager
  // para verificar las notas dentro de la transacción.
  private async obtenerResumenConManager(
    manager: EntityManager,
    examenId: number,
    docenteId: number,
  ) {
    const examen = await this.verificarExamen(manager, examenId, docenteId);
    const rendiciones = await manager.getRepository(Rendicion).find({
      where: { examen_id: examenId },
      relations: { estudiante: true },
      order: { estudiante_id: 'ASC' },
    });
    const asignaciones = await manager.getRepository(AsignacionPregunta).find({
      where: { examen_id: examenId },
    });
    const preguntaIds = [...new Set(asignaciones.map((a) => a.pregunta_id))];
    const [incisos, respuestas] = await Promise.all([
      preguntaIds.length
        ? manager.getRepository(Inciso).find({ where: { pregunta_id: In(preguntaIds) } })
        : Promise.resolve([] as Inciso[]),
      manager.getRepository(RespuestaInciso).find({ where: { examen_id: examenId } }),
    ]);

    const incisosPorPregunta = new Map<number, Inciso[]>();
    for (const inciso of incisos) {
      const grupo = incisosPorPregunta.get(inciso.pregunta_id) ?? [];
      grupo.push(inciso);
      incisosPorPregunta.set(inciso.pregunta_id, grupo);
    }

    const asignacionesPorEstudiante = new Map<number, number[]>();
    for (const asignacion of asignaciones) {
      const ids = asignacionesPorEstudiante.get(asignacion.estudiante_id) ?? [];
      ids.push(asignacion.pregunta_id);
      asignacionesPorEstudiante.set(asignacion.estudiante_id, ids);
    }

    const respuestasPorClave = new Map(
      respuestas.map((r) => [`${r.estudiante_id}:${r.pregunta_id}:${r.letra}`, r]),
    );

    const estudiantes = rendiciones.map((rendicion) => {
      const preguntasAsignadas = asignacionesPorEstudiante.get(rendicion.estudiante_id) ?? [];
      let totalIncisos = 0;
      let pendientes = 0;
      for (const preguntaId of preguntasAsignadas) {
        for (const inciso of incisosPorPregunta.get(preguntaId) ?? []) {
          totalIncisos += 1;
          const respuesta = respuestasPorClave.get(
            `${rendicion.estudiante_id}:${preguntaId}:${inciso.letra}`,
          );
          if (this.esPendiente(respuesta, rendicion)) pendientes += 1;
        }
      }
      // Una rendición sin asignaciones o que aún está en curso no está lista.
      const lista =
        rendicion.estado === 'corregida' &&
        rendicion.nota_final !== null &&
        totalIncisos > 0 &&
        pendientes === 0;

      return {
        estudiante_id: rendicion.estudiante_id,
        nombre_completo: rendicion.estudiante.nombre_completo,
        estado: rendicion.estado,
        nota_final: rendicion.nota_final,
        fecha_envio: rendicion.fecha_envio,
        total_incisos: totalIncisos,
        pendientes_revision: pendientes,
        lista_para_publicar: lista,
      };
    });

    return {
      examen_id: examenId,
      titulo: examen.titulo,
      puntaje_total: examen.puntaje_total,
      calificaciones_revisadas_en: examen.calificaciones_revisadas_en,
      resultados_publicados_en: examen.resultados_publicados_en,
      respuestas_publicadas_en: examen.respuestas_publicadas_en,
      disponible_hasta: examen.disponible_hasta,
      total_rendiciones: estudiantes.length,
      total_listas: estudiantes.filter((e) => e.lista_para_publicar).length,
      total_pendientes: estudiantes.filter((e) => !e.lista_para_publicar).length,
      estudiantes,
    };
  }

  /** Detalle por estudiante. Incluye respuestas, opciones y procedimiento. */
  async obtenerDetalle(examenId: number, estudianteId: number, docenteId: number) {
    const manager = this.dataSource.manager;
    const examen = await this.verificarExamen(manager, examenId, docenteId);
    const rendicion = await manager.getRepository(Rendicion).findOne({
      where: { examen_id: examenId, estudiante_id: estudianteId },
      relations: { estudiante: true },
    });
    if (!rendicion) throw new NotFoundException('La rendición del estudiante no existe.');

    const asignaciones = await manager.getRepository(AsignacionPregunta).find({
      where: { examen_id: examenId, estudiante_id: estudianteId },
      relations: { pregunta: true },
      order: { orden: 'ASC' },
    });
    const ids = asignaciones.map((a) => a.pregunta_id);
    if (!ids.length) throw new ConflictException('La rendición no tiene preguntas asignadas.');

    const [incisos, respuestas, opciones, procedimientos, formulas, puntajesExamen, puntajesSnapshot] =
      await Promise.all([
        manager.getRepository(Inciso).find({
          where: { pregunta_id: In(ids) },
          relations: { opciones: true, solucionesOpcion: true, solucion: true },
          order: { pregunta_id: 'ASC', letra: 'ASC' },
        }),
        manager.getRepository(RespuestaInciso).find({
          where: { examen_id: examenId, estudiante_id: estudianteId, pregunta_id: In(ids) },
        }),
        manager.getRepository(OpcionMarcada).find({
          where: { examen_id: examenId, estudiante_id: estudianteId, pregunta_id: In(ids) },
        }),
        manager.getRepository(RespuestaModelo).find({
          where: { examen_id: examenId, estudiante_id: estudianteId, pregunta_id: In(ids) },
        }),
        manager.getRepository(FormulaElegida).find({
          where: { examen_id: examenId, estudiante_id: estudianteId, pregunta_id: In(ids) },
        }),
        manager.getRepository(ExamenPregunta).find({ where: { examen_id: examenId, pregunta_id: In(ids) } }),
        manager.getRepository(ExamenPoolSnapshotPregunta).find({
          where: { examen_id: examenId, pregunta_id: In(ids) },
        }),
      ]);

    const respuestaPorClave = new Map(respuestas.map((r) => [`${r.pregunta_id}:${r.letra}`, r]));
    const opcionesPorClave = new Map<string, number[]>();
    for (const opcion of opciones) {
      const clave = `${opcion.pregunta_id}:${opcion.letra}`;
      opcionesPorClave.set(clave, [...(opcionesPorClave.get(clave) ?? []), opcion.nro_opcion]);
    }
    const procedimientoPorClave = new Map(procedimientos.map((p) => [`${p.pregunta_id}:${p.letra}`, p]));
    const formulasPorClave = new Map<string, number[]>();
    for (const formula of formulas) {
      const clave = `${formula.pregunta_id}:${formula.letra}`;
      formulasPorClave.set(clave, [...(formulasPorClave.get(clave) ?? []), formula.formula_id]);
    }
    const puntajesPorPregunta = this.puntajesPorPregunta(puntajesSnapshot, puntajesExamen);

    const preguntas = asignaciones.map((asignacion) => ({
      pregunta_id: asignacion.pregunta_id,
      orden: asignacion.orden,
      enunciado: asignacion.pregunta.enunciado,
      puntaje_maximo_evaluacion: puntajesPorPregunta.get(asignacion.pregunta_id) ?? null,
      incisos: incisos
        .filter((i) => i.pregunta_id === asignacion.pregunta_id)
        .map((inciso) => {
          const clave = `${inciso.pregunta_id}:${inciso.letra}`;
          const respuesta = respuestaPorClave.get(clave);
          const procedimiento = procedimientoPorClave.get(clave);
          const pendientes = this.esPendiente(respuesta, rendicion);
          const correctas = new Set(inciso.solucionesOpcion?.map((o) => o.nro_opcion) ?? []);
          return {
            letra: inciso.letra,
            enunciado_inciso: inciso.enunciado_inciso,
            tipo_respuesta: inciso.tipo_respuesta,
            puntaje_max: inciso.puntaje_max,
            respuesta_texto: respuesta?.respuesta_texto ?? null,
            puntaje_obtenido: respuesta?.puntaje_obtenido ??
              (!respuesta && rendicion.estado === 'corregida' ? '0.00' : null),
            estado_correccion: respuesta?.estado_correccion ??
              (!respuesta && rendicion.estado === 'corregida' ? 'automatica' : 'pendiente'),
            pendiente_revision: pendientes,
            retroalimentacion: respuesta?.retroalimentacion ?? null,
            opciones: (inciso.opciones ?? []).map((o) => ({
              nro_opcion: o.nro_opcion,
              texto_opcion: o.texto_opcion,
              seleccionada: (opcionesPorClave.get(clave) ?? []).includes(o.nro_opcion),
              correcta: correctas.has(o.nro_opcion),
            })),
            solucion_numerica: inciso.solucion?.valor_correcto ?? null,
            solucion_referencia: inciso.solucion?.rubrica ?? null,
            procedimiento: procedimiento
              ? {
                  modelo_id: procedimiento.modelo_id,
                  valores: procedimiento.valores,
                  resultado_final: procedimiento.resultado_final,
                  formula_ids: formulasPorClave.get(clave) ?? [],
                }
              : null,
          };
        }),
    }));

    return {
      examen_id: examenId,
      estudiante_id: estudianteId,
      nombre_completo: rendicion.estudiante.nombre_completo,
      titulo: examen.titulo,
      estado_rendicion: rendicion.estado,
      nota_final: rendicion.nota_final,
      calificaciones_revisadas_en: examen.calificaciones_revisadas_en,
      resultados_publicados_en: examen.resultados_publicados_en,
      preguntas,
    };
  }

  /** Cambia un puntaje oficial en una transacción y recalcula la nota. */
  async valorarInciso(
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
    docenteId: number,
    datos: unknown,
  ) {
    const entrada = this.validarEntrada(datos);
    return this.dataSource.transaction(async (manager) => {
      return this.aplicarValoracionOficial(
        manager,
        examenId,
        estudianteId,
        preguntaId,
        letra,
        docenteId,
        entrada,
      );
    });
  }

  /** Aplica una valoración en la transacción asociada al manager recibido. */
  async aplicarValoracionOficial(
    manager: EntityManager,
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
    docenteId: number,
    datos: unknown,
  ) {
    const entrada = this.validarEntrada(datos);
    return this.aplicarValoracionValidada(
      manager,
      examenId,
      estudianteId,
      preguntaId,
      letra,
      docenteId,
      entrada,
    );
  }

  private async aplicarValoracionValidada(
    manager: EntityManager,
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
    docenteId: number,
    entrada: EntradaValoracion,
  ) {
    // El mismo bloqueo que utiliza la publicación de respuestas evita
    // modificaciones simultáneas a la confirmación/publicación.
    const examen = await this.verificarExamen(manager, examenId, docenteId, true);
    this.asegurarEdicionPermitida(examen);
    const rendicion = await manager.getRepository(Rendicion).findOne({
      where: { examen_id: examenId, estudiante_id: estudianteId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!rendicion) throw new NotFoundException('La rendición no existe.');
    if (!['enviada', 'corregida'].includes(rendicion.estado)) {
      throw new ConflictException('Solo se pueden corregir rendiciones enviadas.');
    }

    const asignacion = await manager.getRepository(AsignacionPregunta).findOne({
      where: { examen_id: examenId, estudiante_id: estudianteId, pregunta_id: preguntaId },
    });
    if (!asignacion) throw new NotFoundException('La pregunta no fue asignada al estudiante.');
    const inciso = await manager.getRepository(Inciso).findOne({
      where: { pregunta_id: preguntaId, letra },
    });
    if (!inciso) throw new NotFoundException('El inciso no existe.');

    const maximo = Number(inciso.puntaje_max);
    if (!Number.isFinite(maximo) || maximo <= 0 || entrada.puntaje > maximo) {
      throw new BadRequestException(`El puntaje debe estar entre 0 y ${inciso.puntaje_max}.`);
    }

    const repositorio = manager.getRepository(RespuestaInciso);
    const clave = {
      examen_id: examenId,
      estudiante_id: estudianteId,
      pregunta_id: preguntaId,
      letra,
    };
    const existente = await repositorio.findOne({ where: clave });
    const respuesta = existente ?? repositorio.create({ ...clave, respuesta_texto: null });
    const actualizacion = {
      estado_correccion:
        respuesta.estado_correccion === 'automatica' || respuesta.estado_correccion === 'revisada'
          ? 'revisada'
          : 'manual',
      puntaje_obtenido: formatearPuntaje(entrada.puntaje),
      ...(entrada.retroalimentacion !== undefined
        ? { retroalimentacion: entrada.retroalimentacion }
        : {}),
    };
    Object.assign(respuesta, actualizacion);
    if (existente) {
      // Solo se escriben los campos oficiales; ia_* pertenece al flujo de propuestas.
      await repositorio.update(clave, actualizacion);
    } else {
      await repositorio.save(respuesta);
    }

    const recalculo = await this.recalcularRendicion(manager, rendicion);
    return {
      examen_id: examenId,
      estudiante_id: estudianteId,
      pregunta_id: preguntaId,
      letra,
      estado_correccion: respuesta.estado_correccion,
      puntaje_obtenido: respuesta.puntaje_obtenido,
      nota_final: recalculo.nota_final,
      estado_rendicion: recalculo.estado,
      pendientes_revision: recalculo.pendientes,
    };
  }

  /**
   * HU-31: guarda varias valoraciones de UN estudiante en una sola transacción.
   * Si una entrada es inválida, PostgreSQL revierte todas las modificaciones.
   * Se recalcula la nota una sola vez, al terminar el lote.
   */
  async valorarIncisosEnLote(
    examenId: number,
    estudianteId: number,
    docenteId: number,
    datos: unknown,
  ) {
    if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
      throw new BadRequestException('Envía un objeto con la lista de revisiones.');
    }

    const revisiones = (datos as Record<string, unknown>).revisiones;
    if (!Array.isArray(revisiones) || revisiones.length === 0 || revisiones.length > 300) {
      throw new BadRequestException('Envía entre 1 y 300 revisiones.');
    }

    // Todas las validaciones de estructura y formato ANTES de escribir en BD.
    const repetidas = new Set<string>();
    const entradas = revisiones.map((dato: unknown, indice) => {
      if (typeof dato !== 'object' || dato === null || Array.isArray(dato)) {
        throw new BadRequestException(`La revisión ${indice + 1} debe ser un objeto.`);
      }
      const fila = dato as Record<string, unknown>;
      if (!Number.isSafeInteger(fila.pregunta_id) || Number(fila.pregunta_id) <= 0 ||
          typeof fila.letra !== 'string' || !fila.letra.trim() || fila.letra.length > 10) {
        throw new BadRequestException(`Pregunta o inciso inválido en revisión ${indice + 1}.`);
      }
      const preguntaId = fila.pregunta_id as number;
      const letra = fila.letra as string;
      const identificador = `${preguntaId}:${letra}`;
      if (repetidas.has(identificador)) {
        throw new BadRequestException(`La pregunta ${preguntaId}, inciso ${letra}, está repetida.`);
      }
      repetidas.add(identificador);
      return {
        preguntaId,
        letra,
        valoracion: this.validarEntrada(fila),
      };
    });

    return this.dataSource.transaction(async (manager) => {
      // Mismo orden de bloqueos que valorarInciso/confirmar para evitar conflictos.
      const examen = await this.verificarExamen(manager, examenId, docenteId, true);
      this.asegurarEdicionPermitida(examen);
      const rendicion = await manager.getRepository(Rendicion).findOne({
        where: { examen_id: examenId, estudiante_id: estudianteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!rendicion) throw new NotFoundException('La rendición no existe.');
      if (!['enviada', 'corregida'].includes(rendicion.estado)) {
        throw new ConflictException('Solo se pueden corregir rendiciones enviadas.');
      }

      const repositorio = manager.getRepository(RespuestaInciso);
      for (const entrada of entradas) {
        const { preguntaId, letra, valoracion } = entrada;
        const asignacion = await manager.getRepository(AsignacionPregunta).findOne({
          where: { examen_id: examenId, estudiante_id: estudianteId, pregunta_id: preguntaId },
        });
        if (!asignacion) {
          throw new NotFoundException(`La pregunta ${preguntaId} no fue asignada al estudiante.`);
        }
        const inciso = await manager.getRepository(Inciso).findOne({
          where: { pregunta_id: preguntaId, letra },
        });
        if (!inciso) {
          throw new NotFoundException(`La pregunta ${preguntaId}, inciso ${letra}, no existe.`);
        }
        const maximo = Number(inciso.puntaje_max);
        if (!Number.isFinite(maximo) || maximo <= 0 || valoracion.puntaje > maximo) {
          throw new BadRequestException(
            `La pregunta ${preguntaId}, inciso ${letra}: puntaje entre 0 y ${inciso.puntaje_max}.`,
          );
        }

        const clave = {
          examen_id: examenId,
          estudiante_id: estudianteId,
          pregunta_id: preguntaId,
          letra,
        };
        const respuesta = (await repositorio.findOne({ where: clave })) ??
          repositorio.create({ ...clave, respuesta_texto: null });
        respuesta.estado_correccion =
          respuesta.estado_correccion === 'automatica' || respuesta.estado_correccion === 'revisada'
            ? 'revisada'
            : 'manual';
        respuesta.puntaje_obtenido = formatearPuntaje(valoracion.puntaje);
        if (valoracion.retroalimentacion !== undefined) {
          respuesta.retroalimentacion = valoracion.retroalimentacion;
        }
        await repositorio.save(respuesta);
      }

      const recalculo = await this.recalcularRendicion(manager, rendicion);
      return {
        examen_id: examenId,
        estudiante_id: estudianteId,
        guardadas: entradas.length,
        pendientes_revision: recalculo.pendientes,
        nota_final: recalculo.nota_final,
        estado_rendicion: recalculo.estado,
      };
    });
  }

  private validarEntrada(datos: unknown): EntradaValoracion {
    if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
      throw new BadRequestException('Envía un objeto con puntaje numérico.');
    }
    const entrada = datos as Record<string, unknown>;
    const puntaje = entrada.puntaje;
    if (typeof puntaje !== 'number' || !Number.isFinite(puntaje) || puntaje < 0) {
      throw new BadRequestException('El puntaje debe ser un número finito no negativo.');
    }
    if (Math.abs(puntaje * 100 - Math.round(puntaje * 100)) > 1e-7) {
      throw new BadRequestException('El puntaje permite máximo dos decimales.');
    }
    const comentario = entrada.retroalimentacion;
    if (comentario !== undefined && comentario !== null &&
      (typeof comentario !== 'string' || comentario.length > 2000)) {
      throw new BadRequestException('La retroalimentación debe ser texto de máximo 2000 caracteres.');
    }
    return { puntaje, ...(comentario !== undefined ? { retroalimentacion: comentario as string | null } : {}) };
  }

  private puntajesPorPregunta(
    snapshots: ExamenPoolSnapshotPregunta[],
    manuales: ExamenPregunta[],
  ): Map<number, number> {
    const resultado = new Map<number, number>();
    // Igual que HU-29: la selección manual tiene prioridad sobre el snapshot.
    for (const fila of snapshots) {
      const max = Number(fila.puntaje_maximo_pregunta);
      if (Number.isFinite(max) && max > 0) resultado.set(fila.pregunta_id, max);
    }
    for (const fila of manuales) {
      if (fila.puntaje === null) continue;
      const max = Number(fila.puntaje);
      if (Number.isFinite(max) && max > 0) resultado.set(fila.pregunta_id, max);
    }
    return resultado;
  }

  /** Suma puntajes revisados. Jamás llama al corrector automático. */
  private async recalcularRendicion(manager: EntityManager, rendicion: Rendicion) {
    const { examen_id: examenId, estudiante_id: estudianteId } = rendicion;
    const asignaciones = await manager.getRepository(AsignacionPregunta).find({
      where: { examen_id: examenId, estudiante_id: estudianteId },
    });
    const ids = [...new Set(asignaciones.map((a) => a.pregunta_id))];
    if (!ids.length) throw new ConflictException('La rendición no tiene preguntas asignadas.');
    const [incisos, respuestas, manuales, snapshots] = await Promise.all([
      manager.getRepository(Inciso).find({ where: { pregunta_id: In(ids) } }),
      manager.getRepository(RespuestaInciso).find({
        where: { examen_id: examenId, estudiante_id: estudianteId, pregunta_id: In(ids) },
      }),
      manager.getRepository(ExamenPregunta).find({ where: { examen_id: examenId, pregunta_id: In(ids) } }),
      manager.getRepository(ExamenPoolSnapshotPregunta).find({ where: { examen_id: examenId, pregunta_id: In(ids) } }),
    ]);
    if (!incisos.length) throw new ConflictException('La rendición no tiene incisos para calificar.');
    const respuestasPorClave = new Map(respuestas.map((r) => [`${r.pregunta_id}:${r.letra}`, r]));
    const puntajesMaximosExamen = this.puntajesPorPregunta(snapshots, manuales);
    const maximosBanco = new Map<number, number>();
    const obtenidos = new Map<number, number>();
    let pendientes = 0;

    for (const inciso of incisos) {
      const max = Number(inciso.puntaje_max);
      if (!Number.isFinite(max) || max <= 0) {
        throw new ConflictException('Hay incisos con puntajes máximos inválidos.');
      }
      maximosBanco.set(inciso.pregunta_id, (maximosBanco.get(inciso.pregunta_id) ?? 0) + max);
      const respuesta = respuestasPorClave.get(`${inciso.pregunta_id}:${inciso.letra}`);
      if (this.esPendiente(respuesta, rendicion)) {
        pendientes += 1;
        continue;
      }
      // Fila ausente de rendición antigua ya corregida equivale a 0 automático.
      const obtenido = respuesta ? Number(respuesta.puntaje_obtenido) : 0;
      if (!Number.isFinite(obtenido) || obtenido < 0 || obtenido > max + 1e-7) {
        throw new ConflictException('Se encontró una calificación almacenada inválida.');
      }
      obtenidos.set(inciso.pregunta_id, (obtenidos.get(inciso.pregunta_id) ?? 0) + obtenido);
    }

    // Validar que cada pregunta asignada tiene incisos.
    if (ids.some((id) => !maximosBanco.has(id))) {
      throw new ConflictException('Una pregunta asignada no tiene incisos.');
    }

    if (pendientes > 0) {
      rendicion.estado = 'enviada';
      rendicion.nota_final = null;
    } else {
      let nota = 0;
      for (const id of ids) {
        const obtenido = obtenidos.get(id) ?? 0;
        const maxBanco = maximosBanco.get(id)!;
        const maxEvaluacion = puntajesMaximosExamen.get(id);
        nota += maxEvaluacion !== undefined && maxEvaluacion !== maxBanco
          ? escalarPuntajeProporcional(obtenido, maxEvaluacion, maxBanco)
          : obtenido;
      }
      rendicion.nota_final = formatearPuntaje(nota);
      rendicion.estado = 'corregida';
    }
    await manager.getRepository(Rendicion).save(rendicion);
    return { estado: rendicion.estado, nota_final: rendicion.nota_final, pendientes };
  }

  /** HU-31: confirma, pero NO publica notas ni respuestas correctas. */
  async confirmar(examenId: number, docenteId: number) {
    return this.dataSource.transaction(async (manager) => {
      const examen = await this.verificarExamen(manager, examenId, docenteId, true);
      if (examen.calificaciones_revisadas_en !== null) {
        return {
          examen_id: examenId,
          calificaciones_revisadas_en: examen.calificaciones_revisadas_en,
          ya_confirmadas: true,
        };
      }
      if (examen.resultados_publicados_en !== null) {
        throw new ConflictException('Las respuestas ya fueron publicadas; no se pueden confirmar ahora.');
      }
      if (!examen.disponible_hasta || new Date(examen.disponible_hasta).getTime() > Date.now()) {
        throw new ConflictException('La evaluación debe haber terminado antes de confirmar calificaciones.');
      }

      const resumen = await this.obtenerResumenConManager(manager, examenId, docenteId);
      if (!resumen.total_rendiciones) {
        throw new ConflictException('No hay rendiciones para confirmar.');
      }
      if (resumen.total_pendientes > 0) {
        throw new ConflictException('Todavía hay rendiciones sin corregir o respuestas pendientes de revisión.');
      }
      const ahora = new Date();
      await manager.getRepository(Examen).update(
        { examen_id: examenId, docente_id: docenteId },
        { calificaciones_revisadas_en: ahora },
      );
      return {
        examen_id: examenId,
        calificaciones_revisadas_en: ahora,
        ya_confirmadas: false,
      };
    });
  }
}
