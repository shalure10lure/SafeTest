/* ------------------------------------------------------------------ */
/* Estado del asistente "Configurar periodo"                           */
/* ------------------------------------------------------------------ */

/** Datos del paso 1. Los números van como texto porque vienen de un <input>. */
export interface DatosPeriodo {
    gestion: string;
    nroPruebas: string;
    fechaInicio: string;
    fechaFin: string;
}

/** Una fila de "materia nueva" del paso 2. */
export interface FilaMateriaNueva {
    /** Identificador local (no se envía al servidor) para React y para ubicar errores. */
    clave: string;
    nombre: string;
    codigo: string;
}

export interface EstadoAsistente {
    periodo: DatosPeriodo;
    /** Materias que ya existen y se asocian al periodo. */
    materiaIds: number[];
    materiasNuevas: FilaMateriaNueva[];
    /**
     * Paralelos por materia. La clave es "e-<id>" para una materia existente
     * o "n-<clave>" para una materia nueva.
     */
    paralelos: Record<string, string[]>;
}

/** Errores de un campo por fila, para pintarlos en pantalla. */
export type ErroresFilas = Record<string, { nombre?: string; codigo?: string }>;

/* ------------------------------------------------------------------ */
/* Lo que se envía al servidor (POST /configuracion-academica/periodo)  */
/* ------------------------------------------------------------------ */

export interface ConfigurarPeriodoPayload {
    periodo: {
        gestion: string;
        nro_pruebas: number;
        fecha_inicio: string;
        fecha_fin: string;
    };
    materia_ids: number[];
    materias_nuevas: { nombre: string; codigo: string }[];
    paralelos: {
        materia_id?: number;
        materia_nueva_indice?: number;
        nombres: string[];
    }[];
}

export interface ResultadoConfiguracion {
    periodo: { semestre_id: number; gestion: string };
    materias_creadas: number;
    paralelos_creados: number;
}
