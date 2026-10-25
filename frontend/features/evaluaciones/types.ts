/** El backend solo guarda estos dos. "Completada" y "Pendiente" se derivarán después. */
export type EstadoExamen = 'borrador' | 'publicado';

export interface Evaluacion {
    examen_id: number;
    titulo: string | null;
    instrucciones: string | null;
    estado: EstadoExamen;
    /** Fecha de disponibilidad (ISO). `null` mientras sea borrador. */
    fecha: string | null;
    modo_seleccion: 'manual' | 'aleatorio';

    materia: {
        materia_id: number;
        nombre: string;
    } | null;

    semestre: {
        semestre_id: number;
        gestion: string;
    };

    paralelos: {
        paralelo_id: number;
        nombre_paralelo: string;
    }[];

    total_preguntas: number;
    total_inscritos: number;
}

export interface CreateEvaluacionDto {
    titulo: string;
    materia_id: number;
    semestre_id: number;
    paralelo_id: number;
    instrucciones?: string;
}

/** Lo que devuelve `POST /examenes` (la evaluación recién creada). */
export interface EvaluacionCreada {
    examen_id: number;
    titulo: string | null;
    estado: EstadoExamen;
}