import axios, { type AxiosInstance } from 'axios';
import * as moduloCliente from '@/lib/axios/client';
import type { DetalleResultadoEstudiante, ResultadoListadoEstudiante } from './resultados.types';

// Mismo criterio de instancia compartida usado en el servicio de HU-31.
function esClienteAxios(valor: unknown): valor is AxiosInstance {
  if ((typeof valor !== 'function' && typeof valor !== 'object') || valor === null) return false;
  const cliente = valor as Partial<AxiosInstance>;
  return typeof cliente.get === 'function' && typeof cliente.post === 'function' &&
    typeof cliente.request === 'function';
}

const cliente = Object.values(moduloCliente).find(esClienteAxios) ?? axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
  withCredentials: true,
});

export const resultadosEstudianteService = {
  async listar(): Promise<ResultadoListadoEstudiante[]> {
    const { data } = await cliente.get<ResultadoListadoEstudiante[]>('/estudiante/resultados');
    return data;
  },
  async detalle(examenId: number): Promise<DetalleResultadoEstudiante> {
    const { data } = await cliente.get<DetalleResultadoEstudiante>(`/estudiante/resultados/${examenId}`);
    return data;
  },
};

export function mensajeErrorResultado(fallo: unknown): string {
  if (axios.isAxiosError(fallo)) {
    const respuesta = fallo.response?.data as { message?: string | string[] } | undefined;
    if (typeof respuesta?.message === 'string') return respuesta.message;
    if (Array.isArray(respuesta?.message)) return respuesta.message.join('. ');
    if (fallo.response?.status === 401) return 'Tu sesión expiró; inicia sesión nuevamente.';
    if (fallo.response?.status === 403) return 'Esta calificación todavía no está disponible.';
    if (fallo.response?.status === 404) return 'No se encontró el resultado solicitado.';
    if (!fallo.response) return 'No se pudo conectar con SafeTest.';
  }
  return fallo instanceof Error ? fallo.message : 'Ocurrió un error inesperado.';
}
