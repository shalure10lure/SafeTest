/**
 * 'finalizada' no se muestra en el inicio, pero el backend la calcula
 * para poder excluirla de "Exámenes activos".
 */
export type EstadoEvaluacion =
    | 'disponible'
    | 'borrador'
    | 'pendiente'
    | 'finalizada';

export type TipoPregunta =
    | 'seleccion_multiple'
    | 'verdadero_falso'
    | 'respuesta_abierta'
    | 'respuesta_numerica'
    | 'varios_incisos';

export interface EvaluacionResumen {
    id: number;
    titulo: string;
    /** Fecha ISO (YYYY-MM-DD). `null` si es un borrador sin fecha. */
    fecha: string | null;
    estudiantes: number;
    estado: EstadoEvaluacion;
}

export interface ExamenBorrador {
    id: number;
    titulo: string;
    /** Paso del asistente: 1 Información, 2 Preguntas, 3 Config., 4 Asignación, 5 Resumen. */
    pasoActual: 1 | 2 | 3 | 4 | 5;
    descripcionPaso: string;
}

export interface ResumenDocente {
    preguntasEnBanco: number;
    examenesActivos: number;
    /** Entregas de estudiantes que todavía no se corrigen. */
    porCorregir: number;
    estudiantesTotales: number;
    /** Evaluaciones que tienen entregas pendientes de corregir. */
    evaluacionesPorCorregir: number;
    notificaciones: number;
    evaluaciones: EvaluacionResumen[];
    preguntasPorTipo: Record<TipoPregunta, number>;
    /** `null` si no hay ningún examen en borrador. */
    examenBorrador: ExamenBorrador | null;
}

/* ------------------------------------------------------------------ */
/* Gestión académica (pantalla Resumen)                                */
/* ------------------------------------------------------------------ */

export interface ParaleloActivo {
    paraleloId: number;
    nombreParalelo: string;
    materia: string;
    periodo: string;
    estudiantes: number;
}

export interface ResumenAcademico {
    materias: { total: number; activas: number };
    periodos: { total: number; enCurso: number };
    paralelos: { total: number };
    estudiantes: { total: number; invitacionesPendientes: number };
    paralelosActivos: ParaleloActivo[];
}
