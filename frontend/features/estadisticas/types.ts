
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

export interface ComparacionPeriodo {
    semestre_id: number;
    periodo: string;
    fecha_inicio: string | null;
    total_evaluaciones: number;
    total_rendiciones: number;
    promedio: number | null;
    periodo_anterior: string | null;
    diferencia_anterior: number | null;
}

export interface ComparacionPeriodos {
    materia: MateriaEstadistica;
    total_periodos: number;
    comparaciones: ComparacionPeriodo[];
}

/* ------------------------------------------------------------------ */
/* Panel de estadísticas (GET /estadisticas/panel)                     */
/* ------------------------------------------------------------------ */

export interface PanelMateriaFiltro {
    materia_id: number;
    nombre: string;
    codigo: string;
}

export interface PanelPeriodoFiltro {
    semestre_id: number;
    gestion: string;
    /** Materias asociadas al periodo: sirve para filtrar el selector. */
    materia_ids: number[];
}

export interface PanelParaleloFiltro {
    paralelo_id: number;
    nombre: string;
    materia_id: number;
    semestre_id: number;
}

export interface PanelEvaluacionFiltro {
    examen_id: number;
    titulo: string;
    materia_id: number;
    semestre_id: number;
}

export interface Percentiles {
    min: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    max: number;
}

export interface RangoDistribucion {
    /** Ej.: "70–79". */
    etiqueta: string;
    cantidad: number;
}

/** Un grupo comparable (paralelo, periodo, evaluación o materia). */
export interface PromedioGrupo {
    promedio: number | null;
    /** Cantidad de notas del grupo. */
    n: number;
}

export interface PanelEstadisticas {
    filtros: {
        materias: PanelMateriaFiltro[];
        periodos: PanelPeriodoFiltro[];
        paralelos: PanelParaleloFiltro[];
        evaluaciones: PanelEvaluacionFiltro[];
    };
    /** Filtros realmente aplicados (incluye los elegidos por defecto). */
    seleccion: {
        materia_id: number | null;
        semestre_id: number | null;
        examen_id: number | null;
        paralelo_id: number | null;
    };
    resumen: {
        promedio: number | null;
        nota_maxima: number | null;
        nota_minima: number | null;
        total_estudiantes: number;
        total_rendiciones: number;
    };
    percentiles: Percentiles | null;
    distribucion: RangoDistribucion[];
    por_materia: (PromedioGrupo & { materia_id: number; nombre: string })[];
    por_paralelo: (PromedioGrupo & { paralelo_id: number; nombre: string })[];
    por_periodo: (PromedioGrupo & { semestre_id: number; periodo: string })[];
    por_evaluacion: (PromedioGrupo & { examen_id: number; titulo: string })[];
}

/** Filtros que el docente puede cambiar en pantalla. */
export interface FiltrosPanel {
    materia_id?: number;
    semestre_id?: number;
    examen_id?: number;
    paralelo_id?: number;
}
