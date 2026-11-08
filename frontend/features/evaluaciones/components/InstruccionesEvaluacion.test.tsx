import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InstruccionesEvaluacion from './InstruccionesEvaluacion';
import type { InstruccionesEvaluacionEstudiante } from '../types';

const mocks = vi.hoisted(() => ({
    useInstruccionesEvaluacion: vi.fn(),
}));

vi.mock('../hooks/useInstruccionesEvaluacion', () => ({
    useInstruccionesEvaluacion: mocks.useInstruccionesEvaluacion,
}));

const instrucciones: InstruccionesEvaluacionEstudiante = {
    examen_id: 12,
    titulo: 'Parcial 1',
    instrucciones: 'Lee con atención.',
    materia: 'Investigación Operativa',
    docente: 'Juan Pérez',
    duracion_min: 90,
    disponible_desde: '2026-11-07T12:00:00.000Z',
    disponible_hasta: '2026-11-07T14:30:00.000Z',
    total_preguntas: 10,
    estado_disponibilidad: 'disponible',
};

beforeEach(() => {
    mocks.useInstruccionesEvaluacion.mockReturnValue({
        instrucciones,
        cargando: false,
        error: '',
        noDisponible: false,
        recargar: vi.fn(),
    });
});

afterEach(() => {
    cleanup();
});

describe('InstruccionesEvaluacion', () => {
    it('muestra la información recibida sin preguntas y sin habilitar la rendición', () => {
        render(<InstruccionesEvaluacion examenId={12} />);

        expect(
            screen.getByRole('heading', { name: 'Parcial 1' }),
        ).toBeTruthy();
        expect(screen.getByText(/Investigación Operativa/)).toBeTruthy();
        expect(screen.getByText(/Juan Pérez/)).toBeTruthy();
        expect(screen.getByText('90 minutos')).toBeTruthy();
        expect(screen.getByText('10')).toBeTruthy();
        expect(screen.getByText('Lee con atención.')).toBeTruthy();
        expect(
            screen.getByRole('button', {
                name: 'Iniciar evaluación (próximamente)',
            }),
        ).toHaveProperty('disabled', true);
        expect(
            screen.queryByText(/Pregunta \d+|Opción [A-Z]/i),
        ).toBeNull();
        expect(
            screen
                .getByRole('link', { name: 'Volver a mis evaluaciones' })
                .getAttribute('href'),
        ).toBe('/estudiante/evaluaciones');
    });

    it('muestra un mensaje neutro cuando el acceso no está disponible', () => {
        mocks.useInstruccionesEvaluacion.mockReturnValue({
            instrucciones: null,
            cargando: false,
            error: 'La evaluación no está disponible.',
            noDisponible: true,
            recargar: vi.fn(),
        });

        render(<InstruccionesEvaluacion examenId={12} />);

        expect(
            screen.getByRole('heading', {
                name: 'Instrucciones no disponibles',
            }),
        ).toBeTruthy();
        expect(
            screen.getByText(/podría no estar asignada a tu cuenta/),
        ).toBeTruthy();
    });
});
