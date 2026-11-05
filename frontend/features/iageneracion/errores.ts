import axios from 'axios';

interface RespuestaErrorIa {
    message?: string | string[];
}

function mensajeDelServidor(error: unknown): string | null {
    if (!axios.isAxiosError<RespuestaErrorIa>(error)) return null;

    const mensaje = error.response?.data?.message;

    if (Array.isArray(mensaje)) return mensaje.join(' ');
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;

    return null;
}

/**
 * Traduce los errores HTTP del módulo de IA a mensajes comprensibles.
 *
 * El mensaje del backend tiene prioridad cuando existe; los códigos 400, 401,
 * 403 y 404 reciben además una explicación orientada al docente.
 */
export function mensajeErrorGeneracionIa(
    error: unknown,
    porDefecto: string,
): string {
    if (!axios.isAxiosError<RespuestaErrorIa>(error)) return porDefecto;

    const estado = error.response?.status;
    const delServidor = mensajeDelServidor(error);

    switch (estado) {
        case 400:
            return (
                delServidor ??
                'La configuración no es válida. Revisa la materia, el tema, la cantidad y los materiales.'
            );
        case 401:
            return 'Tu sesión expiró. Inicia sesión de nuevo para continuar.';
        case 403:
            return 'No tienes permisos de docente para generar preguntas.';
        case 404:
            return (
                delServidor ??
                'La generación o los datos seleccionados ya no están disponibles.'
            );
        default:
            if (!error.response) {
                return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
            }

            return delServidor ?? porDefecto;
    }
}

/** 400/401/403/404 no se resuelven reintentando la misma consulta. */
export function esErrorDefinitivoIa(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;

    const estado = error.response?.status;

    return estado === 400 || estado === 401 || estado === 403 || estado === 404;
}
