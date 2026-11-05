import type {
    DificultadPregunta,
    TipoRespuestaPregunta,
} from '../preguntas/types';

/** Estados persistidos por el backend en `ia_generacion.estado`. */
export type EstadoGeneracionIa =
    | 'pendiente'
    | 'procesando'
    | 'completada'
    | 'error';

export type EstadoPropuestaIa = 'pendiente' | 'aceptada' | 'descartada';

export interface OpcionPropuestaIa {
    texto_opcion: string;
    es_correcta: boolean;
}

interface ContenidoPropuestaBase {
    enunciado: string;
    dificultad: DificultadPregunta;
    puntaje_max: number;
    explicacion?: string;
}

export type ContenidoPropuestaIa<Tipo extends TipoRespuestaPregunta> =
    Tipo extends
        | 'opcion_unica'
        | 'opcion_multiple'
        | 'verdadero_falso'
        ? ContenidoPropuestaBase & { opciones: OpcionPropuestaIa[] }
        : Tipo extends 'numerica'
          ? ContenidoPropuestaBase & {
                valor_correcto: number;
                tolerancia?: number;
            }
          : ContenidoPropuestaBase & { solucion_referencia?: string };

interface PropuestaBase<Tipo extends TipoRespuestaPregunta> {
    propuesta_id: number;
    tipo_respuesta: Tipo;
    contenido: ContenidoPropuestaIa<Tipo>;
    estado: EstadoPropuestaIa;
    pregunta_id: number | null;
}

/** Unión discriminada por el tipo heredado de la generación. */
export type PropuestaGeneracionIa = {
    [Tipo in TipoRespuestaPregunta]: PropuestaBase<Tipo>;
}[TipoRespuestaPregunta];

/**
 * DTO exacto de `POST /ia/generaciones`.
 *
 * No incluye docente, estado ni fechas: el backend los deriva del JWT y del
 * ciclo de vida del worker.
 */
export interface CrearGeneracionIaDto {
    materia_id: number;
    tema_id: number;
    tipo_respuesta: TipoRespuestaPregunta;
    cantidad: number;
    dificultad: DificultadPregunta;
    /** Se requiere al menos un material autorizado y con texto extraído. */
    material_ids: number[];
}

/** Respuesta 202 de `POST /ia/generaciones`. */
export interface CreacionGeneracionIa {
    generacion_id: number;
    estado: 'pendiente';
}

export interface ActualizarPropuestaIaDto {
    enunciado: string;
    dificultad: DificultadPregunta;
    puntaje_max: number;
    opciones?: OpcionPropuestaIa[];
    valor_correcto?: number;
    tolerancia?: number;
    solucion_referencia?: string;
    explicacion?: string;
}

export interface ResultadoPropuestaIa {
    propuesta_id: number;
    contenido: ContenidoPropuestaIa<TipoRespuestaPregunta>;
    estado: EstadoPropuestaIa;
    pregunta_id: number | null;
}

export interface ResultadoInsercionPropuestaIa {
    propuesta_id: number;
    pregunta_id: number;
    estado: 'aceptada';
    insertada: boolean;
    ya_estaba_insertada: boolean;
}

/** Respuesta de `GET /ia/generaciones/:id`. */
export interface GeneracionIaDetalle {
    generacion_id: number;
    estado: EstadoGeneracionIa;
    tipo_respuesta: TipoRespuestaPregunta | null;
    dificultad: DificultadPregunta | null;
    cantidad: number | null;
    cantidad_generada: number | null;
    materia_id: number;
    materia: string | null;
    tema_id: number | null;
    tema: string | null;
    proveedor: string | null;
    modelo: string | null;
    tokens: {
        entrada: number | null;
        salida: number | null;
        total: number | null;
    };
    error_mensaje: string | null;
    iniciada_en: string | null;
    finalizada_en: string | null;
    fecha: string;
    materiales: { material_id: number; titulo: string }[];
    propuestas: PropuestaGeneracionIa[];
}
