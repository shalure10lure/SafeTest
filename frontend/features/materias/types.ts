export interface Materia {
    materia_id: number;
    nombre: string;
    codigo: string;
    descripcion: string | null;
    activo: boolean;
}

export interface CreateMateriaDto {
    nombre: string;
    codigo: string;
    descripcion?: string;
}

export interface UpdateMateriaDto {
    nombre?: string;
    codigo?: string;
    descripcion?: string;
    activo?: boolean;
}