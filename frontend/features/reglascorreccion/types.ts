export type TipoRespuestaRegla =
    | 'opcion_unica'
    | 'opcion_multiple'
    | 'verdadero_falso'
    | 'numerica'
    | 'desarrollo';

export type EstrategiaRegla = 'automatica' | 'manual_rubrica';

/**
 * Configuración de corrección que acepta el backend de T2.
 *
 * No contiene respuestas correctas, tolerancias ni rúbricas: esos datos viven
 * en cada pregunta.
 */
export interface ParametrosRegla {
    estrategia?: EstrategiaRegla;
    puntaje_parcial?: boolean;
    penalizar_incorrectas?: boolean;
    redondeo_decimales?: number;
}

/** Respuesta pública de /reglas-correccion. Nunca incluye docente_id. */
export interface ReglaCorreccion {
    regla_id: number;
    tipo_respuesta: TipoRespuestaRegla;
    parametros: ParametrosRegla;
    activo: boolean;
    creado_en: string;
    actualizado_en: string;
}

/** Cuerpo de POST /reglas-correccion. */
export interface CrearReglaCorreccionDto {
    tipo_respuesta: TipoRespuestaRegla;
    parametros: ParametrosRegla;
    activo: boolean;
}

/** Cuerpo de PATCH /reglas-correccion/:id. */
export interface ActualizarReglaCorreccionDto {
    parametros: ParametrosRegla;
    activo: boolean;
}

/** Cambios locales de una tarjeta antes de guardarse. */
export interface BorradorRegla {
    parametros: ParametrosRegla;
    activo: boolean;
}

/** Cambio listo para enviarse al backend. */
export interface CambioRegla {
    tipo_respuesta: TipoRespuestaRegla;
    regla_id?: number;
    parametros: ParametrosRegla;
    activo: boolean;
}

export interface FalloGuardado {
    tipo: TipoRespuestaRegla;
    mensaje: string;
    estado?: number;
}
