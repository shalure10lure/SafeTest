export type DificultadPregunta = 'facil' | 'media' | 'dificil';

/**
 * Valores de `inciso.tipo_respuesta`. Coinciden con los que ya usa
 * `features/evaluaciones/tipos-pregunta.ts`.
 */
export type TipoRespuestaPregunta =
    | 'opcion_unica'
    | 'opcion_multiple'
    | 'verdadero_falso'
    | 'desarrollo'
    | 'numerica';

/** Tipos heredados que también puede devolver el banco. */
export type TipoFiltroPregunta =
    | TipoRespuestaPregunta
    | 'texto_corto'
    | 'mixto';

export interface MateriaPregunta {
    materia_id: number;
    nombre: string;
}

export interface TemaPregunta {
    tema_id: number;
    nombre_tema: string;
    materia?: MateriaPregunta;
}

export interface Pregunta {
    pregunta_id: number;
    enunciado: string;
    tema_id: number;
    dificultad: DificultadPregunta | null;
    origen: string;
    activo: boolean;
    /** ISO 8601. */
    creado_en: string;
    /** Tipo calculado a partir de los incisos. */
    tipo_respuesta: TipoFiltroPregunta | null;
    /** Puntaje de la pregunta: suma de los puntajes máximos de sus incisos. */
    puntos: number;
    tema?: TemaPregunta;
    materia?: MateriaPregunta;
}

/** Filtros de `GET /preguntas`. */
export interface FiltrosPreguntas {
    materia_id?: number;
    tema_id?: number;
    tipo?: TipoFiltroPregunta;
    buscar?: string;
}

export interface OpcionPreguntaDto {
    texto_opcion: string;
    es_correcta: boolean;
}

/** Opción tal como se maneja en el formulario (A, B, C, D). */
export interface OpcionFormulario {
    id: string;
    texto: string;
    correcta: boolean;
}

/** Errores del bloque de configuración de respuesta. */
export interface ErroresConfiguracion {
    opciones?: string;
    booleana?: string;
    valorCorrecto?: string;
    tolerancia?: string;
}

export interface CrearPreguntaDto {
    enunciado: string;
    materia_id: number;
    tema_id: number;
    tipo_respuesta: TipoRespuestaPregunta;
    /**
     * Puntaje máximo del inciso que crea este formulario. `Pregunta` no
     * almacena puntaje propio: el total de la pregunta se deriva de sus incisos.
     */
    puntaje_max: number;
    dificultad?: DificultadPregunta;
    opciones?: OpcionPreguntaDto[];
    valor_correcto?: number;
    tolerancia?: number;
    solucion_referencia?: string;
}

export interface ActualizarPreguntaDto {
    enunciado?: string;
    materia_id?: number;
    tema_id?: number;
    dificultad?: DificultadPregunta;
    // Configuración de respuesta: si se envía el tipo, se reemplaza completa.
    tipo_respuesta?: TipoRespuestaPregunta;
    /** Puntaje máximo del inciso configurado por este formulario. */
    puntaje_max?: number;
    opciones?: OpcionPreguntaDto[];
    valor_correcto?: number;
    tolerancia?: number;
    solucion_referencia?: string;
}

/** Respuesta de `POST /preguntas`. */
export interface PreguntaCreada {
    pregunta_id: number;
    enunciado: string;
    materia_id: number;
    tema_id: number;
    tipo_respuesta: TipoRespuestaPregunta;
    /** Puntaje máximo del inciso que el formulario creó junto a la pregunta. */
    puntaje_max: number;
    opciones: {
        nro_opcion: number;
        texto_opcion: string;
        es_correcta: boolean;
    }[];
    valor_correcto: number | null;
    tolerancia: number | null;
    solucion_referencia: string | null;
}

/** Respuesta de `GET /preguntas/:id`: la pregunta con su configuración. */
export interface PreguntaDetalle {
    pregunta_id: number;
    enunciado: string;
    tema_id: number;
    dificultad: DificultadPregunta | null;
    origen: string;
    activo: boolean;
    /** ISO 8601. */
    creado_en: string;
    /** Puede ser null o un tipo heredado en preguntas antiguas. */
    tipo_respuesta: TipoFiltroPregunta | null;
    /**
     * Puntaje máximo del inciso `a`. `Pregunta` no tiene puntaje propio; el
     * total de la pregunta se obtiene sumando sus incisos.
     */
    puntaje_max: number | null;
    opciones: {
        nro_opcion: number;
        texto_opcion: string;
        es_correcta: boolean;
    }[];
    valor_correcto: number | null;
    tolerancia: number | null;
    solucion_referencia: string | null;
    tema?: TemaPregunta;
    materia?: MateriaPregunta;
}


/** Contenido especializado que puede llevar una pregunta (HU-12). */
export type TipoRecurso = 'imagen' | 'tabla' | 'formula';

export interface ContenidoTabla {
    encabezado: boolean;
    filas: string[][];
}

/** Recurso de una pregunta, tal como lo devuelve `GET /preguntas/:id/recursos`. */
export interface RecursoPregunta {
    /** Identificador del recurso dentro de la pregunta. */
    recurso: string;
    tipo: TipoRecurso;
    /** Fórmula: LaTeX. Tabla: objeto. Imagen: null (se descarga aparte). */
    contenido: ContenidoTabla | string | null;
    mime_type: string | null;
    nombre_original: string | null;
    /** ISO 8601. */
    creado_en: string;
}

/** Tabla o fórmula que se agrega a una pregunta; las imágenes van como archivo. */
export type CrearRecursoEscritoDto =
    | { tipo: 'formula'; contenido: string }
    | { tipo: 'tabla'; contenido: ContenidoTabla };