export interface Tema {
    tema_id: number;
    nombre_tema: string;
    materia_id: number;
    /** Preguntas activas del tema en el banco. */
    total_preguntas: number;
}