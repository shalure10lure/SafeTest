import axios from 'axios';

import { BaseService } from '@/services/api/base.service';

import type {
  AceptarCorreccionIaRequest,
  AceptarCorreccionIaResponse,
  ActualizarCorreccionIaRequest,
  BandejaCorreccionesIaResponse,
  CorreccionIa,
  CuerpoVacioCorreccionIa,
  DescartarCorreccionIaRequest,
  DescartarCorreccionIaResponse,
  FiltrosBandejaCorreccionIa,
  FiltrosHistorialCorreccionIa,
  RegenerarCorreccionIaResponse,
  SolicitarCorreccionIaResponse,
} from '../correccion-ia.types';

interface ErrorHttpCorreccionIa {
  codigo?: string;
  message?: string | string[];
}

const MENSAJES_POR_CODIGO: Record<string, string> = {
  RESPUESTA_VACIA:
    'La respuesta del estudiante está vacía; no se puede solicitar una corrección con IA.',
  SIN_CRITERIOS:
    'No hay criterios suficientes para corregir esta respuesta. Revisa la solución o la rúbrica del inciso.',
  PUNTAJE_MAX_INVALIDO:
    'El puntaje máximo del inciso no es válido. Revisa la configuración de la evaluación.',
  PUNTAJE_FUERA_DE_RANGO:
    'El puntaje debe estar entre cero y el máximo permitido, con hasta dos decimales.',
  CONFIANZA_FUERA_DE_RANGO:
    'La confianza de la propuesta no está dentro del rango permitido.',
  SIN_CAMBIOS: 'Indica al menos un cambio para modificar la propuesta.',
  EXAMEN_NO_ENCONTRADO:
    'No se encontró la evaluación o no tienes acceso a ella.',
  RENDICION_NO_ENCONTRADA:
    'No se encontró la rendición del estudiante para esta evaluación.',
  INCISO_NO_ENCONTRADO:
    'No se encontró el inciso de la respuesta en la evaluación.',
  PROPUESTA_NO_ENCONTRADA:
    'No se encontró la propuesta o no tienes acceso a ella.',
  PROPUESTA_ACTIVA_EXISTENTE:
    'Ya existe una propuesta activa para este inciso.',
  INCISO_NO_PENDIENTE:
    'El inciso ya fue corregido oficialmente y no admite una nueva propuesta.',
  RENDICION_NO_ENVIADA:
    'La rendición debe estar enviada o corregida antes de solicitar una propuesta.',
  REVISION_CERRADA:
    'La revisión de calificaciones ya está cerrada y no se puede modificar la propuesta.',
  RESULTADOS_PUBLICADOS:
    'Los resultados ya fueron publicados y no se puede modificar la propuesta.',
  SIN_PUNTAJE_SUGERIDO:
    'La propuesta no tiene un puntaje sugerido que se pueda aceptar.',
  PROPUESTA_DESACTUALIZADA:
    'La propuesta cambió desde que la consultaste. Actualiza la información e inténtalo de nuevo.',
  PUNTAJE_CONFIRMADO_NO_COINCIDE:
    'El puntaje confirmado no coincide con el sugerido. Actualiza la propuesta antes de aceptarla.',
  ESTADO_NO_PERMITE_OPERACION:
    'El estado actual de la propuesta no permite esta acción.',
  PROPUESTA_EN_PROCESO:
    'La propuesta todavía se está procesando. Espera a que termine antes de regenerarla.',
};

const MENSAJES_POR_ESTADO: Record<number, string> = {
  400: 'No se pudo procesar la solicitud. Revisa los datos e inténtalo de nuevo.',
  404: 'No se encontró la evaluación, el inciso o la propuesta solicitada.',
  409: 'La propuesta cambió o su estado ya no permite esta acción. Actualiza la información e inténtalo de nuevo.',
};

class CorreccionIaService extends BaseService {
  constructor() {
    super('');
  }

