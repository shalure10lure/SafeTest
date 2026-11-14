import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ResumenPublicacion from './ResumenPublicacion';
import type { ResumenEvaluacion, ResumenPuntajes } from '../types';

const mocks = vi.hoisted(() => ({
    getResumen: vi.fn(),
    push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push }),
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        getResumen: mocks.getResumen,
        publicar: vi.fn(),
        publicarRespuestas: vi.fn(),
    },
}));

function puntajes(
    sobrescribir: Partial<ResumenPuntajes> = {},
): ResumenPuntajes {
    return {
        origen: 'seleccion',
        disponible: true,
        puntaje_total: 15,
        temas: [
            {
                tema_id: 1,
                nombre_tema: 'Álgebra',
                cantidad_candidatas: 2,
                cantidad_seleccionada: 2,
                puntaje_maximo: 10,
                garantizado: true,
                motivo: null,
                detalle: null,
            },
            {
                tema_id: 2,
                nombre_tema: 'Geometría',
                cantidad_candidatas: 1,
                cantidad_seleccionada: 1,
                puntaje_maximo: 5,
                garantizado: true,
                motivo: null,
                detalle: null,
            },
        ],
        preguntas: [],
        preguntas_sin_puntaje: [],
        motivo: null,
        detalle: null,
        ...sobrescribir,
    };
}

function resumen(sobrescribir: Partial<ResumenEvaluacion> = {}): ResumenEvaluacion {
    return {
        examen_id: 24,
        titulo: 'Parcial 1',
        instrucciones: null,
        estado: 'borrador',
        fecha: null,
        modo_seleccion: 'manual',
        orden_preguntas: 'definido',
        duracion_min: 90,
        disponible_desde: '2026-11-07T12:00:00.000Z',
        disponible_hasta: '2026-11-07T14:30:00.000Z',
        modo_entrega_nota: 'al_publicar',
        modo_asignacion: 'paralelos',
        materia: { materia_id: 1, nombre: 'Investigación Operativa' },
        semestre: { semestre_id: 1, gestion: '2026-II' },
        paralelos: [{ paralelo_id: 10, nombre_paralelo: 'A' }],
        total_preguntas: 3,
        total_inscritos: 0,
        resultados_publicados_en: null,
        pregunta_ids: [1, 2, 3],
        preguntas: [],
        criterios: [],
        estudiantes_asignados: [],
        total_estudiantes: 0,
        puntajes: puntajes(),
        ...sobrescribir,
    };
}

beforeEach(() => {
    mocks.getResumen.mockReset();
    mocks.push.mockReset();
});

afterEach(() => {
    cleanup();
});

async function renderizar(datos: ResumenEvaluacion) {
    mocks.getResumen.mockResolvedValue(datos);

    render(<ResumenPublicacion examenId={datos.examen_id} />);

    await screen.findByRole('heading', { name: /Resumen de la evaluación/ });
}

describe('ResumenPublicacion — puntajes de evaluaciones manuales', () => {
    it('muestra el puntaje total derivado y la cantidad de preguntas', async () => {
        await renderizar(resumen());

        expect(screen.getByText('Puntaje total')).toBeDefined();
        // Aparece en la fila del resumen y en el total de la distribución.
        expect(screen.getAllByText('15 pts')).toHaveLength(2);
        expect(screen.getByText('3 preguntas')).toBeDefined();
    });

    it('muestra la distribución de puntos por tema', async () => {
        await renderizar(resumen());

        expect(screen.getByText('Distribución de puntajes')).toBeDefined();
        expect(screen.getByText('Álgebra')).toBeDefined();
        expect(screen.getByText('2 preguntas · 10 pts')).toBeDefined();
        expect(screen.getByText('Geometría')).toBeDefined();
        expect(screen.getByText('1 pregunta · 5 pts')).toBeDefined();
        expect(screen.getAllByText('15 pts')).toHaveLength(2);
    });

    it('informa las preguntas sin puntaje válido y su motivo', async () => {
        await renderizar(
            resumen({
                total_preguntas: 4,
                puntajes: puntajes({
                    preguntas_sin_puntaje: [
                        {
                            pregunta_id: 4,
                            enunciado: 'Pregunta sin incisos',
                            motivo: 'sin_incisos',
                        },
                    ],
                }),
            }),
        );

        const alerta = await screen.findByRole('alert');
        expect(alerta.textContent).toContain('Preguntas sin puntaje válido');
        expect(alerta.textContent).toContain('Pregunta sin incisos');
        expect(alerta.textContent).toContain('No tiene incisos.');
        expect(screen.getByText('1 pregunta')).toBeDefined();
    });
});

