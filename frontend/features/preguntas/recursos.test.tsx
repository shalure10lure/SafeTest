import { describe, expect, it } from 'vitest';

import {
    errorArchivoImagen,
    errorFormula,
    errorTabla,
    LIMITES_TABLA,
    MAX_BYTES_IMAGEN,
    MAX_CARACTERES_FORMULA,
    tablaVacia,
} from './recursos';

describe('errorArchivoImagen', () => {
    it('acepta PNG, JPG y WebP dentro del límite', () => {
        for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
            expect(errorArchivoImagen({ type, size: 1024 })).toBe('');
        }
    });

    it('rechaza SVG, otros formatos, archivos vacíos y demasiado grandes', () => {
        expect(errorArchivoImagen({ type: 'image/svg+xml', size: 10 })).toMatch(
            /Formato no permitido/,
        );
        expect(errorArchivoImagen({ type: 'application/pdf', size: 10 })).not.toBe('');
        expect(errorArchivoImagen({ type: 'image/png', size: 0 })).toMatch(/vacía/);
        expect(
            errorArchivoImagen({ type: 'image/png', size: MAX_BYTES_IMAGEN + 1 }),
        ).toMatch(/tamaño máximo/);
    });
});

describe('errorFormula', () => {
    it('acepta LaTeX y rechaza vacío o demasiado largo', () => {
        expect(errorFormula('\\frac{a}{b}')).toBe('');
        expect(errorFormula('   ')).not.toBe('');
        expect(errorFormula('x'.repeat(MAX_CARACTERES_FORMULA + 1))).not.toBe('');
    });
});

describe('errorTabla', () => {
    it('acepta una tabla con datos', () => {
        expect(
            errorTabla({ encabezado: true, filas: [['x', 'y'], ['1', '2']] }),
        ).toBe('');
    });

    it('rechaza tablas sin filas, vacías o con filas desiguales', () => {
        expect(errorTabla({ encabezado: true, filas: [] })).not.toBe('');
        expect(errorTabla(tablaVacia())).toMatch(/vacía/);
        expect(
            errorTabla({ encabezado: false, filas: [['a', 'b'], ['c']] }),
        ).toMatch(/mismo número de columnas/);
    });

    it('respeta los límites de filas, columnas y celda', () => {
        const filasDemas = Array.from({ length: LIMITES_TABLA.maxFilas + 1 }, () => ['a']);
        const columnasDemas = [
            Array.from({ length: LIMITES_TABLA.maxColumnas + 1 }, () => 'a'),
        ];
        const celdaLarga = [['x'.repeat(LIMITES_TABLA.maxCaracteresCelda + 1)]];

        expect(errorTabla({ encabezado: false, filas: filasDemas })).not.toBe('');
        expect(errorTabla({ encabezado: false, filas: columnasDemas })).not.toBe('');
        expect(errorTabla({ encabezado: false, filas: celdaLarga })).not.toBe('');
    });
});

describe('tablaVacia', () => {
    it('crea la cuadrícula pedida con encabezado', () => {
        const tabla = tablaVacia(3, 4);

        expect(tabla.encabezado).toBe(true);
        expect(tabla.filas).toHaveLength(3);
        expect(tabla.filas.every((fila) => fila.length === 4)).toBe(true);
    });
});