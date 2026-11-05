/** Estado de extracción derivado del texto disponible en la base. */
export const ESTADOS_EXTRACCION = ['completado', 'sin_texto'] as const;

export type EstadoExtraccion = (typeof ESTADOS_EXTRACCION)[number];

/**
 * Archivo recibido por multer. Se tipa aquí para que el servicio no dependa
 * del tipo global de Express y pueda probarse con un objeto simple.
 */
export interface ArchivoSubido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
