import axios, { type AxiosInstance } from 'axios';
import * as moduloCliente from '@/lib/axios/client';

/** Contrato del endpoint docente /examenes/:id/resultados/correo. */
export interface EnvioCorreoCalificacion {
  envio_id: number;
  estudiante_id: number;
  nombre_completo: string;
  correo_institucional: string | null;
  estado: 'pendiente' | 'enviando' | 'enviado' | 'error';
  fecha: string;
}

export interface EstadoCorreoResultados {
  examen_id: number;
  enviar_resultados_correo: boolean;
  resultados_publicados_en: string | null;
  gmail_conectado: boolean;
  correo_remitente: string | null;
  total: number;
  enviados: number;
  errores: number;
  pendientes: number;
  enviando: number;
  envios: EnvioCorreoCalificacion[];
}

// Se utiliza la misma instancia autenticada de Axios que el resto de SafeTest.
function esClienteAxios(valor: unknown): valor is AxiosInstance {
  if (valor === null || (typeof valor !== 'object' && typeof valor !== 'function')) return false;
  const posible = valor as Partial<AxiosInstance>;
  return typeof posible.get === 'function' && typeof posible.put === 'function' &&
    typeof posible.post === 'function' && typeof posible.request === 'function';
}

const cliente: AxiosInstance = Object.values(moduloCliente).find(esClienteAxios) ??
  axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
    withCredentials: true,
  });

const ruta = (examenId: number) => `/examenes/${examenId}/resultados/correo`;

export const correoResultadosService = {
  async estado(examenId: number): Promise<EstadoCorreoResultados> {
    const { data } = await cliente.get<EstadoCorreoResultados>(ruta(examenId));
    return data;
  },
  async configurar(examenId: number, habilitado: boolean): Promise<EstadoCorreoResultados> {
    const { data } = await cliente.put<EstadoCorreoResultados>(ruta(examenId), {
      enviar_resultados_correo: habilitado,
    });
    return data;
  },
  async reintentar(examenId: number): Promise<EstadoCorreoResultados> {
    const { data } = await cliente.post<EstadoCorreoResultados>(`${ruta(examenId)}/reintentar`);
    return data;
  },
};
