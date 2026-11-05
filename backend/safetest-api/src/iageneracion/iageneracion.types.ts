import type {
  DificultadIa,
  MaterialIa,
  OpcionIa,
  TokensIa,
} from '../ia/ai.types';
import type { TipoRespuesta } from '../pregunta/entity/dtos/create-pregunta.dto';

/** Estados de una generación, tal como se guardan en la base de datos. */
export const ESTADOS_GENERACION = [
  'pendiente',
  'procesando',
  'completada',
  'error',
] as const;

export type EstadoGeneracion = (typeof ESTADOS_GENERACION)[number];

export const CANTIDAD_MINIMA_PREGUNTAS = 1;
export const CANTIDAD_MAXIMA_PREGUNTAS = 50;

export const DIFICULTADES_IA: DificultadIa[] = ['facil', 'media', 'dificil'];

/**
 * Puntaje inicial de una propuesta. El docente puede ajustarlo al aceptarla;
 * el proveedor de IA no decide puntajes.
 */
export const PUNTAJE_MAXIMO_POR_DEFECTO = 1;

/** Entrada de creación de una generación (la validará el servicio). */
export interface CrearGeneracionIaEntrada {
  materia_id: number;
  tema_id: number;
  tipo_respuesta: TipoRespuesta;
  cantidad: number;
  dificultad: DificultadIa;
  material_ids?: number[];
}

/**
 * Datos mínimos para ejecutar una generación ya reclamada por el worker.
 * No incluye ids de docente ni credenciales.
 */
export interface GeneracionContexto {
  generacion_id: number;
  materia: string;
  tema: string;
  tipo_respuesta: TipoRespuesta;
  cantidad: number;
  dificultad: DificultadIa;
  materiales: MaterialIa[];
}

/** Contenido jsonb que se guarda en ia_propuesta_pregunta. */
export interface ContenidoPropuesta {
  enunciado: string;
  dificultad: DificultadIa;
  puntaje_max: number;
  opciones?: OpcionIa[];
  valor_correcto?: number;
  tolerancia?: number;
  solucion_referencia?: string;
  explicacion?: string;
}

/** Resultado que el worker persiste cuando la generación termina bien. */
export interface ResultadoGeneracionAlmacenado {
  propuestas: ContenidoPropuesta[];
  proveedor: string;
  modelo: string | null;
  tokens: TokensIa;
}

/**
 * Persistencia que necesita el worker. La implementa IaGeneracionService, lo
 * que permite probar el worker con un doble en memoria.
 */
export const ALMACEN_GENERACIONES = Symbol('ALMACEN_GENERACIONES');

export interface AlmacenGeneraciones {
  listarPendientes(limite: number): Promise<number[]>;

  /** Reclama la generación de forma atómica; false si otro la tomó. */
  reclamar(generacionId: number, ahora: Date): Promise<boolean>;

  cargarContexto(generacionId: number): Promise<GeneracionContexto>;

  guardarCompletada(
    generacionId: number,
    resultado: ResultadoGeneracionAlmacenado,
    ahora: Date,
  ): Promise<void>;

  marcarError(
    generacionId: number,
    mensaje: string,
    ahora: Date,
  ): Promise<void>;

  reencolar(generacionId: number, ahora: Date): Promise<void>;

  /** Devuelve a 'pendiente' las generaciones 'procesando' vencidas. */
  recuperarInterrumpidas(ahora: Date, antiguedadMs: number): Promise<number>;
}
