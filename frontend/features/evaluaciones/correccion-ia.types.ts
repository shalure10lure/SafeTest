/** Estados públicos de una propuesta de corrección IA (HU-45). */
export type EstadoCorreccionIa =
  | 'pendiente'
  | 'procesando'
  | 'generada'
  | 'modificada'
  | 'aceptada'
  | 'descartada'
  | 'reemplazada'
  | 'error';

export interface ErrorCorreccionIa {
  tipo: string;
  descripcion: string;
  ubicacion?: string;
}

/** Los valores numeric de PostgreSQL y las marcas de tiempo llegan como texto. */
export interface CorreccionIa {
  propuesta_id: number;
  examen_id: number;
  estudiante_id: number;
  pregunta_id: number;
  letra: string;
  estado: EstadoCorreccionIa;
  puntaje_sugerido: string | null;
  puntaje_max_inciso: string | null;
  valoracion: string | null;
  explicacion: string | null;
  errores: ErrorCorreccionIa[] | null;
  confianza: string | null;
  criterio_fuente: string | null;
  criterio_hash: string | null;
  modelo: string | null;
  proveedor: string | null;
  intento: number;
  version: number;
  creada_en: string;
  iniciada_en: string | null;
  finalizada_en: string | null;
  actualizada_en: string;
  revisada_en: string | null;
  revisada_por_docente_id: number | null;
  reemplazada_por_id: number | null;
  error_codigo: string | null;
  error_mensaje: string | null;
  motivo: string | null;
}

/** Los endpoints de regeneración no reciben campos. */
export type CuerpoVacioCorreccionIa = undefined;

export interface RegenerarCorreccionIaResponse {
  propuesta_id: number;
  estado: 'pendiente';
  intento: number;
}

export interface OmisionCorreccionIaLote {
  estudiante_id: number;
  pregunta_id: number;
  letra: string;
  motivo: string;
}

export interface ResultadoLoteCorreccionIa {
  solicitadas: number;
  omitidas: number;
  detalle_omitidas: OmisionCorreccionIaLote[];
}

export interface FiltrosBandejaCorreccionIa {
  estado?: EstadoCorreccionIa;
  estudiante_id?: number;
  pregunta_id?: number;
  solo_pendientes_revision?: boolean;
  limite?: number;
  desplazamiento?: number;
}

export interface BandejaCorreccionesIaResponse {
  total: number;
  propuestas: CorreccionIa[];
}

export interface ActualizarCorreccionIaRequest {
  puntaje?: number;
  valoracion?: string;
  explicacion?: string;
  errores?: ErrorCorreccionIa[];
}

export interface DescartarCorreccionIaRequest {
  motivo?: string | null;
}

export interface DescartarCorreccionIaResponse {
  propuesta_id: number;
  estado: 'descartada';
}

export interface AceptarCorreccionIaRequest {
  version: number;
  puntaje_confirmado: string;
  retroalimentacion?: string;
}

export interface CalificacionOficialCorreccionIa {
  puntaje_obtenido: string | null;
  estado_correccion: string;
  nota_final: string | null;
  estado_rendicion: string;
  pendientes_revision: number;
}

export interface AdvertenciaAceptacionCorreccionIa {
  codigo: 'CRITERIO_ACTUALIZADO';
  mensaje: string;
}

export interface AceptarCorreccionIaResponse {
  propuesta: {
    propuesta_id: number;
    estado: 'aceptada';
  };
  calificacion: CalificacionOficialCorreccionIa;
  advertencias: AdvertenciaAceptacionCorreccionIa[];
}
