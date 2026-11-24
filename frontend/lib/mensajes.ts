import axios from 'axios';

/**
 * Traduce errores técnicos (axios / NestJS) a mensajes que un docente
 * entiende: QUÉ falló (título) y POR QUÉ + QUÉ HACER (detalle).
 *
 * Uso:
 *   catch (error) {
 *       const { titulo, detalle } = describirError(error, 'No se pudo cargar el resumen');
 *   }
 */
export interface MensajeUsuario {
    /** Qué no se pudo hacer. Es el `contexto` que pasa la pantalla. */
    titulo: string;
    /** Por qué falló y qué puede hacer la persona. */
    detalle: string;
    /** Código HTTP si hubo respuesta del servidor. */
    estado?: number;
}

interface CuerpoError {
    message?: string | string[];
}

/** Saca el mensaje que escribió el backend, si lo hay. */
function mensajeDelServidor(error: unknown): string | null {
    if (!axios.isAxiosError<CuerpoError>(error)) return null;

    const mensaje = error.response?.data?.message;
    if (Array.isArray(mensaje)) return mensaje.join('. ');
    if (typeof mensaje === 'string' && mensaje.trim() !== '') return mensaje;

    return null;
}

export function describirError(error: unknown, contexto: string): MensajeUsuario {
    // 1. Ni siquiera hubo respuesta: problema de red o servidor apagado.
    if (axios.isAxiosError(error) && !error.response) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return {
                titulo: contexto,
                detalle:
                    'El servidor tardó demasiado en responder. Revisa tu conexión e inténtalo de nuevo en unos segundos.',
            };
        }

        return {
            titulo: contexto,
            detalle:
                'No pudimos comunicarnos con SafeTest. Revisa tu conexión a internet; si el problema continúa, avisa al administrador.',
        };
    }

    // 2. El servidor respondió con un código de error.
    if (axios.isAxiosError(error) && error.response) {
        const estado = error.response.status;
        const delServidor = mensajeDelServidor(error);

        if (estado === 401) {
            return {
                titulo: contexto,
                detalle:
                    'Tu sesión expiró por seguridad. Vuelve a iniciar sesión para continuar.',
                estado,
            };
        }

        if (estado === 403) {
            return {
                titulo: contexto,
                detalle:
                    delServidor ??
                    'No tienes permiso para ver este contenido. Pertenece a otro docente o a otra cuenta.',
                estado,
            };
        }

        if (estado === 404) {
            return {
                titulo: contexto,
                detalle:
                    delServidor ??
                    'No encontramos lo que buscabas. Puede haberse eliminado o cambiado de lugar.',
                estado,
            };
        }

        if (estado === 409) {
            return {
                titulo: contexto,
                detalle:
                    delServidor ??
                    'Esta acción entra en conflicto con el estado actual. Actualiza la página e inténtalo otra vez.',
                estado,
            };
        }

        if (estado === 400 || estado === 422) {
            return {
                titulo: contexto,
                detalle:
                    delServidor ??
                    'Revisa los datos ingresados: alguno no es válido.',
                estado,
            };
        }

        if (estado >= 500) {
            return {
                titulo: contexto,
                detalle:
                    'Ocurrió un problema en el servidor. No es un error tuyo: inténtalo de nuevo en un momento y, si se repite, avisa al administrador.',
                estado,
            };
        }

        return { titulo: contexto, detalle: delServidor ?? 'Ocurrió un error inesperado.', estado };
    }

    // 3. Error de programación u otro motivo.
    return {
        titulo: contexto,
        detalle: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    };
}

/** Para pantallas que guardan el error como un solo texto. */
export function mensajeComoTexto(error: unknown, contexto: string): string {
    const { titulo, detalle } = describirError(error, contexto);
    return `${titulo}. ${detalle}`;
}

/** ¿El error es un 403 (recurso de otro docente)? */
export function esAccesoDenegado(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 403;
}

/** Error de una fila concreta que devuelve el servidor (ej. código de materia repetido). */
export interface ErrorFilaApi {
    /** Posición de la fila, empezando en 0. */
    indice: number;
    campo: 'nombre' | 'codigo';
    mensaje: string;
}

/**
 * Saca la lista de errores por fila que el servidor envía cuando se
 * crean varias materias a la vez. Devuelve [] si el error no es de ese tipo.
 */
export function erroresPorFila(error: unknown): ErrorFilaApi[] {
    if (!axios.isAxiosError<{ errores?: ErrorFilaApi[] }>(error)) return [];

    const errores = error.response?.data?.errores;
    return Array.isArray(errores) ? errores : [];
}
