import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RecursosPreguntaEstado } from '../hooks/useRecursosPregunta';
import type { RecursoPregunta } from '../types';

import RecursosEditor from './RecursosEditor';

function crearEstado(
    guardados: RecursoPregunta[] = [],
): RecursosPreguntaEstado {
    return {
        guardados,
        pendientes: [],
        cargando: false,
        ocupado: false,
        error: '',
        lleno: false,
        limpiarError: vi.fn(),
        agregarImagen: vi.fn(),
        agregarFormula: vi.fn(),
        agregarTabla: vi.fn(),
        quitarGuardado: vi.fn(),
        quitarPendiente: vi.fn(),
        actualizarFormula: vi.fn(),
        actualizarTabla: vi.fn(),
        reemplazarImagen: vi.fn(),
        subirPendientes: vi.fn(),
    };
}

const formulaGuardada: RecursoPregunta = {
    recurso: 'recurso-1',
    tipo: 'formula',
    contenido: 'x^2 + y^2',
    mime_type: null,
    nombre_original: null,
    creado_en: '2026-01-01T00:00:00.000Z',
};

function obtenerCampoFormula(): HTMLTextAreaElement {
    return screen.getByLabelText('Fórmula en LaTeX') as HTMLTextAreaElement;
}

afterEach(() => {
    cleanup();
});

describe('RecursosEditor — fórmulas', () => {
    it('abre el campo vacío al agregar una fórmula, sin texto de ejemplo', () => {
        render(
            <RecursosEditor
                recursos={crearEstado()}
                enEdicion={false}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Fórmula' }),
        );

        const campo = obtenerCampoFormula();

        expect(campo.value).toBe('');
        expect(campo.getAttribute('placeholder')).toBeNull();

        // La instrucción de la vista previa se conserva.
        expect(
            screen.getByText(
                'La vista previa de la fórmula aparecerá aquí.',
            ),
        ).toBeTruthy();
    });

    it('permite escribir una fórmula y ver su representación', () => {
        const { container } = render(
            <RecursosEditor
                recursos={crearEstado()}
                enEdicion={false}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Fórmula' }),
        );

        fireEvent.change(obtenerCampoFormula(), {
            target: { value: '\\frac{a}{b}' },
        });

        expect(obtenerCampoFormula().value).toBe('\\frac{a}{b}');
        expect(container.querySelector('.katex')).not.toBeNull();

        expect(
            screen.queryByText(
                'La vista previa de la fórmula aparecerá aquí.',
            ),
        ).toBeNull();
    });

    it('al editar una fórmula existente carga su contenido', () => {
        render(
            <RecursosEditor
                recursos={crearEstado([formulaGuardada])}
                enEdicion
                preguntaId={10}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Editar: Fórmula' }),
        );

        const campo = obtenerCampoFormula();

        expect(campo.value).toBe('x^2 + y^2');
        expect(campo.getAttribute('placeholder')).toBeNull();
    });
});
