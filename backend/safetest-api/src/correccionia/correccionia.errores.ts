import { ErrorGeneracionIa } from '../ia/ia.errors';
import { ErrorValidacionCorreccionIa } from './correccionia.validacion';

export const MENSAJE_EXAMEN_PUBLICADO =
  'El examen se cerró mientras la propuesta estaba en proceso.';
export const MENSAJE_TIEMPO_AGOTADO =
  'El worker no finalizó dentro del lease permitido.';

const MAX_LONGITUD_CODIGO = 40;
const MAX_LONGITUD_MENSAJE = 500;
const MENSAJE_GENERICO =
  'No fue posible completar la corrección con IA. Intenta de nuevo más tarde.';

export type CodigoErrorProcesamientoCorreccionIa =
  | 'SIN_CRITERIOS'
  | 'RESPUESTA_VACIA'
  | 'PUNTAJE_MAX_INVALIDO'
  | 'PUNTAJE_FUERA_DE_RANGO'
  | 'CONFIANZA_FUERA_DE_RANGO'
  | 'RESPUESTA_PROVEEDOR_INVALIDA'
  | 'PROVEEDOR_ERROR'
  | 'DATOS_INVALIDOS'
  | 'PROPUESTA_NO_ENCONTRADA'
  | 'ESTADO_INESPERADO'
  | 'EXAMEN_PUBLICADO'
  | 'TIEMPO_AGOTADO';

export class ErrorProcesamientoCorreccionIa extends Error {
  constructor(
    readonly codigo: CodigoErrorProcesamientoCorreccionIa,
    readonly motivo: string,
  ) {
    super(motivo);
    this.name = 'ErrorProcesamientoCorreccionIa';
  }
}

export interface FalloCorreccionIa {
  codigo: string;
  mensaje: string;
}

/**
 * Traduce cualquier fallo del worker a un código estable y a un mensaje
 * sanitizado. Los detalles técnicos y las credenciales nunca llegan a la API.
 */
export function describirFalloCorreccion(error: unknown): FalloCorreccionIa {
  if (
    error instanceof ErrorValidacionCorreccionIa ||
    error instanceof ErrorProcesamientoCorreccionIa
  ) {
    return {
      codigo: sanitizarCodigo(error.codigo),
      mensaje: sanitizarMensajeError(error.message),
    };
  }

  if (error instanceof ErrorGeneracionIa) {
    return {
      codigo: sanitizarCodigo(error.motivo),
      mensaje: sanitizarMensajeError(error.message),
    };
  }

  return {
    codigo: 'PROVEEDOR_ERROR',
    mensaje: MENSAJE_GENERICO,
  };
}

export function sanitizarCodigo(codigo: string): string {
  return (
    codigo
      .replace(/[^A-Za-z0-9_]/g, '_')
      .toUpperCase()
      .slice(0, MAX_LONGITUD_CODIGO) || 'ERROR_DESCONOCIDO'
  );
}

export function sanitizarMensajeError(mensaje: string): string {
  return (
    mensaje
      .replace(/AIza[0-9A-Za-z_-]{10,}/g, '[clave-oculta]')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_LONGITUD_MENSAJE) || MENSAJE_GENERICO
  );
}
