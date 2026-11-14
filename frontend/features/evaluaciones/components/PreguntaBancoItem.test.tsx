import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PreguntaBanco } from '../types';
import PreguntaBancoItem from './PreguntaBancoItem';

const PREGUNTA: PreguntaBanco = {
    pregunta_id: 1,
    enunciado: 'Pregunta del banco',
    dificultad: null,
    tipo_respuesta: 'opcion_unica',
    puntos: 7.5,
    usada_en: 0,
    tema: { tema_id: 1, nombre_tema: 'Álgebra' },
    materia: { materia_id: 1, nombre: 'Matemática' },
};

afterEach(cleanup);

describe('PreguntaBancoItem — puntaje de la pregunta', () => {
    it('presenta el puntaje derivado con una etiqueta explícita', () => {
        render(
            <PreguntaBancoItem
                pregunta={PREGUNTA}
                seleccionada={false}
                onAlternar={vi.fn()}
            />,
        );

        const puntaje = screen.getByText(/Puntaje de la pregunta:/);
        expect(puntaje.textContent?.replace(/\s+/g, ' ')).toContain(
            'Puntaje de la pregunta: 7.5 pts',
        );
    });
});
