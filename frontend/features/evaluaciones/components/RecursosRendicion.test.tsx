import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecursoPregunta } from '@/features/preguntas/types';

import RecursosRendicion from './RecursosRendicion';

const mocks = vi.hoisted(() => ({
    getRecursosPreguntaRendicion: vi.fn(),
    getImagenRecursoRendicion: vi.fn(),
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        getRecursosPreguntaRendicion: mocks.getRecursosPreguntaRendicion,
        getImagenRecursoRendicion: mocks.getImagenRecursoRendicion,
    },
}));

// El visor de imágenes del docente no debe usarse en la vista del estudiante.
vi.mock('@/features/preguntas/services/preguntas.service', () => ({
    preguntasService: { getImagen: vi.fn() },
}));

function recurso(datos: Partial<RecursoPregunta>): RecursoPregunta {
    return {
        recurso: 'r1',
        tipo: 'formula',
        contenido: null,
        mime_type: null,
        nombre_original: null,
        creado_en: '2026-11-09T12:00:00.000Z',
        ...datos,
    };
}

beforeEach(() => {
    mocks.getRecursosPreguntaRendicion.mockReset();
    mocks.getImagenRecursoRendicion.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: vi.fn(() => 'blob:imagen-prueba'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: vi.fn(),
    });
});

afterEach(() => cleanup());

describe('RecursosRendicion', () => {
    it('muestra la tabla y la fórmula de la pregunta', async () => {
        mocks.getRecursosPreguntaRendicion.mockResolvedValue([
            recurso({ recurso: 'f1', tipo: 'formula', contenido: 'x^2' }),
            recurso({
                recurso: 't1',
                tipo: 'tabla',
                contenido: {
                    encabezado: true,
                    filas: [
                        ['Elemento', 'Símbolo'],
                        ['Hidrógeno', 'H'],
                    ],
                },
            }),
        ]);

        const { container } = render(
            <RecursosRendicion examenId={12} preguntaId={21} />,
        );

        expect(await screen.findByText('Hidrógeno')).toBeTruthy();
        expect(
            screen.getByRole('columnheader', { name: 'Símbolo' }),
        ).toBeTruthy();
        expect(container.querySelector('.katex')).not.toBeNull();
        expect(mocks.getRecursosPreguntaRendicion).toHaveBeenCalledWith(12, 21);
    });

    it('descarga la imagen con el endpoint del estudiante y la muestra', async () => {
        mocks.getRecursosPreguntaRendicion.mockResolvedValue([
            recurso({
                recurso: 'img1.png',
                tipo: 'imagen',
                mime_type: 'image/png',
                nombre_original: 'esquema.png',
            }),
        ]);
        mocks.getImagenRecursoRendicion.mockResolvedValue(new Blob(['x']));

        render(<RecursosRendicion examenId={12} preguntaId={21} />);

        const imagen = await screen.findByAltText('esquema.png');
        expect(imagen.getAttribute('src')).toBe('blob:imagen-prueba');
        expect(mocks.getImagenRecursoRendicion).toHaveBeenCalledTimes(1);
        expect(mocks.getImagenRecursoRendicion).toHaveBeenCalledWith(
            12,
            21,
            'img1.png',
        );
    });

    it('no muestra nada cuando la pregunta no tiene recursos', async () => {
        mocks.getRecursosPreguntaRendicion.mockResolvedValue([]);

        const { container } = render(
            <RecursosRendicion examenId={12} preguntaId={21} />,
        );

        await waitFor(() =>
            expect(mocks.getRecursosPreguntaRendicion).toHaveBeenCalled(),
        );
        expect(container.textContent).toBe('');
    });

    it('avisa si no se pudo cargar el contenido sin romper la pregunta', async () => {
        mocks.getRecursosPreguntaRendicion.mockRejectedValue(new Error('x'));

        render(<RecursosRendicion examenId={12} preguntaId={21} />);

        expect(
            await screen.findByRole('alert'),
        ).toHaveProperty(
            'textContent',
            'No se pudo cargar el contenido adicional de esta pregunta.',
        );
    });
});
