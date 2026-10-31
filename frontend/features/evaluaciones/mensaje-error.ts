import axios from 'axios';

import type { ProblemaPublicacion } from './types';

/** Toma el mensaje que devuelve el backend (si lo hay) o usa uno por defecto. */
export function mensajeDeError(error: unknown, porDefecto: string): string {
    if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
        const mensaje = error.response?.data?.message;

        if (Array.isArray(mensaje)) return mensaje.join(' ');
        if (mensaje) return mensaje;
    }

    return porDefecto;
}

/** Lista de problemas de publicación que devuelve el backend. */
export function problemasDeError(error: unknown): ProblemaPublicacion[] {
    if (axios.isAxiosError<{ problemas?: ProblemaPublicacion[] }>(error)) {
        return error.response?.data?.problemas ?? [];
    }

    return [];
}
