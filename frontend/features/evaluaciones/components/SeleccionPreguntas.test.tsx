import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SeleccionPreguntas from './SeleccionPreguntas';
import type { BancoEvaluacion, EvaluacionDetalle, PreguntaBanco } from '../types';

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    useEvaluacion: vi.fn(),
    useBancoPreguntas: vi.fn(),
    guardarSeleccion: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push }),
}));

vi.mock('../hooks/useEvaluacion', () => ({
    useEvaluacion: mocks.useEvaluacion,
}));

vi.mock('../hooks/useBancoPreguntas', () => ({
    useBancoPreguntas: mocks.useBancoPreguntas,
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: { guardarSeleccion: mocks.guardarSeleccion },
}));

const evaluacion = {
    examen_id: 5,
    titulo: 'Parcial 1',
    instrucciones: null,
    estado: 'borrador',
    fecha: null,
    modo_seleccion: 'manual',
    orden_preguntas: 'definido',
    duracion_min: 60,
    disponible_desde: null,
    disponible_hasta: null,
    modo_entrega_nota: 'al_publicar',
    modo_asignacion: 'estudiantes',
    materia: { materia_id: 1, nombre: 'Materia A' },
    semestre: { semestre_id: 2, gestion: '2026' },
    paralelos: [],
    total_preguntas: 0,
    total_inscritos: 0,
    resultados_publicados_en: null,
    pregunta_ids: [],
    preguntas: [],
    criterios: [],
} satisfies EvaluacionDetalle;

const pregunta = (preguntaId: number, enunciado: string, temaId: number, nombreTema: string): PreguntaBanco => ({
    pregunta_id: preguntaId,
    enunciado,
    dificultad: 'media',
    tipo_respuesta: 'opcion_unica',
    puntos: 2,
    usada_en: 0,
    tema: { tema_id: temaId, nombre_tema: nombreTema },
    materia: { materia_id: 1, nombre: 'Materia A' },
});

const banco: BancoEvaluacion = {
    materia_id: 1,
    total_banco: 9,
    preguntas: [
        pregunta(10, 'Límites de una función', 2, 'Cálculo'),
        pregunta(11, 'Derivadas básicas', 3, 'Derivación'),
    ],
    temas: [
        { tema_id: 2, nombre_tema: 'Cálculo', disponibles: 1 },
        { tema_id: 3, nombre_tema: 'Derivación', disponibles: 1 },
    ],
};

function preparar(bancoPreguntas: BancoEvaluacion | null = banco) {
    mocks.useEvaluacion.mockReturnValue({
        evaluacion,
        cargando: false,
        error: '',
    });
    mocks.useBancoPreguntas.mockReturnValue({
        banco: bancoPreguntas,
        conocidas: Object.fromEntries(
            (bancoPreguntas?.preguntas ?? []).map((item) => [item.pregunta_id, { ...item, activo: true }]),
        ),
        cargando: false,
        error: '',
    });
}

describe('SeleccionPreguntas', () => {
    beforeEach(() => {
        mocks.push.mockReset();
        mocks.useEvaluacion.mockReset();
        mocks.useBancoPreguntas.mockReset();
        mocks.guardarSeleccion.mockReset().mockResolvedValue({});
        preparar();
    });

    afterEach(cleanup);

    it('carga el banco de la materia de la evaluación, filtra por tema y búsqueda y cuenta el banco visible', () => {
        render(<SeleccionPreguntas examenId={5} />);

        expect(mocks.useBancoPreguntas).toHaveBeenCalledWith(5, 1, []);
        expect(screen.getByLabelText('Filtrar por tema')).toBeTruthy();
        expect(screen.getByText('2 de 2 preguntas en tu banco')).toBeTruthy();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar en el banco' }), {
            target: { value: 'limite' },
        });

        expect(screen.getByText('Límites de una función')).toBeTruthy();
        expect(screen.queryByText('Derivadas básicas')).toBeNull();

        fireEvent.change(screen.getByLabelText('Filtrar por tema'), {
            target: { value: '3' },
        });

        expect(screen.getByText('Ninguna pregunta coincide con la búsqueda.')).toBeTruthy();
        expect(screen.getByText('0 de 2 preguntas en tu banco')).toBeTruthy();
    });

    it('evita guardar una selección vacía y envía el orden seleccionado', async () => {
        render(<SeleccionPreguntas examenId={5} />);

        fireEvent.click(screen.getByRole('button', { name: 'Siguiente →' }));
        expect(screen.getByRole('alert').textContent).toContain('Selecciona al menos una pregunta.');
        expect(mocks.guardarSeleccion).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('Límites de una función'));
        fireEvent.click(screen.getByText('Derivadas básicas'));
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente (2) →' }));

        await waitFor(() => {
            expect(mocks.guardarSeleccion).toHaveBeenCalledWith(5, {
                modo_seleccion: 'manual',
                pregunta_ids: [10, 11],
            });
        });
        expect(mocks.push).toHaveBeenCalledTimes(1);
    });

    it('muestra el error del backend si falla el guardado', async () => {
        mocks.guardarSeleccion.mockRejectedValue({
            isAxiosError: true,
            response: {
                data: { message: 'La evaluación ya no está en borrador.' },
            },
        });
        render(<SeleccionPreguntas examenId={5} />);

        fireEvent.click(screen.getByText('Límites de una función'));
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente (1) →' }));

        expect(await screen.findByText('La evaluación ya no está en borrador.')).toBeTruthy();
        expect(mocks.push).not.toHaveBeenCalled();
    });
});
