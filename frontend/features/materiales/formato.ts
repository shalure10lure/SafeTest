import type { EstadoExtraccion } from './types';

/** Mismo límite que MATERIAL_MAX_BYTES del backend; el servidor sigue siendo la fuente de verdad. */
export const MAX_BYTES = 10 * 1024 * 1024;

export const ACCEPT_ARCHIVO = [
    '.pdf',
    '.txt',
    '.docx',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',');

export const EXTENSIONES_PERMITIDAS = '.pdf, .txt y .docx';

export type FormatoArchivo = 'PDF' | 'TXT' | 'DOCX';

const FORMATOS_POR_MIME: Record<string, FormatoArchivo> = {
    'application/pdf': 'PDF',
    'text/plain': 'TXT',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'DOCX',
};

/** Deduce el formato visible a partir del nombre o, si falta, del MIME. */
export function formatoDeArchivo(
    nombreArchivo: string,
    mimeType?: string | null,
): FormatoArchivo | null {
    const nombre = nombreArchivo.toLowerCase();
    const punto = nombre.lastIndexOf('.');

    if (punto !== -1) {
        const extension = nombre.slice(punto);

        if (extension === '.pdf') return 'PDF';
        if (extension === '.txt') return 'TXT';
        if (extension === '.docx') return 'DOCX';
    }

    return mimeType ? (FORMATOS_POR_MIME[mimeType] ?? null) : null;
}

/**
 * Validación previa en el navegador. Devuelve el mensaje a mostrar o `null`
 * si el archivo puede enviarse; el backend vuelve a validar MIME y contenido.
 */
export function validarArchivo(archivo: File): string | null {
    if (!formatoDeArchivo(archivo.name, archivo.type)) {
        return `Formato no permitido. Solo se aceptan archivos ${EXTENSIONES_PERMITIDAS}.`;
    }

    if (archivo.size === 0) {
        return 'El archivo está vacío. Selecciona un documento con contenido.';
    }

    if (archivo.size > MAX_BYTES) {
        return `El archivo supera el tamaño máximo de ${formatearTamano(MAX_BYTES)}.`;
    }

    return null;
}

export function formatearTamano(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';

    if (bytes < 1024) return `${bytes} B`;

    const kilobytes = bytes / 1024;

    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(kilobytes < 10 ? 1 : 0)} KB`;
    }

    const megabytes = kilobytes / 1024;

    return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`;
}

export function formatearFecha(valor: string | null | undefined): string {
    if (!valor) return '—';

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) return '—';

    return new Intl.DateTimeFormat('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(fecha);
}

export function etiquetaExtraccion(estado: EstadoExtraccion): string {
    return estado === 'completado'
        ? 'Texto extraído'
        : 'Sin texto extraído';
}

/** Texto explicativo para docentes que no conocen el proceso interno. */
export function explicacionExtraccion(estado: EstadoExtraccion): string {
    return estado === 'completado'
        ? 'El texto del documento se procesó correctamente y puede usarse para generar preguntas.'
        : 'No se encontró texto utilizable en el documento, por lo que no puede usarse para generar preguntas.';
}
