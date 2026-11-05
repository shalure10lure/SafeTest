/** Token de inyección del almacenamiento de archivos originales. */
export const ALMACEN_ARCHIVOS = Symbol('ALMACEN_ARCHIVOS');

/**
 * Contrato del almacenamiento de archivos originales.
 *
 * El módulo de materiales solo conoce este contrato; hoy lo implementa el
 * sistema de archivos local y mañana podría implementarlo MinIO u otro
 * proveedor sin reescribir el servicio.
 */
export interface AlmacenArchivos {
  guardar(clave: string, contenido: Buffer, mimeType: string): Promise<void>;

  /** Borra un archivo; si ya no existe, la operación es exitosa. */
  eliminar(clave: string): Promise<void>;
}

/** Error del almacenamiento, sin detalles de rutas internas. */
export class ErrorAlmacenArchivos extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorAlmacenArchivos';
  }
}
