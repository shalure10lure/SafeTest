/** Motivos por los que se rechaza o falla un material académico. */
export type MotivoErrorMaterial =
  | 'archivo_requerido'
  | 'archivo_vacio'
  | 'archivo_demasiado_grande'
  | 'extension_no_permitida'
  | 'mime_no_permitido'
  | 'contenido_no_permitido'
  | 'archivo_danado'
  | 'sin_texto'
  | 'extraccion_fallida';

/**
 * Error de dominio del módulo de materiales.
 *
 * El mensaje está pensado para el docente: nunca contiene rutas internas,
 * nombres de otros usuarios ni detalles del parser.
 */
export class ErrorMaterial extends Error {
  constructor(
    readonly motivo: MotivoErrorMaterial,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorMaterial';
  }
}