describe('ResumenPublicacion — borradores aleatorios', () => {
    function resumenAleatorioBorrador(
        sobrescribir: Partial<ResumenPuntajes> = {},
    ): ResumenEvaluacion {
        return resumen({
            modo_seleccion: 'aleatorio',
            total_preguntas: 2,
            pregunta_ids: [],
            criterios: [{ tema_id: 1, nombre_tema: 'Álgebra', cantidad: 2 }],
            puntajes: puntajes({
                origen: 'calculo_previo',
                puntaje_total: 10,
                temas: [
                    {
                        tema_id: 1,
                        nombre_tema: 'Álgebra',
                        cantidad_candidatas: 4,
                        cantidad_seleccionada: 2,
                        puntaje_maximo: 10,
                        garantizado: true,
                        motivo: null,
                        detalle: null,
                    },
                ],
                ...sobrescribir,
            }),
        });
    }

    it('muestra candidatas, seleccionadas y el puntaje garantizado', async () => {
        await renderizar(resumenAleatorioBorrador());

        expect(screen.getByText('Puntaje máximo garantizado')).toBeDefined();
        expect(screen.getAllByText('10 pts')).toHaveLength(2);
        expect(screen.getByText('2 de 4 preguntas · 10 pts')).toBeDefined();
        expect(
            screen.queryByText('No determinable antes de iniciar'),
        ).toBeNull();
    });

    it('advierte y no muestra un total cuando no puede garantizarse', async () => {
        const detalle =
            'El tema "Álgebra" contiene preguntas con puntajes máximos diferentes; solo se puede seleccionar una parte de un pool con puntajes uniformes.';

        await renderizar(
            resumenAleatorioBorrador({
                disponible: false,
                puntaje_total: null,
                motivo: 'puntajes_no_uniformes',
                detalle,
                temas: [
                    {
                        tema_id: 1,
                        nombre_tema: 'Álgebra',
                        cantidad_candidatas: 4,
                        cantidad_seleccionada: 2,
                        puntaje_maximo: null,
                        garantizado: false,
                        motivo: 'puntajes_no_uniformes',
                        detalle,
                    },
                ],
            }),
        );

        expect(
            screen.getByText('No se puede garantizar el puntaje'),
        ).toBeDefined();
        expect(
            screen.getAllByText(detalle).length,
        ).toBeGreaterThan(0);
        expect(screen.getAllByText('No se puede garantizar')).toHaveLength(2);
        expect(screen.getByText('2 de 4 preguntas · Sin garantía')).toBeDefined();
        expect(
            screen.queryByText('No determinable antes de iniciar'),
        ).toBeNull();
    });
});

describe('ResumenPublicacion — evaluaciones publicadas', () => {
    it('muestra las cantidades y el total definitivos de la instantánea', async () => {
        await renderizar(
            resumen({
                estado: 'publicado',
                modo_seleccion: 'aleatorio',
                total_preguntas: 2,
                pregunta_ids: [],
                criterios: [
                    { tema_id: 1, nombre_tema: 'Álgebra', cantidad: 2 },
                ],
                puntajes: puntajes({
                    origen: 'instantanea',
                    puntaje_total: 20,
                    temas: [
                        {
                            tema_id: 1,
                            nombre_tema: 'Álgebra',
                            cantidad_candidatas: 4,
                            cantidad_seleccionada: 2,
                            puntaje_maximo: 20,
                            garantizado: true,
                            motivo: null,
                            detalle: null,
                        },
                    ],
                }),
            }),
        );

        expect(screen.getByText('Puntaje máximo total')).toBeDefined();
        expect(screen.getAllByText('20 pts')).toHaveLength(2);
        expect(screen.getByText('2 de 4 preguntas · 20 pts')).toBeDefined();
        expect(
            screen.queryByText('No determinable antes de iniciar'),
        ).toBeNull();
    });

    it('informa la falta de instantánea sin usar el mensaje de borrador', async () => {
        await renderizar(
            resumen({
                estado: 'publicado',
                modo_seleccion: 'aleatorio',
                total_preguntas: 0,
                pregunta_ids: [],
                puntajes: puntajes({
                    origen: 'instantanea',
                    disponible: false,
                    puntaje_total: null,
                    temas: [],
                    motivo: 'sin_instantanea',
                    detalle:
                        'La evaluación está publicada pero no tiene una instantánea del pool aleatorio.',
                }),
            }),
        );

        expect(screen.getAllByText(/Sin instantánea/).length).toBeGreaterThan(0);
        expect(
            screen.queryByText('No determinable antes de iniciar'),
        ).toBeNull();
    });
});
