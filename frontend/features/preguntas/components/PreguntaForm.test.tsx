import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PreguntaForm from './PreguntaForm';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/materias/services/materias.service', () => ({
    materiasService: {
        getAll: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('@/features/temas/services/temas.service', () => ({
    temasService: {
        getAll: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('../services/preguntas.service', () => ({
    preguntasService: {
        getRecursos: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        agregarContenido: vi.fn(),
        actualizarContenido: vi.fn(),
        eliminarContenido: vi.fn(),
    },
}));

afterEach(() => {
    cleanup();
});

describe('PreguntaForm — semántica del puntaje', () => {
    it('etiqueta el campo como puntaje máximo del inciso', async () => {
        render(<PreguntaForm />);

        expect(
            await screen.findByLabelText('Puntaje máximo del inciso'),
        ).toBeDefined();
        expect(
            screen.getByText(
                /Se guarda en el inciso que crea este formulario/i,
            ),
        ).toBeDefined();
        expect(screen.queryByLabelText('Puntaje máximo')).toBeNull();
    });

    it('explica que el puntaje de la pregunta suma sus incisos', async () => {
        render(<PreguntaForm />);

        expect(
            await screen.findByText(
                /El puntaje de la pregunta es la suma de los puntajes máximos de sus incisos/i,
            ),
        ).toBeDefined();
    });
});
