import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInstruccionesEvaluacion } from './useInstruccionesEvaluacion';
import type { InstruccionesEvaluacionEstudiante } from '../types';

const mocks = vi.hoisted(() => ({
    getInstruccionesEstudiante: vi.fn(),
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        getInstruccionesEstudiante: mocks.getInstruccionesEstudiante,
    },
}));

function crearInstrucciones(
    cambios: Partial<InstruccionesEvaluacionEstudiante> = {},
): InstruccionesEvaluacionEstudiante {
    return {
        examen_id: 12,
        titulo: 'Parcial 1',
        instrucciones: 'Lee atentamente.',
        materia: 'Investigación Operativa',
        docente: 'Juan Pérez',
        duracion_min: 90,
        disponible_desde: '2026-11-07T12:00:00.000Z',
        disponible_hasta: '2026-11-07T14:30:00.000Z',
        total_preguntas: 10,
        estado_disponibilidad: 'disponible',
        ...cambios,
    };
}

function errorHttp(status: number) {
    return Object.assign(new Error('respuesta HTTP'), {
        isAxiosError: true,
        response: { status, data: { message: 'No disponible' } },
    });
}

beforeEach(() => {
    mocks.getInstruccionesEstudiante.mockReset();
    mocks.getInstruccionesEstudiante.mockResolvedValue(crearInstrucciones());
});

afterEach(() => {
    cleanup();
});

describe('useInstruccionesEvaluacion', () => {
    it('carga las instrucciones para el identificador solicitado', async () => {
        const { result } = renderHook(() => useInstruccionesEvaluacion(12));

        expect(result.current.cargando).toBe(true);

        await waitFor(() => expect(result.current.cargando).toBe(false));

        expect(mocks.getInstruccionesEstudiante).toHaveBeenCalledExactlyOnceWith(
            12,
        );
        expect(result.current.instrucciones).toEqual(crearInstrucciones());
        expect(result.current.error).toBe('');
    });

    it('representa como no disponible una respuesta 403 o 404', async () => {
        mocks.getInstruccionesEstudiante.mockRejectedValueOnce(errorHttp(404));

        const { result } = renderHook(() => useInstruccionesEvaluacion(12));

        await waitFor(() => expect(result.current.noDisponible).toBe(true));

        expect(result.current.instrucciones).toBeNull();
        expect(result.current.error).toBe('No disponible');
    });

    it('permite reintentar un error del servidor', async () => {
        mocks.getInstruccionesEstudiante
            .mockRejectedValueOnce(new Error('Error'))
            .mockResolvedValueOnce(crearInstrucciones());

        const { result } = renderHook(() => useInstruccionesEvaluacion(12));

        await waitFor(() => expect(result.current.error).not.toBe(''));
        expect(result.current.noDisponible).toBe(false);

        await act(async () => {
            await result.current.recargar();
        });

        expect(mocks.getInstruccionesEstudiante).toHaveBeenCalledTimes(2);
        expect(result.current.instrucciones).toEqual(crearInstrucciones());
        expect(result.current.error).toBe('');
    });

    it('evita solicitudes duplicadas concurrentes para la misma evaluación', async () => {
        let resolver!: (datos: InstruccionesEvaluacionEstudiante) => void;
        const solicitud = new Promise<InstruccionesEvaluacionEstudiante>(
            (resolve) => {
                resolver = resolve;
            },
        );
        mocks.getInstruccionesEstudiante.mockReturnValueOnce(solicitud);

        const { result } = renderHook(() => useInstruccionesEvaluacion(12));

        await waitFor(() =>
            expect(mocks.getInstruccionesEstudiante).toHaveBeenCalledTimes(1),
        );

        let primera!: Promise<void>;
        let segunda!: Promise<void>;
        act(() => {
            primera = result.current.recargar();
            segunda = result.current.recargar();
        });

        expect(primera).toBe(segunda);
        expect(mocks.getInstruccionesEstudiante).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolver(crearInstrucciones());
            await primera;
        });

        expect(result.current.instrucciones).toEqual(crearInstrucciones());
    });

    it('no actualiza estado al desmontar durante la consulta', async () => {
        let resolver!: (datos: InstruccionesEvaluacionEstudiante) => void;
        const solicitud = new Promise<InstruccionesEvaluacionEstudiante>(
            (resolve) => {
                resolver = resolve;
            },
        );
        mocks.getInstruccionesEstudiante.mockReturnValueOnce(solicitud);

        const { unmount } = renderHook(() => useInstruccionesEvaluacion(12));

        await waitFor(() =>
            expect(mocks.getInstruccionesEstudiante).toHaveBeenCalledTimes(1),
        );
        unmount();

        await act(async () => {
            resolver(crearInstrucciones());
            await solicitud;
        });

        expect(mocks.getInstruccionesEstudiante).toHaveBeenCalledTimes(1);
    });
});
