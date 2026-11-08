import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InstruccionesEvaluacion from './InstruccionesEvaluacion';
import type { InstruccionesEvaluacionEstudiante } from '../types';

const mocks = vi.hoisted(() => ({
    useInstruccionesEvaluacion: vi.fn(),
    useIniciarRendicion: vi.fn(),
    iniciarORecuperar: vi.fn(),
    push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push }),
}));

vi.mock('../hooks/useInstruccionesEvaluacion', () => ({
    useInstruccionesEvaluacion: mocks.useInstruccionesEvaluacion,
}));

vi.mock('../hooks/useIniciarRendicion', () => ({
    useIniciarRendicion: mocks.useIniciarRendicion,
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
    paralelos_rendicion: [{ paralelo_id: 7, nombre_paralelo: 'Paralelo A' }],
};

beforeEach(() => {
    mocks.useInstruccionesEvaluacion.mockReturnValue({
        instrucciones,
        cargando: false,
        error: '',
        noDisponible: false,
        recargar: vi.fn(),
    });
    mocks.iniciarORecuperar.mockReset();
    mocks.push.mockReset();
    mocks.useIniciarRendicion.mockReturnValue({
        rendicion: null,
        iniciando: false,
        error: '',
        iniciarORecuperar: mocks.iniciarORecuperar,
    });
});

afterEach(() => {
    cleanup();
});

describe('InstruccionesEvaluacion', () => {
    it('muestra la información recibida y habilita el inicio con paralelo válido', () => {
        render(<InstruccionesEvaluacion examenId={12} />);

        expect(screen.getByRole('heading', { name: 'Parcial 1' })).toBeTruthy();
        expect(screen.getByText(/Investigación Operativa/)).toBeTruthy();
        expect(screen.getByText(/Juan Pérez/)).toBeTruthy();
        expect(screen.getByText('90 minutos')).toBeTruthy();
        expect(screen.getByText('10')).toBeTruthy();
        expect(screen.getByText('Lee con atención.')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Iniciar evaluación' }),
        ).toHaveProperty('disabled', false);
        expect(screen.queryByText(/Pregunta \d+|Opción [A-Z]/i)).toBeNull();
        expect(
            screen
                .getByRole('link', { name: 'Volver a mis evaluaciones' })
                .getAttribute('href'),
        ).toBe('/estudiante/evaluaciones');
    });

    it('inicia la rendición y navega a su pantalla al recibir confirmación válida', async () => {
        mocks.iniciarORecuperar.mockResolvedValue({
            examen_id: 12,
            paralelo_id: 7,
            estado: 'en_curso',
            fecha_inicio: '2026-11-08T14:00:00.000Z',
            preguntas: [{ pregunta_id: 21, orden: 1 }],
            recuperada: false,
        });

        render(<InstruccionesEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Iniciar evaluación' }),
        );

        await waitFor(() =>
            expect(mocks.iniciarORecuperar).toHaveBeenCalledWith(12, 7),
        );
        await waitFor(() =>
            expect(mocks.push).toHaveBeenCalledWith(
                '/estudiante/evaluaciones/12/rendicion',
            ),
        );
    });

    it('no navega si el servicio no devuelve una rendición válida', async () => {
        mocks.iniciarORecuperar.mockResolvedValue({
            examen_id: 99,
            paralelo_id: 7,
            estado: 'en_curso',
            fecha_inicio: '2026-11-08T14:00:00.000Z',
            preguntas: [{ pregunta_id: 21, orden: 1 }],
            recuperada: false,
        });

        render(<InstruccionesEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Iniciar evaluación' }),
        );

        expect((await screen.findByRole('alert')).textContent).toContain(
            'El servidor no confirmó una rendición activa válida.',
        );
        expect(mocks.push).not.toHaveBeenCalled();
    });

    it('muestra carga y deshabilita el botón mientras se inicia la rendición', () => {
        mocks.useIniciarRendicion.mockReturnValue({
            rendicion: null,
            iniciando: true,
            error: '',
            iniciarORecuperar: mocks.iniciarORecuperar,
        });

        render(<InstruccionesEvaluacion examenId={12} />);

        expect(
            screen.getByRole('button', { name: 'Iniciando...' }),
        ).toHaveProperty('disabled', true);
        expect(screen.getByRole('status').textContent).toContain(
            'Iniciando o recuperando tu evaluación...',
        );
    });

    it('deshabilita el inicio si no hay paralelo de rendición', () => {
        mocks.useInstruccionesEvaluacion.mockReturnValue({
            instrucciones: {
                ...instrucciones,
                paralelos_rendicion: [],
            },
            cargando: false,
            error: '',
            noDisponible: false,
            recargar: vi.fn(),
        });

        render(<InstruccionesEvaluacion examenId={12} />);

        expect(
            screen.getByRole('button', { name: 'Iniciar evaluación' }),
        ).toHaveProperty('disabled', true);
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
