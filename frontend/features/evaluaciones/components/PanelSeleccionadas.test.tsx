import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PreguntaSeleccionada } from '../types';
import PanelSeleccionadas, { type ItemSeleccionado } from './PanelSeleccionadas';

function pregunta(id: number, puntos: number): PreguntaSeleccionada {
    return {
        pregunta_id: id,
        enunciado: `Pregunta ${id}`,
        dificultad: null,
        tipo_respuesta: 'opcion_unica',
        puntos,
        puntaje: null,
        usada_en: 0,
        activo: true,
        tema: { tema_id: 1, nombre_tema: 'Álgebra' },
        materia: { materia_id: 1, nombre: 'Matemática' },
    };
}

function item(id: number, puntaje: string, puntos = 5): ItemSeleccionado {
    return { id, pregunta: pregunta(id, puntos), puntaje };
}

afterEach(cleanup);

describe('PanelSeleccionadas — puntaje propio de cada pregunta', () => {
    it('suma los puntajes editados de las preguntas', () => {
        render(
            <PanelSeleccionadas
                items={[item(1, '4'), item(2, '7.5', 2)]}
                onQuitar={vi.fn()}
                onCambiarPuntaje={vi.fn()}
            />,
        );

        expect(screen.getByText(/Puntaje total:/)).toBeDefined();
        expect(screen.getByText(/11\.5 pts/)).toBeDefined();
    });

    it('notifica los cambios de puntaje', () => {
        const onCambiarPuntaje = vi.fn();

        render(
            <PanelSeleccionadas
                items={[item(1, '5')]}
                onQuitar={vi.fn()}
                onCambiarPuntaje={onCambiarPuntaje}
            />,
        );

        fireEvent.change(screen.getByLabelText('Puntaje'), {
            target: { value: '9,5' },
        });

        expect(onCambiarPuntaje).toHaveBeenCalledWith(1, '9,5');
    });

    it('no muestra un total cuando algún puntaje no es válido', () => {
        render(
            <PanelSeleccionadas
                items={[item(1, '0')]}
                onQuitar={vi.fn()}
                onCambiarPuntaje={vi.fn()}
            />,
        );

        expect(screen.getByText(/Puntaje total:/)).toBeDefined();
        expect(screen.getByText('—')).toBeDefined();
        expect(screen.getByLabelText('Puntaje').getAttribute('aria-invalid')).toBe(
            'true',
        );
    });

    it('muestra la suma frente al puntaje total cuando cabe en el límite', () => {
        render(
            <PanelSeleccionadas
                items={[item(1, '6'), item(2, '4')]}
                onQuitar={vi.fn()}
                onCambiarPuntaje={vi.fn()}
                puntajeTotal={20}
            />,
        );

        expect(screen.getByText(/10 pts/)).toBeDefined();
        expect(screen.getByText(/\/ 20 pts/)).toBeDefined();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('avisa cuando la suma supera el puntaje total configurado', () => {
        render(
            <PanelSeleccionadas
                items={[item(1, '6'), item(2, '5.5')]}
                onQuitar={vi.fn()}
                onCambiarPuntaje={vi.fn()}
                puntajeTotal={10}
            />,
        );

        expect(screen.getByRole('alert').textContent).toBe(
            'La suma de los puntajes (11.5) supera el puntaje total configurado (10).',
        );
        expect(screen.getByText(/11\.5 pts/).className).toContain('text-red-600');
    });

    it('compara sin falsos positivos por punto flotante', () => {
        render(
            <PanelSeleccionadas
                items={[item(1, '0.1'), item(2, '0.2')]}
                onQuitar={vi.fn()}
                onCambiarPuntaje={vi.fn()}
                puntajeTotal={0.3}
            />,
        );

        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.getByText(/^0\.3 pts$/)).toBeDefined();
    });

    it('describe el error del puntaje inválido y lo asocia al campo', () => {
        render(
            <PanelSeleccionadas
                items={[item(1, 'abc'), item(2, '4')]}
                onQuitar={vi.fn()}
                onCambiarPuntaje={vi.fn()}
                puntajeTotal={10}
            />,
        );

        const [campo] = screen.getAllByLabelText('Puntaje');
        const descripcion = document.getElementById(
            campo.getAttribute('aria-describedby') ?? '',
        );

        expect(campo.getAttribute('aria-invalid')).toBe('true');
        expect(descripcion?.textContent).toContain('Puntaje inválido');
        expect(screen.getByRole('alert').textContent).toContain(
            'Corrige los puntajes marcados en rojo',
        );
    });

    it('indica que falta configurar el puntaje total en el paso 3', () => {
        render(
            <PanelSeleccionadas
                items={[item(1, '100')]}
                onQuitar={vi.fn()}
                onCambiarPuntaje={vi.fn()}
            />,
        );

        expect(
            screen.getByText(/Define el puntaje total en el paso 3/),
        ).toBeDefined();
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
