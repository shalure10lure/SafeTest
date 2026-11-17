import axios, { type AxiosInstance } from 'axios';
import * as moduloCliente from '@/lib/axios/client';

import type {
  DetalleCalificacion,
  EvaluacionDocenteBasica,
  RespuestaValoracion,
  ResultadoConfirmacion,
  ResultadoValoracion,
  ResumenCalificaciones,
} from '../calificaciones.types';

/**
 * Reutiliza la instancia Axios del proyecto (sus cookies, token e interceptores).
 * Al no disponer todavía de client.ts, se admiten exports default o nombrados.
 * Si el módulo no exporta una instancia Axios, usamos una de respaldo.
 */
function esClienteAxios(valor: unknown): valor is AxiosInstance {
  if ((typeof valor !== 'function' && typeof valor !== 'object') || valor === null) {
    return false;
  }
  const posible = valor as Partial<AxiosInstance>;
  return typeof posible.get === 'function' && typeof posible.patch === 'function' &&
    typeof posible.post === 'function' && typeof posible.request === 'function';
}

const cliente: AxiosInstance = Object.values(moduloCliente).find(esClienteAxios) ??
  axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
    withCredentials: true,
  });

const ruta = (examenId: number) => `/examenes/${examenId}/calificaciones`;

export const calificacionesService = {
  async listarEvaluaciones(): Promise<EvaluacionDocenteBasica[]> {
    const { data } = await cliente.get<EvaluacionDocenteBasica[]>('/examenes');
    return data;
  },

  async resumen(examenId: number): Promise<ResumenCalificaciones> {
    const { data } = await cliente.get<ResumenCalificaciones>(ruta(examenId));
    return data;
  },

  async detalle(examenId: number, estudianteId: number): Promise<DetalleCalificacion> {
    const { data } = await cliente.get<DetalleCalificacion>(`${ruta(examenId)}/${estudianteId}`);
    return data;
  },

  async valorar(
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
    valoracion: RespuestaValoracion,
  ): Promise<ResultadoValoracion> {
    const { data } = await cliente.patch<ResultadoValoracion>(
      `${ruta(examenId)}/${estudianteId}/respuestas/${preguntaId}/${encodeURIComponent(letra)}`,
      valoracion,
    );
    return data;
  },

  /** HU-32: publicación OFICIAL, posterior a la confirmación HU-31. */
  async publicarResultados(examenId: number): Promise<{
    examen_id: number;
    resultados_publicados_en: string;
    ya_publicados: boolean;
  }> {
    const { data } = await cliente.post(`/examenes/${examenId}/resultados/publicar`);
    return data;
  },

  /** Publica las soluciones correctas, únicamente después de publicar las notas. */
  async publicarRespuestas(examenId: number): Promise<{
    examen_id: number;
    ya_publicadas: boolean;
  }> {
    const { data } = await cliente.post(`/examenes/${examenId}/respuestas/publicar`);
    return data;
  },

  async confirmar(examenId: number): Promise<ResultadoConfirmacion> {
    const { data } = await cliente.post<ResultadoConfirmacion>(`${ruta(examenId)}/confirmar`);
    return data;
  },
};

/** Adapta errores HTTP de NestJS a un mensaje comprensible en pantalla. */
export function mensajeErrorCalificaciones(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const datos = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(datos?.message)) return datos.message.join('. ');
    if (typeof datos?.message === 'string') return datos.message;
    if (error.response?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    if (error.response?.status === 403) return 'No tienes permiso para revisar estas calificaciones.';
    if (error.response?.status === 404) return 'No se encontró la evaluación o la rendición.';
    if (!error.response) return 'No se pudo conectar con el backend. Verifica que esté encendido.';
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
