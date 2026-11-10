import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecursoPregunta } from '@/features/preguntas/types';

import { useRecursosRendicion } from './useRecursosRendicion';

const mocks = vi.hoisted(() => ({
    getRecursosPreguntaRendicion: vi.fn(),
    getImagenRecursoRendicion: vi.fn(),
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        getRecursosPreguntaRendicion: mocks.getRecursosPreguntaRendicion,
        getImagenRecursoRendicion: mocks.getImagenRecursoRendicion,
    },
}));

const formula: RecursoPregunta = {
    recurso: 'f1',
    tipo: 'formula',
    contenido: 'x^2',
    mime_type: null,
    nombre_original: null,
    creado_en: '2026-11-09T12:00:00.000Z',
};

beforeEach(() => {
    mocks.getRecursosPreguntaRendicion.mockReset();
    mocks.getImagenRecursoRendicion.mockReset();
    mocks.getRecursosPreguntaRendicion.mockResolvedValue([formula]);
});

afterEach(() => cleanup());

describe('useRecursosRendicion', () => {
    it('carga los recursos de la pregunta indicada', async () => {
        const { result } = renderHook(() => useRecursosRendicion(12, 21));

        expect(result.current.cargando).toBe(true);
        await waitFor(() => expect(result.current.cargando).toBe(false));

        expect(mocks.getRecursosPreguntaRendicion).toHaveBeenCalledWith(12, 21);
        expect(result.current.recursos).toEqual([formula]);
        expect(result.current.error).toBe(false);
    });

    it('marca error cuando la consulta falla', async () => {
        mocks.getRecursosPreguntaRendicion.mockRejectedValue(new Error('x'));

        const { result } = renderHook(() => useRecursosRendicion(12, 21));
        await waitFor(() => expect(result.current.error).toBe(true));

        expect(result.current.recursos).toEqual([]);
    });

    it('no muestra los recursos de la pregunta anterior al cambiar de pregunta', async () => {
        const { result, rerender } = renderHook(
            ({ preguntaId }) => useRecursosRendicion(12, preguntaId),
            { initialProps: { preguntaId: 21 } },
        );
        await waitFor(() => expect(result.current.recursos).toHaveLength(1));

        mocks.getRecursosPreguntaRendicion.mockReturnValue(
            new Promise(() => undefined),
        );
        rerender({ preguntaId: 22 });

        expect(result.current.cargando).toBe(true);
        expect(result.current.recursos).toEqual([]);
    });

    it('descarga las imágenes con el examen y la pregunta actuales', async () => {
        const blob = new Blob(['x']);
        mocks.getImagenRecursoRendicion.mockResolvedValue(blob);
        const { result } = renderHook(() => useRecursosRendicion(12, 21));

        await expect(result.current.cargarImagen('img.png')).resolves.toBe(
            blob,
        );
        expect(mocks.getImagenRecursoRendicion).toHaveBeenCalledWith(
            12,
            21,
            'img.png',
        );
    });
});
