import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MisEvaluaciones from './MisEvaluaciones';
import type { EvaluacionAsignada } from '../types';

const mocks = vi.hoisted(() => ({
    useEvaluacionesAsignadas: vi.fn(),
}));

vi.mock('../hooks/useEvaluacionesAsignadas', () => ({
    useEvaluacionesAsignadas: mocks.useEvaluacionesAsignadas,
}));

const evaluacion: EvaluacionAsignada = {
    examen_id: 24,
    titulo: 'Parcial 1',
    materia: 'Investigación Operativa',
    docente: 'Juan Pérez',
    disponible_desde: '2026-11-07T12:00:00.000Z',
    disponible_hasta: '2026-11-07T14:30:00.000Z',
    duracion_min: 90,
    total_preguntas: 10,
    estado_disponibilidad: 'disponible',
};

beforeEach(() => {
    mocks.useEvaluacionesAsignadas.mockReturnValue({
        evaluaciones: [evaluacion],
        cargando: false,
        estaVacio: false,
        error: '',
        recargar: vi.fn(),
    });
});

afterEach(() => {
    cleanup();
});

describe('MisEvaluaciones', () => {
    it('navega a las instrucciones de cada evaluación', () => {
        render(<MisEvaluaciones />);

        expect(
            screen.getByRole('link', { name: 'Ver instrucciones' }).getAttribute(
                'href',
            ),
        ).toBe('/estudiante/evaluaciones/24/instrucciones');
    });
});
