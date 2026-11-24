import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import {
  calcularPasoBorrador,
  contarTiposPregunta,
  estadoEvaluacion,
  fechaBolivia,
  type EstadoEvaluacion,
  type PasoBorrador,
  type TiposPreguntaContados,
} from './panel-docente.utils';

/* ------------------------------------------------------------------ */
/* Forma de las respuestas (las usa features/docente del frontend)     */
/* ------------------------------------------------------------------ */

export interface InicioDocente {
  preguntasEnBanco: number;
  examenesActivos: number;
  porCorregir: number;
  estudiantesTotales: number;
  evaluacionesPorCorregir: number;
  notificaciones: number;
  evaluaciones: {
    id: number;
    titulo: string;
    /** "YYYY-MM-DD" o null si es un borrador sin fecha. */
    fecha: string | null;
    estudiantes: number;
    estado: EstadoEvaluacion;
  }[];
  preguntasPorTipo: TiposPreguntaContados;
  examenBorrador: {
    id: number;
    titulo: string;
    pasoActual: PasoBorrador;
    descripcionPaso: string;
  } | null;
}

export interface ResumenAcademico {
  materias: { total: number; activas: number };
  periodos: { total: number; enCurso: number };
  paralelos: { total: number };
  estudiantes: { total: number; invitacionesPendientes: number };
  paralelosActivos: {
    paraleloId: number;
    nombreParalelo: string;
    materia: string;
    periodo: string;
    estudiantes: number;
  }[];
}

/** Una evaluación del docente tal como la devuelve la consulta SQL. */
interface ExamenFila {
  examen_id: number;
  titulo: string | null;
  estado: string;
  fecha: string | null;
  disponible_desde: Date | null;
  disponible_hasta: Date | null;
  duracion_min: number | null;
  puntaje_total: string | null;
  estudiantes: number;
  n_preguntas: number;
  n_criterios: number;
  n_paralelos: number;
  n_estudiantes_seleccionados: number;
}

/** Máximo de evaluaciones que se muestran en "Mis evaluaciones" del inicio. */
const MAX_EVALUACIONES_INICIO = 5;

/** Orden de importancia para mostrar las evaluaciones en el inicio. */
const PRIORIDAD_ESTADO: Record<EstadoEvaluacion, number> = {
  disponible: 0,
  pendiente: 1,
  borrador: 2,
  finalizada: 3,
};

