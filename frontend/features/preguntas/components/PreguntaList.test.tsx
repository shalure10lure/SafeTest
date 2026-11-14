import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Pregunta } from '../types';
import PreguntaList from './PreguntaList';

const PREGUNTA: Pregunta = {
    pregunta_id: 1,
    enunciado: '¿Cuánto es 2 + 2?',
    tema_id: 1,
    dificultad: 'facil',
    origen: 'manual',
    activo: true,
    creado_en: '2026-11-01T00:00:00.000Z',
    tipo_respuesta: 'opcion_unica',
    puntos: 5,
    tema: { tema_id: 1, nombre_tema: 'Álgebra' },
    materia: { materia_id: 1, nombre: 'Matemática' },
};

afterEach(() => {
    cleanup();
});

describe('PreguntaList — presentación del puntaje de la pregunta', () => {
    it('muestra el total de la pregunta como suma de sus incisos', () => {
        render(
            <PreguntaList
                preguntas={[PREGUNTA]}
                isLoading={false}
                error={null}
                hayFiltros={false}
                onLimpiarFiltros={vi.fn()}
                onEliminar={vi.fn()}
            />,
        );

        expect(screen.getByText(/Puntaje de la pregunta:/)).toBeDefined();
        expect(screen.getByText('5 pts')).toBeDefined();
        expect(
            screen.getByTitle('Suma de los puntajes máximos de sus incisos'),
        ).toBeDefined();
    });
});
