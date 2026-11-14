import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PreguntaBanco } from '../types';
import PreguntasSeleccionadas from './PreguntasSeleccionadas';

function pregunta(id: number, puntos: number): PreguntaBanco {
    return {
        pregunta_id: id,
        enunciado: `Pregunta ${id}`,
        dificultad: null,
        tipo_respuesta: 'opcion_unica',
        puntos,
        usada_en: 0,
        tema: { tema_id: 1, nombre_tema: 'Álgebra' },
        materia: { materia_id: 1, nombre: 'Matemática' },
    };
}

afterEach(() => {
    cleanup();
});

describe('PreguntasSeleccionadas — presentación del puntaje total', () => {
    it('suma el puntaje de las preguntas seleccionadas', () => {
        render(
            <PreguntasSeleccionadas
                preguntas={[pregunta(1, 5), pregunta(2, 10)]}
                onQuitar={vi.fn()}
            />,
        );

        expect(screen.getByText(/Puntaje total:/)).toBeDefined();
        expect(screen.getByText('15 pts')).toBeDefined();
    });
});
