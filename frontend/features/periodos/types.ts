import type { Materia } from '@/features/materias/types';

export interface Periodo {
    semestre_id: number;
    gestion: string;
    nro_pruebas: number;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    activo: boolean;
    materias: Materia[];
}

export interface CreatePeriodoDto {
    gestion: string;
    nro_pruebas: number;
    fecha_inicio: string;
    fecha_fin: string;
    materiaIds?: number[];
}

export interface UpdatePeriodoDto {
    gestion?: string;
    nro_pruebas?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    activo?: boolean;
    materiaIds?: number[];
}