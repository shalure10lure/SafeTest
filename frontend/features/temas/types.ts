
export interface Tema {
    tema_id: number;
    nombre_tema: string;
    materia_id: number;
    materia?: {
        materia_id: number;
        nombre: string;
    };
}

export interface CrearTemaDto {
    nombre_tema: string;
    materia_id: number;
}

export interface ActualizarTemaDto {
    nombre_tema?: string;
    materia_id?: number;
}
