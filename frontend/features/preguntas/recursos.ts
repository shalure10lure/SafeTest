import type { ContenidoTabla, TipoRecurso } from './types';

// Estos límites replican los del backend; allí se vuelven a validar.
export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;
export const TIPOS_IMAGEN_PERMITIDOS = [
    'image/png',
    'image/jpeg',
    'image/webp',
] as const;
export const MAX_CARACTERES_FORMULA = 500;
export const MAX_RECURSOS_POR_PREGUNTA = 10;

export const LIMITES_TABLA = {
    maxFilas: 20,
    maxColumnas: 10,
    maxCaracteresCelda: 200,
} as const;

export const ETIQUETA_RECURSO: Record<TipoRecurso, string> = {
    imagen: 'Imagen',
    tabla: 'Tabla',
    formula: 'Fórmula',
};

const MIB = 1024 * 1024;

/**
 * Comprobación rápida antes de subir. Solo mira el tipo que declara el
 * navegador; el backend revisa los bytes reales del archivo.
 */
export function errorArchivoImagen(
    archivo: Pick<File, 'type' | 'size'>,
): string {
    if (
        !(TIPOS_IMAGEN_PERMITIDOS as readonly string[]).includes(archivo.type)
    ) {
        return 'Formato no permitido. Usa PNG, JPG o WebP.';
    }

    if (archivo.size === 0) {
        return 'La imagen está vacía.';
    }

    if (archivo.size > MAX_BYTES_IMAGEN) {
        return `La imagen supera el tamaño máximo de ${MAX_BYTES_IMAGEN / MIB} MiB.`;
    }

    return '';
}

export function errorFormula(texto: string): string {
    const formula = texto.trim();

    if (!formula) {
        return 'Escribe la fórmula en LaTeX.';
    }

    if (formula.length > MAX_CARACTERES_FORMULA) {
        return `La fórmula no puede superar ${MAX_CARACTERES_FORMULA} caracteres.`;
    }

    return '';
}

export function errorTabla(tabla: ContenidoTabla): string {
    const { filas } = tabla;

    if (filas.length === 0) {
        return 'La tabla debe tener al menos una fila.';
    }

    if (filas.length > LIMITES_TABLA.maxFilas) {
        return `La tabla no puede tener más de ${LIMITES_TABLA.maxFilas} filas.`;
    }

    const columnas = filas[0].length;

    if (columnas === 0) {
        return 'La tabla debe tener al menos una columna.';
    }

    if (columnas > LIMITES_TABLA.maxColumnas) {
        return `La tabla no puede tener más de ${LIMITES_TABLA.maxColumnas} columnas.`;
    }

    if (filas.some((fila) => fila.length !== columnas)) {
        return 'Todas las filas deben tener el mismo número de columnas.';
    }

    if (
        filas.some((fila) =>
            fila.some(
                (celda) => celda.trim().length > LIMITES_TABLA.maxCaracteresCelda,
            ),
        )
    ) {
        return `Cada celda puede tener hasta ${LIMITES_TABLA.maxCaracteresCelda} caracteres.`;
    }

    if (filas.every((fila) => fila.every((celda) => celda.trim() === ''))) {
        return 'La tabla no puede estar completamente vacía.';
    }

    return '';
}

/** Tabla en blanco para empezar a editar. */
export function tablaVacia(filas = 2, columnas = 2): ContenidoTabla {
    return {
        encabezado: true,
        filas: Array.from({ length: filas }, () =>
            Array.from({ length: columnas }, () => ''),
        ),
    };
}