  solicitar(
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
  ): Promise<SolicitarCorreccionIaResponse> {
    return this.post<
      SolicitarCorreccionIaResponse,
      CuerpoVacioCorreccionIa
    >(rutaInciso(examenId, estudianteId, preguntaId, letra), undefined);
  }

  regenerar(
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
  ): Promise<RegenerarCorreccionIaResponse> {
    return this.post<
      RegenerarCorreccionIaResponse,
      CuerpoVacioCorreccionIa
    >(`${rutaInciso(examenId, estudianteId, preguntaId, letra)}/regenerar`, undefined);
  }

  listarPorExamen(
    examenId: number,
    filtros?: FiltrosBandejaCorreccionIa,
  ): Promise<BandejaCorreccionesIaResponse> {
    return this.get<BandejaCorreccionesIaResponse>(
      `/examenes/${examenId}/correcciones-ia`,
      filtros === undefined ? undefined : { params: filtros },
    );
  }

  listarHistorial(
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
    filtros?: FiltrosHistorialCorreccionIa,
  ): Promise<CorreccionIa[]> {
    return this.get<CorreccionIa[]>(
      rutaInciso(examenId, estudianteId, preguntaId, letra),
      filtros === undefined ? undefined : { params: filtros },
    );
  }

  obtenerDetalle(propuestaId: number): Promise<CorreccionIa> {
    return this.get<CorreccionIa>(`/correcciones-ia/${propuestaId}`);
  }

  modificar(
    propuestaId: number,
    cambios: ActualizarCorreccionIaRequest,
  ): Promise<CorreccionIa> {
    return this.patch<CorreccionIa, ActualizarCorreccionIaRequest>(
      `/correcciones-ia/${propuestaId}`,
      cambios,
    );
  }

  descartar(
    propuestaId: number,
    entrada: DescartarCorreccionIaRequest = {},
  ): Promise<DescartarCorreccionIaResponse> {
    return this.post<DescartarCorreccionIaResponse, DescartarCorreccionIaRequest>(
      `/correcciones-ia/${propuestaId}/descartar`,
      entrada,
    );
  }

  aceptar(
    propuestaId: number,
    entrada: AceptarCorreccionIaRequest,
  ): Promise<AceptarCorreccionIaResponse> {
    return this.post<AceptarCorreccionIaResponse, AceptarCorreccionIaRequest>(
      `/correcciones-ia/${propuestaId}/aceptar`,
      entrada,
    );
  }
}

function rutaInciso(
  examenId: number,
  estudianteId: number,
  preguntaId: number,
  letra: string,
): string {
  return `/examenes/${examenId}/calificaciones/${estudianteId}/respuestas/${preguntaId}/${encodeURIComponent(letra)}/ia`;
}

/** Traduce los códigos HTTP del contrato HU-45 a mensajes para el docente. */
export function mensajeErrorCorreccionIa(error: unknown): string {
  if (axios.isAxiosError<ErrorHttpCorreccionIa>(error)) {
    const respuesta = error.response;
    const codigo = respuesta?.data?.codigo;
    if (codigo && MENSAJES_POR_CODIGO[codigo]) {
      return MENSAJES_POR_CODIGO[codigo];
    }

    const mensaje = respuesta?.data?.message;
    if (Array.isArray(mensaje)) {
      return mensaje.join('. ');
    }
    if (typeof mensaje === 'string') {
      return mensaje;
    }

    if (respuesta && MENSAJES_POR_ESTADO[respuesta.status]) {
      return MENSAJES_POR_ESTADO[respuesta.status];
    }
    if (respuesta?.status === 401) {
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    }
    if (respuesta?.status === 403) {
      return 'No tienes permiso para gestionar estas propuestas de corrección.';
    }
    if (!respuesta) {
      return 'No se pudo conectar con el backend. Verifica que esté encendido.';
    }
  }

  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado al gestionar la corrección con IA.';
}

export const correccionIaService = new CorreccionIaService();