@Injectable()
export class PanelDocenteService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Datos reales de la pantalla de Inicio del docente.
   * Cada consulta es independiente, así que se lanzan todas a la vez.
   */
  async obtenerInicio(docenteId: number): Promise<InicioDocente> {
    const [
      tiposPregunta,
      examenes,
      pendientesCorreccion,
      estudiantes,
      invitacionesConError,
    ] = await Promise.all([
      this.consultarTiposPregunta(docenteId),
      this.consultarExamenes(docenteId),
      this.consultarPendientesCorreccion(docenteId),
      this.contarEstudiantes(docenteId),
      this.contarInvitacionesConError(docenteId),
    ]);

    const ahora = new Date();

    // Cada examen con su estado calculado (borrador, pendiente, etc.).
    const conEstado = examenes.map((examen) => ({
      examen,
      estado: estadoEvaluacion(examen, ahora),
    }));

    // "Exámenes activos" = publicados cuya ventana todavía no terminó.
    const examenesActivos = conEstado.filter(
      ({ estado }) => estado === 'disponible' || estado === 'pendiente',
    ).length;

    const evaluaciones = conEstado
      .filter(({ estado }) => estado !== 'finalizada')
      .sort(
        (a, b) =>
          PRIORIDAD_ESTADO[a.estado] - PRIORIDAD_ESTADO[b.estado] ||
          b.examen.examen_id - a.examen.examen_id,
      )
      .slice(0, MAX_EVALUACIONES_INICIO)
      .map(({ examen, estado }) => ({
        id: examen.examen_id,
        titulo: examen.titulo?.trim() || 'Evaluación sin título',
        fecha: fechaBolivia(examen.disponible_desde ?? examen.fecha),
        estudiantes: examen.estudiantes,
        estado,
      }));

    // Borrador más reciente (el examen con id más alto sin publicar).
    const borrador = examenes.find((examen) => examen.estado !== 'publicado');
    const paso = borrador ? calcularPasoBorrador(borrador) : null;

    return {
      preguntasEnBanco: tiposPregunta.length,
      examenesActivos,
      porCorregir: pendientesCorreccion.rendiciones,
      estudiantesTotales: estudiantes,
      evaluacionesPorCorregir: pendientesCorreccion.evaluaciones,
      // Campana de notificaciones: evaluaciones con entregas por corregir
      // más invitaciones cuyo envío falló (cosas que requieren tu atención).
      notificaciones:
        pendientesCorreccion.evaluaciones + invitacionesConError,
      evaluaciones,
      preguntasPorTipo: contarTiposPregunta(tiposPregunta),
      examenBorrador:
        borrador && paso
          ? {
              id: borrador.examen_id,
              titulo: borrador.titulo?.trim() || 'Evaluación sin título',
              pasoActual: paso.paso,
              descripcionPaso: paso.descripcion,
            }
          : null,
    };
  }

  /** Datos reales de la pantalla "Gestión académica" (Resumen). */
  async obtenerResumenAcademico(docenteId: number): Promise<ResumenAcademico> {
    const [materias, periodos, paralelos, estudiantes, invitaciones, activos] =
      await Promise.all([
        this.dataSource.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE activo)::int AS activas
             FROM materia
            WHERE docente_id = $1`,
          [docenteId],
        ),
        // "En curso" = periodo activo cuyas fechas incluyen el día de hoy.
        this.dataSource.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (
                    WHERE activo
                      AND fecha_inicio <= CURRENT_DATE
                      AND fecha_fin >= CURRENT_DATE
                  )::int AS en_curso
             FROM semestre
            WHERE docente_id = $1`,
          [docenteId],
        ),
        this.dataSource.query(
          `SELECT COUNT(*)::int AS total FROM paralelo WHERE docente_id = $1`,
          [docenteId],
        ),
        this.contarEstudiantes(docenteId),
        this.dataSource.query(
          `SELECT COUNT(*)::int AS total
             FROM invitacion i
             JOIN paralelo p ON p.paralelo_id = i.paralelo_id
            WHERE p.docente_id = $1
              AND i.estado = 'pendiente'`,
          [docenteId],
        ),
        // Paralelos de periodos activos, con su cantidad de estudiantes.
        this.dataSource.query(
          `SELECT p.paralelo_id,
                  p.nombre_paralelo,
                  m.nombre AS materia,
                  s.gestion AS periodo,
                  (SELECT COUNT(*)::int
                     FROM inscripcion i
                    WHERE i.paralelo_id = p.paralelo_id) AS estudiantes
             FROM paralelo p
             JOIN materia m ON m.materia_id = p.materia_id
             JOIN semestre s ON s.semestre_id = p.semestre_id
            WHERE p.docente_id = $1
              AND s.activo = true
            ORDER BY s.fecha_inicio DESC NULLS LAST,
                     m.nombre ASC,
                     p.nombre_paralelo ASC`,
          [docenteId],
        ),
      ]);

    return {
      materias: {
        total: Number(materias[0]?.total ?? 0),
        activas: Number(materias[0]?.activas ?? 0),
      },
      periodos: {
        total: Number(periodos[0]?.total ?? 0),
        enCurso: Number(periodos[0]?.en_curso ?? 0),
      },
      paralelos: { total: Number(paralelos[0]?.total ?? 0) },
      estudiantes: {
        total: estudiantes,
        invitacionesPendientes: Number(invitaciones[0]?.total ?? 0),
      },
      paralelosActivos: activos.map((fila: Record<string, unknown>) => ({
        paraleloId: Number(fila.paralelo_id),
        nombreParalelo: String(fila.nombre_paralelo),
        materia: String(fila.materia),
        periodo: String(fila.periodo),
        estudiantes: Number(fila.estudiantes),
      })),
    };
  }

  /* ---------------------------------------------------------------- */
  /* Consultas privadas                                                */
  /* ---------------------------------------------------------------- */

  /**
   * Devuelve un tipo por cada pregunta ACTIVA del banco del docente.
   * Si todos los incisos de la pregunta tienen el mismo tipo, ese es su
   * tipo; si mezclan tipos, es 'mixto' (igual que el listado del banco).
   * La cantidad de filas = preguntas en el banco.
   */
  private async consultarTiposPregunta(docenteId: number): Promise<string[]> {
    const filas = await this.dataSource.query(
      `SELECT CASE WHEN COUNT(DISTINCT i.tipo_respuesta) = 1
                   THEN MIN(i.tipo_respuesta)
                   ELSE 'mixto'
              END AS tipo
         FROM pregunta p
         JOIN tema t ON t.tema_id = p.tema_id
         JOIN materia m ON m.materia_id = t.materia_id
         JOIN inciso i ON i.pregunta_id = p.pregunta_id
        WHERE m.docente_id = $1
          AND m.activo = true
          AND p.activo = true
        GROUP BY p.pregunta_id`,
      [docenteId],
    );

    return filas.map((fila: { tipo: string }) => fila.tipo);
  }

  /** Todas las evaluaciones del docente (la más reciente primero). */
  private async consultarExamenes(docenteId: number): Promise<ExamenFila[]> {
    const filas = await this.dataSource.query(
      `SELECT e.examen_id,
              e.titulo,
              e.estado,
              e.fecha::text AS fecha, -- texto 'YYYY-MM-DD' (sin desfase de zona)
              e.disponible_desde,
              e.disponible_hasta,
              e.duracion_min,
              e.puntaje_total,
              -- Estudiantes que la rinden: depende de cómo se asignó.
              CASE WHEN e.modo_asignacion = 'estudiantes'
                   THEN (SELECT COUNT(*)::int
                           FROM examen_estudiante ee
                          WHERE ee.examen_id = e.examen_id)
                   ELSE (SELECT COUNT(DISTINCT i.estudiante_id)::int
                           FROM inscripcion i
                           JOIN paralelo_examen pe
                             ON pe.paralelo_id = i.paralelo_id
                          WHERE pe.examen_id = e.examen_id)
              END AS estudiantes,
              -- Datos para saber en qué paso del asistente quedó un borrador.
              (SELECT COUNT(*)::int FROM examen_pregunta ep
                WHERE ep.examen_id = e.examen_id) AS n_preguntas,
              (SELECT COUNT(*)::int FROM examen_tema et
                WHERE et.examen_id = e.examen_id) AS n_criterios,
              (SELECT COUNT(*)::int FROM paralelo_examen pe2
                WHERE pe2.examen_id = e.examen_id) AS n_paralelos,
              (SELECT COUNT(*)::int FROM examen_estudiante ee2
                WHERE ee2.examen_id = e.examen_id)
                AS n_estudiantes_seleccionados
         FROM examen e
        WHERE e.docente_id = $1
        ORDER BY e.examen_id DESC`,
      [docenteId],
    );

    return filas.map((fila: Record<string, any>): ExamenFila => ({
      examen_id: Number(fila.examen_id),
      titulo: (fila.titulo ?? null) as string | null,
      estado: String(fila.estado),
      fecha: (fila.fecha ?? null) as string | null,
      disponible_desde: (fila.disponible_desde ?? null) as Date | null,
      disponible_hasta: (fila.disponible_hasta ?? null) as Date | null,
      duracion_min:
        fila.duracion_min === null ? null : Number(fila.duracion_min),
      puntaje_total: (fila.puntaje_total ?? null) as string | null,
      estudiantes: Number(fila.estudiantes ?? 0),
      n_preguntas: Number(fila.n_preguntas),
      n_criterios: Number(fila.n_criterios),
      n_paralelos: Number(fila.n_paralelos),
      n_estudiantes_seleccionados: Number(fila.n_estudiantes_seleccionados),
    }));
  }

  /** Rendiciones ya enviadas por los estudiantes que aún no se corrigen. */
  private async consultarPendientesCorreccion(docenteId: number) {
    const filas = await this.dataSource.query(
      `SELECT COUNT(*)::int AS rendiciones,
              COUNT(DISTINCT r.examen_id)::int AS evaluaciones
         FROM rendicion r
         JOIN examen e ON e.examen_id = r.examen_id
        WHERE e.docente_id = $1
          AND r.estado = 'enviada'`,
      [docenteId],
    );

    return {
      rendiciones: Number(filas[0]?.rendiciones ?? 0),
      evaluaciones: Number(filas[0]?.evaluaciones ?? 0),
    };
  }

  /** Estudiantes distintos inscritos en algún paralelo del docente. */
  private async contarEstudiantes(docenteId: number): Promise<number> {
    const filas = await this.dataSource.query(
      `SELECT COUNT(DISTINCT i.estudiante_id)::int AS total
         FROM inscripcion i
         JOIN paralelo p ON p.paralelo_id = i.paralelo_id
        WHERE p.docente_id = $1`,
      [docenteId],
    );

    return Number(filas[0]?.total ?? 0);
  }

  /** Invitaciones a paralelos cuyo envío falló. */
  private async contarInvitacionesConError(
    docenteId: number,
  ): Promise<number> {
    const filas = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total
         FROM invitacion i
         JOIN paralelo p ON p.paralelo_id = i.paralelo_id
        WHERE p.docente_id = $1
          AND i.estado = 'error'`,
      [docenteId],
    );

    return Number(filas[0]?.total ?? 0);
  }
}
