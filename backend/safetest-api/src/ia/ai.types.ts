import type { TipoRespuesta } from '../pregunta/entity/dtos/create-pregunta.dto';

/** Dificultad manejada por el banco de preguntas. */
export type DificultadIa = 'facil' | 'media' | 'dificil';

export interface MaterialIa {
  titulo: string;
  texto: string;
}

/** Entrada del proveedor de IA. No incluye ids ni datos del docente. */
export interface SolicitudGeneracionIa {
  materia: string;
  tema: string;
  tipo_respuesta: TipoRespuesta;
  cantidad: number;
  dificultad: DificultadIa;
  materiales: MaterialIa[];
}

export interface OpcionIa {
  texto_opcion: string;
  es_correcta: boolean;
}

/**
 * Propuesta cruda del proveedor. El servidor completa el puntaje y valida la
 * estructura antes de persistirla.
 *
 * `dificultad` es autoritativa de la solicitud: el proveedor puede declararla,
 * pero si lo hace debe coincidir con el nivel pedido. Nunca se acepta una
 * dificultad distinta solo porque el modelo la escriba en su respuesta.
 */
export interface PreguntaIa {
  enunciado: string;
  tipo_respuesta: TipoRespuesta;
  dificultad?: DificultadIa;
  opciones?: OpcionIa[];
  valor_correcto?: number;
  tolerancia?: number;
  solucion_referencia?: string;
  explicacion?: string;
}

export interface TokensIa {
  entrada: number | null;
  salida: number | null;
  total: number | null;
}

export interface ResultadoGeneracionIa {
  preguntas: PreguntaIa[];
  proveedor: string;
  modelo: string | null;
  tokens: TokensIa;
}
