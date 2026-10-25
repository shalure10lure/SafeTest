export type EstadoEvaluacion = 'disponible' | 'borrador' | 'pendiente';

export type TipoPregunta =
    | 'seleccion_multiple'
    | 'verdadero_falso'
    | 'respuesta_abierta'
    | 'respuesta_numerica';

export interface EvaluacionResumen {
    id: number;
    titulo: string;
    /** Fecha ISO (YYYY-MM-DD). */
    fecha: string;
    estudiantes: number;
    estado: EstadoEvaluacion;
}

export interface ExamenBorrador {
    id: number;
    titulo: string;
    /** Paso actual del asistente: 1 Información, 2 Preguntas, 3 Config., 4 Publicar. */
    pasoActual: 1 | 2 | 3 | 4;
    descripcionPaso: string;
}

export interface ResumenDocente {
    preguntasEnBanco: number;
    examenesActivos: number;
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