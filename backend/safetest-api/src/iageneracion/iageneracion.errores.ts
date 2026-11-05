import { ErrorGeneracionIa, type MotivoErrorIa } from '../ia/ia.errors';

/** Longitud de la columna ia_generacion.error_mensaje. */
export const MAX_LONGITUD_MENSAJE_ERROR = 500;

/**
 * Mensajes que puede leer el docente. Nunca incluyen detalles técnicos del
 * proveedor, credenciales ni contenido de materiales.
 */
const MENSAJES: Record<MotivoErrorIa, string> = {
  cuota:
    'El proveedor de IA alcanzó su límite de uso. Intenta de nuevo más tarde.',
  timeout:
    'La generación tardó más de lo permitido. Intenta de nuevo más tarde.',
  autenticacion:
    'El servicio de IA no está disponible en este momento. Contacta al administrador.',
  proveedor:
    'El proveedor de IA devolvió un error. Intenta de nuevo más tarde.',
  respuesta_invalida:
    'La IA no devolvió propuestas válidas para el tipo de pregunta solicitado.',
  material_insuficiente:
    'Los documentos seleccionados no contienen información suficiente para generar la cantidad de preguntas solicitada.',
  modelo_no_disponible:
    'El modelo Gemini configurado no está disponible. Verifica GEMINI_MODEL con el administrador.',
  datos_invalidos:
    'La solicitud de generación no es válida. Crea una nueva generación.',
  materiales_no_disponibles:
    'La autorización de uno o más materiales fue revocada o ya no están disponibles. Crea una nueva generación.',
};

const MENSAJE_DESCONOCIDO =
  'No fue posible completar la generación. Intenta de nuevo más tarde.';

export type MotivoFalloGeneracion = MotivoErrorIa | 'desconocido';

export interface FalloGeneracion {
  motivo: MotivoFalloGeneracion;
  reintentable: boolean;
  mensaje: string;
}

/**
 * Traduce un fallo del proveedor o del proceso a un mensaje sanitizado y a la
 * decisión de reintento. Un error desconocido no se reintenta para no entrar
 * en un bucle.
 */
export function describirFallo(error: unknown): FalloGeneracion {
  if (error instanceof ErrorGeneracionIa) {
    return {
      motivo: error.motivo,
      reintentable: error.reintentable,
      mensaje: sanitizarMensaje(MENSAJES[error.motivo]),
    };
  }

  return {
    motivo: 'desconocido',
    reintentable: false,
    mensaje: MENSAJE_DESCONOCIDO,
  };
}

/** Recorta el texto y elimina cualquier rastro de credencial. */
export function sanitizarMensaje(mensaje: string): string {
  return mensaje
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, '[clave-oculta]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LONGITUD_MENSAJE_ERROR);
}
