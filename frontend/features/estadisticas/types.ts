
export interface MateriaEstadistica {
    materia_id: number;
    nombre: string;
    codigo: string;
}

export interface EstadisticaEvaluacion {
    examen_id: number;
    titulo: string;
    periodo: string;
    total_rendiciones: number;
    promedio: number | null;
}

export interface EstadisticaPeriodo {
    semestre_id: number;
    periodo: string;
    total_evaluaciones: number;
    total_rendiciones: number;
    promedio: number | null;
}

export interface EstadisticaParalelo {
    paralelo_id: number;
    nombre: string;
    total_estudiantes: number;
    total_rendiciones: number;
    promedio: number | null;
}

export interface EstadisticasMateria {
    materia: MateriaEstadistica;
    total_estudiantes: number;
    total_evaluaciones: number;
    promedio: number | null;
    nota_maxima: number | null;
    nota_minima: number | null;

    por_evaluacion: EstadisticaEvaluacion[];
    por_periodo: EstadisticaPeriodo[];
    por_paralelo: EstadisticaParalelo[];
}
