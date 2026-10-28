/** El backend solo guarda estos dos. "Completada" y "Pendiente" se derivarán después. */
export type EstadoExamen = 'borrador' | 'publicado';

export type ModoSeleccion = 'manual' | 'aleatorio';

export interface Evaluacion {
    examen_id: number;
    titulo: string | null;
    instrucciones: string | null;
    estado: EstadoExamen;
    /** Fecha de disponibilidad (ISO). `null` mientras sea borrador. */
    fecha: string | null;
    modo_seleccion: ModoSeleccion;

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

export interface CriterioTema {
    tema_id: number;
    cantidad: number;
}

/** Detalle de una evaluación: incluye la selección de preguntas guardada. */
export interface EvaluacionDetalle extends Evaluacion {
    /** Preguntas elegidas en modo manual, en orden. */
    pregunta_ids: number[];
    /** Criterios guardados en modo aleatorio. */
    criterios: CriterioTema[];
}

export interface PreguntaBanco {
    pregunta_id: number;
    enunciado: string;
    dificultad: string | null;
    /** Valor crudo del backend (ej. "opcion_unica"); ver `tipos-pregunta.ts`. */
    tipo_respuesta: string | null;
    puntos: number;
    /** En cuántas otras evaluaciones ya se usó. */
    usada_en: number;
    tema: {
        tema_id: number;
        nombre_tema: string;
    };
    materia: {
        materia_id: number;
        nombre: string;
    };
}

export interface TemaBanco {
    tema_id: number;
    nombre_tema: string;
    /** Preguntas activas disponibles en ese tema. */
    disponibles: number;
}

export interface BancoEvaluacion {
    materia_id: number;
    /** Total de preguntas del docente, de todas sus materias. */
    total_banco: number;
    preguntas: PreguntaBanco[];
    temas: TemaBanco[];
}

export type GuardarSeleccionDto =
    | { modo_seleccion: 'manual'; pregunta_ids: number[] }
    | { modo_seleccion: 'aleatorio'; criterios: CriterioTema[] };

export interface SeleccionGuardada {
    modo_seleccion: ModoSeleccion;
    pregunta_ids: number[];
    criterios: CriterioTema[];
    total_preguntas: number;
}

export interface UpdateEvaluacionDto {
    titulo?: string;
    materia_id?: number;
    semestre_id?: number;
    paralelo_id?: number;
    instrucciones?: string;
}

export interface EvaluacionActualizada extends EvaluacionDetalle {
    /** `true` si al cambiar de materia se borraron los criterios por tema. */
    criterios_reiniciados: boolean;
}