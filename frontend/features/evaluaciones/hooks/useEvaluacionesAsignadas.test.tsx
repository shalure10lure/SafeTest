import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEvaluacionesAsignadas } from './useEvaluacionesAsignadas';
import type { EvaluacionAsignada } from '../types';

const mocks = vi.hoisted(() => ({
    getAsignadasEstudiante: vi.fn(),
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        getAsignadasEstudiante: mocks.getAsignadasEstudiante,
    },
}));

function crearEvaluacion(
    sobrescribir: Partial<EvaluacionAsignada> = {},
): EvaluacionAsignada {
    return {
        examen_id: 12,
        titulo: 'Práctica 3',
        materia: 'Programación lineal',
        docente: 'Juan Pérez',
        disponible_desde: '2026-11-09T12:00:00.000Z',
        disponible_hasta: '2026-11-09T14:00:00.000Z',
        duracion_min: 45,
        total_preguntas: 6,
        estado_disponibilidad: 'proxima',
        ...sobrescribir,
    };
}

function crearSolicitudPendiente<T>() {
    let resolver!: (valor: T) => void;
    let rechazar!: (error: Error) => void;
    const promise = new Promise<T>((resolve, reject) => {
        resolver = resolve;
        rechazar = reject;
    });

    return { promise, resolver, rechazar };
}

beforeEach(() => {
    mocks.getAsignadasEstudiante.mockReset();
    mocks.getAsignadasEstudiante.mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
});

describe('useEvaluacionesAsignadas', () => {
    it('expone el estado de carga mientras consulta', async () => {
        const solicitud = crearSolicitudPendiente<EvaluacionAsignada[]>();
        mocks.getAsignadasEstudiante.mockReturnValueOnce(solicitud.promise);

        const { result } = renderHook(() => useEvaluacionesAsignadas());

        expect(result.current.cargando).toBe(true);
        expect(result.current.evaluaciones).toEqual([]);
        expect(result.current.estaVacio).toBe(false);
        expect(result.current.error).toBe('');
        await waitFor(() =>
            expect(mocks.getAsignadasEstudiante).toHaveBeenCalledTimes(1),
        );

        act(() => solicitud.resolver([crearEvaluacion()]));
        await waitFor(() => expect(result.current.cargando).toBe(false));
    });

    it('almacena las evaluaciones recibidas', async () => {
        const evaluaciones = [crearEvaluacion()];
        mocks.getAsignadasEstudiante.mockResolvedValueOnce(evaluaciones);

        const { result } = renderHook(() => useEvaluacionesAsignadas());

        await waitFor(() => expect(result.current.cargando).toBe(false));

        expect(result.current.evaluaciones).toEqual(evaluaciones);
        expect(result.current.estaVacio).toBe(false);
        expect(result.current.error).toBe('');
    });

    it('identifica una respuesta vacía', async () => {
        const { result } = renderHook(() => useEvaluacionesAsignadas());

        await waitFor(() => expect(result.current.estaVacio).toBe(true));

        expect(result.current.evaluaciones).toEqual([]);
    });

    it('conserva el estado de disponibilidad nulo', async () => {
        const evaluacion = crearEvaluacion({
            disponible_desde: null,
            disponible_hasta: null,
            estado_disponibilidad: null,
        });
        mocks.getAsignadasEstudiante.mockResolvedValueOnce([evaluacion]);

        const { result } = renderHook(() => useEvaluacionesAsignadas());

        await waitFor(() => expect(result.current.cargando).toBe(false));

        expect(result.current.evaluaciones[0].estado_disponibilidad).toBeNull();
        expect(result.current.evaluaciones[0].disponible_desde).toBeNull();
        expect(result.current.evaluaciones[0].disponible_hasta).toBeNull();
    });

    it('expone el error del servidor y permite reintentar', async () => {
        mocks.getAsignadasEstudiante
            .mockRejectedValueOnce(new Error('error del servidor'))
            .mockResolvedValueOnce([crearEvaluacion()]);

        const { result } = renderHook(() => useEvaluacionesAsignadas());

        await waitFor(() =>
            expect(result.current.error).toBe(
                'No se pudieron cargar las evaluaciones asignadas.',
            ),
        );
        expect(result.current.estaVacio).toBe(false);

        await act(async () => {
            await result.current.recargar();
        });

        expect(mocks.getAsignadasEstudiante).toHaveBeenCalledTimes(2);
        expect(result.current.error).toBe('');
        expect(result.current.evaluaciones).toEqual([crearEvaluacion()]);
    });

    it('comparte solicitudes concurrentes para evitar duplicados', async () => {
        const solicitud = crearSolicitudPendiente<EvaluacionAsignada[]>();
        mocks.getAsignadasEstudiante.mockReturnValueOnce(solicitud.promise);

        const { result } = renderHook(() => useEvaluacionesAsignadas());

        let primera!: Promise<void>;
        let segunda!: Promise<void>;
        act(() => {
            primera = result.current.recargar();
            segunda = result.current.recargar();
        });

        await waitFor(() =>
            expect(mocks.getAsignadasEstudiante).toHaveBeenCalledTimes(1),
        );

        await act(async () => {
            solicitud.resolver([crearEvaluacion()]);
            await Promise.all([primera, segunda]);
        });

        expect(primera).toBe(segunda);
        expect(result.current.evaluaciones).toEqual([crearEvaluacion()]);
    });

    it('no actualiza estado cuando la consulta termina después del desmontaje', async () => {
        const solicitud = crearSolicitudPendiente<EvaluacionAsignada[]>();
        mocks.getAsignadasEstudiante.mockReturnValueOnce(solicitud.promise);

        const { unmount } = renderHook(() => useEvaluacionesAsignadas());
        unmount();

        await act(async () => {
            solicitud.resolver([crearEvaluacion()]);
            await solicitud.promise;
        });

        expect(mocks.getAsignadasEstudiante).toHaveBeenCalledTimes(1);
    });
});
