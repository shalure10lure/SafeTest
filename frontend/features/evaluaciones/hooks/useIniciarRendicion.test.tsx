import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIniciarRendicion } from './useIniciarRendicion';
import type { RendicionEstudiante } from '../types';

const mocks = vi.hoisted(() => ({
    iniciarORecuperarRendicion: vi.fn(),
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        iniciarORecuperarRendicion: mocks.iniciarORecuperarRendicion,
    },
}));

const rendicion: RendicionEstudiante = {
    examen_id: 12,
    paralelo_id: 7,
    estado: 'en_curso',
    fecha_inicio: '2026-11-08T14:00:00.000Z',
    preguntas: [{ pregunta_id: 21, orden: 1 }],
    recuperada: false,
};

beforeEach(() => {
    mocks.iniciarORecuperarRendicion.mockReset();
    mocks.iniciarORecuperarRendicion.mockResolvedValue(rendicion);
});

afterEach(() => cleanup());

describe('useIniciarRendicion', () => {
    it('expone la carga y almacena la rendición confirmada', async () => {
        let resolver!: (resultado: RendicionEstudiante) => void;
        mocks.iniciarORecuperarRendicion.mockReturnValueOnce(
            new Promise((resolve) => {
                resolver = resolve;
            }),
        );

        const { result } = renderHook(() => useIniciarRendicion());

        let solicitud!: Promise<RendicionEstudiante | null>;
        act(() => {
            solicitud = result.current.iniciarORecuperar(12, 7);
        });

        expect(result.current.iniciando).toBe(true);
        await waitFor(() =>
            expect(mocks.iniciarORecuperarRendicion).toHaveBeenCalledWith(
                12,
                7,
            ),
        );

        await act(async () => {
            resolver(rendicion);
            await solicitud;
        });

        expect(result.current.iniciando).toBe(false);
        expect(result.current.rendicion).toEqual(rendicion);
        expect(result.current.error).toBe('');
    });

    it('presenta el error devuelto por el servicio', async () => {
        mocks.iniciarORecuperarRendicion.mockRejectedValueOnce(
            new Error('Error del servidor'),
        );

        const { result } = renderHook(() => useIniciarRendicion());

        await act(async () => {
            await result.current.iniciarORecuperar(12, 7);
        });

        expect(result.current.rendicion).toBeNull();
        expect(result.current.error).toBe(
            'No se pudo iniciar la evaluación.',
        );
        expect(result.current.iniciando).toBe(false);
    });

    it('evita solicitudes duplicadas mientras hay una petición activa', async () => {
        let resolver!: (resultado: RendicionEstudiante) => void;
        mocks.iniciarORecuperarRendicion.mockReturnValueOnce(
            new Promise((resolve) => {
                resolver = resolve;
            }),
        );

        const { result } = renderHook(() => useIniciarRendicion());
        let primera!: Promise<RendicionEstudiante | null>;
        let segunda!: Promise<RendicionEstudiante | null>;

        act(() => {
            primera = result.current.iniciarORecuperar(12, 7);
            segunda = result.current.iniciarORecuperar(12, 7);
        });

        await waitFor(() =>
            expect(mocks.iniciarORecuperarRendicion).toHaveBeenCalledTimes(1),
        );
        expect(await segunda).toBeNull();

        await act(async () => {
            resolver(rendicion);
            await primera;
        });
    });
});
