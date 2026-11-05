/** Motivos por los que puede fallar una generación con IA. */
export type MotivoErrorIa =
  | 'cuota'
  | 'timeout'
  | 'autenticacion'
  | 'proveedor'
  | 'respuesta_invalida'
  | 'material_insuficiente'
  | 'modelo_no_disponible'
  | 'datos_invalidos'
  | 'materiales_no_disponibles';

interface OpcionesErrorIa {
  /** Indica si tiene sentido reintentar la generación más tarde. */
  reintentable?: boolean;
  /** Código HTTP devuelto por el proveedor, si aplica. */
  estadoHttp?: number | null;
}

/**
 * Error de dominio del módulo de IA. Oculta los detalles del proveedor y
 * evita propagar credenciales o contenido de materiales hacia capas
 * superiores.
 */
export class ErrorGeneracionIa extends Error {
  readonly reintentable: boolean;
  readonly estadoHttp: number | null;

  constructor(
    readonly motivo: MotivoErrorIa,
    mensaje: string,
    opciones: OpcionesErrorIa = {},
  ) {
    super(mensaje);
    this.name = 'ErrorGeneracionIa';
    this.reintentable =
      opciones.reintentable ?? (motivo === 'cuota' || motivo === 'timeout');
    this.estadoHttp = opciones.estadoHttp ?? null;
  }
}
