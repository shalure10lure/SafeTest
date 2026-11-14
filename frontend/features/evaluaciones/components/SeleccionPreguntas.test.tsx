import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
    BancoEvaluacion,
    EvaluacionDetalle,
    PreguntaSeleccionada,
} from '../types';
import SeleccionPreguntas from './SeleccionPreguntas';

const mocks = vi.hoisted(() => ({
    useEvaluacion: vi.fn(),
    useBancoPreguntas: vi.fn(),
    useMaterias: vi.fn(),
    guardarSeleccion: vi.fn(),
    push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/features/materias/hooks/useMaterias', () => ({
    useMaterias: mocks.useMaterias,
}));

vi.mock('../hooks/useEvaluacion', () => ({
    useEvaluacion: mocks.useEvaluacion,
}));

vi.mock('../hooks/useBancoPreguntas', () => ({
    useBancoPreguntas: mocks.useBancoPreguntas,
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        guardarSeleccion: mocks.guardarSeleccion,
    },
}));

function preguntaSeleccionada(
    id: number,
    puntaje: number,
): PreguntaSeleccionada {
    return {
        pregunta_id: id,
        enunciado: `Pregunta ${id}`,
        dificultad: null,
        tipo_respuesta: 'opcion_unica',
        puntos: puntaje,
        puntaje,
        usada_en: 0,
        activo: true,
        tema: { tema_id: 1, nombre_tema: 'Álgebra' },
        materia: { materia_id: 1, nombre: 'Matemática' },
    };
}

function evaluacion(puntajeTotal: number | null): EvaluacionDetalle {
    const preguntas = [preguntaSeleccionada(1, 6), preguntaSeleccionada(2, 5)];

    return {
        examen_id: 24,
        titulo: 'Parcial 1',
        instrucciones: null,
        estado: 'borrador',
        fecha: null,
        modo_seleccion: 'manual',
        orden_preguntas: 'definido',
        duracion_min: null,
        puntaje_total: puntajeTotal,
        disponible_desde: null,
        disponible_hasta: null,
        modo_entrega_nota: 'al_publicar',
        modo_asignacion: 'paralelos',
        materia: { materia_id: 1, nombre: 'Matemática' },
        semestre: { semestre_id: 1, gestion: '2026' },
        paralelos: [],
        total_preguntas: preguntas.length,
        total_inscritos: 0,
        resultados_publicados_en: null,
        pregunta_ids: preguntas.map((pregunta) => pregunta.pregunta_id),
        preguntas,
        criterios: [],
    };
}

function banco(): BancoEvaluacion {
    return {
        materia_id: 1,
        total_banco: 2,
        preguntas: [],
        temas: [],
    };
}

beforeEach(() => {
    mocks.push.mockReset();
    mocks.guardarSeleccion.mockReset().mockResolvedValue({
        modo_seleccion: 'manual',
        pregunta_ids: [1, 2],
        criterios: [],
        total_preguntas: 2,
    });
    mocks.useMaterias.mockReturnValue({
        materias: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    });
    mocks.useBancoPreguntas.mockReturnValue({
        banco: banco(),
        conocidas: {
            1: preguntaSeleccionada(1, 6),
            2: preguntaSeleccionada(2, 5),
        },
        cargando: false,
        error: '',
        recargar: vi.fn(),
    });
});

afterEach(cleanup);

describe('SeleccionPreguntas — validación de la suma de puntajes', () => {
    it('bloquea el guardado cuando la suma supera el puntaje total', async () => {
        mocks.useEvaluacion.mockReturnValue({
            evaluacion: evaluacion(10),
            cargando: false,
            error: '',
            recargar: vi.fn(),
        });

        render(<SeleccionPreguntas examenId={24} />);

        fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));

        expect(
            await screen.findByText(
                /La suma de los puntajes \(11 pts\) no puede superar el puntaje total configurado \(10 pts\)\./,
            ),
        ).toBeDefined();
        expect(mocks.guardarSeleccion).not.toHaveBeenCalled();
        expect(mocks.push).not.toHaveBeenCalled();
    });

    it('guarda los puntajes cuando la suma cabe en el total', async () => {
        mocks.useEvaluacion.mockReturnValue({
            evaluacion: evaluacion(11),
            cargando: false,
            error: '',
            recargar: vi.fn(),
        });

        render(<SeleccionPreguntas examenId={24} />);

        fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));

        await waitFor(() => {
            expect(mocks.guardarSeleccion).toHaveBeenCalledWith(24, {
                modo_seleccion: 'manual',
                pregunta_ids: [1, 2],
                puntajes: [
                    { pregunta_id: 1, puntaje: 6 },
                    { pregunta_id: 2, puntaje: 5 },
                ],
            });
        });
        expect(mocks.push).toHaveBeenCalledWith(
            '/docente/evaluaciones/24/configuracion',
        );
    });
});
