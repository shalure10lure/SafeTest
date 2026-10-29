
export type DificultadPregunta = 'facil' | 'media' | 'dificil';

export interface TemaPregunta {
    tema_id: number;
    nombre_tema: string;
    materia?: {
        materia_id: number;
        nombre: string;
    };
}

export interface Pregunta {
    pregunta_id: number;
    enunciado: string;
    tema_id: number;
    dificultad: DificultadPregunta | null;
    origen: string;
    activo: boolean;
    tema?: TemaPregunta;
}

export interface CrearPreguntaDto {
    enunciado: string;
    tema_id: number;
    dificultad?: DificultadPregunta;
}

export interface ActualizarPreguntaDto {
    enunciado?: string;
    tema_id?: number;
    dificultad?: DificultadPregunta;
}
