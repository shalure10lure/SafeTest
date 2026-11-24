import type {
  CriterioCorreccionIa,
  ErrorCorreccionRespuesta,
} from '../ia/ai.types';
import type { TipoRespuesta } from '../pregunta/entity/dtos/create-pregunta.dto';

export const ALMACEN_CORRECCION_IA = Symbol('ALMACEN_CORRECCION_IA');

export type FuenteCriterioCorreccionIa =
  | 'solucion_inciso'
  | 'rubrica'
  | 'solucion_referencia'
  | 'predeterminado';

/**
 * Datos que necesita el worker para corregir una propuesta reclamada.
 *
 * Deliberadamente no incluye ids de examen, pregunta, docente ni estudiante:
 * el proveedor recibe únicamente contenido académico. El `propuesta_id` se usa
 * solo para persistir el resultado y nunca forma parte de la solicitud al
 * proveedor.
 */
export interface ContextoCorreccionIa {
  propuesta_id: number;
  examen_cerrado: boolean;
  enunciado: string;
  tipo_respuesta: TipoRespuesta;
  respuesta_estudiante: string;
  criterio: CriterioCorreccionIa;
  criterio_fuente: FuenteCriterioCorreccionIa;
  puntaje_max: number;
}

/** Resultado validado y normalizado que se persiste en `correccion_ia`. */
export interface ResultadoCorreccionAlmacenado {
  puntaje_sugerido: number;
  valoracion: string;
  explicacion: string;
  errores: ErrorCorreccionRespuesta[];
  confianza: number | null;
  proveedor: string;
  modelo: string | null;
  criterio_fuente: FuenteCriterioCorreccionIa;
  criterio_hash: string;
}

export type ResultadoPersistenciaCorreccionIa =
  | 'generada'
  | 'examen_publicado'
  | 'omitida';

export interface ResultadoRecuperacionCorreccionIa {
  reencoladas: number;
  agotadas: number;
  cerradas: number;
}

/**
 * Persistencia que necesita el worker. La implementa
 * `CorreccionIaWorkerStore`; las pruebas usan un doble en memoria.
 */
export interface AlmacenCorreccionIa {
  /** Reclama atómicamente la siguiente propuesta pendiente de un examen abierto. */
  reclamar(ahora: Date): Promise<number | null>;

  cargarContexto(propuestaId: number): Promise<ContextoCorreccionIa>;

  guardarGenerada(
    propuestaId: number,
    resultado: ResultadoCorreccionAlmacenado,
    ahora: Date,
  ): Promise<ResultadoPersistenciaCorreccionIa>;

  marcarError(
    propuestaId: number,
    codigo: string,
    mensaje: string,
    ahora: Date,
  ): Promise<boolean>;

  /** Reencola o cierra las propuestas `procesando` cuyo lease venció. */
  recuperarAbandonadas(
    ahora: Date,
    leaseSegundos: number,
    maxIntentos: number,
  ): Promise<ResultadoRecuperacionCorreccionIa>;
}


