import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RendicionEvaluacion from './RendicionEvaluacion';
import { usePreguntasRendicion } from '../hooks/usePreguntasRendicion';
import type { PreguntaRendicionEstudiante } from '../types';

vi.mock('../hooks/usePreguntasRendicion', () => ({
    claveIncisoRendicion: (preguntaId: number, letra: string) =>
        `${preguntaId}:${letra}`,
    usePreguntasRendicion: vi.fn(),
}));

const preguntas: PreguntaRendicionEstudiante[] = [
    {
        pregunta_id: 21,
        orden: 1,
        enunciado: 'Enunciado de la primera pregunta',
        tipo_respuesta: 'opcion_unica',
        estado_respuesta: 'pendiente',
        incisos: [
            {
                letra: 'a',
                enunciado_inciso: 'Texto del inciso',
                tipo_respuesta: 'opcion_unica',
                opciones: [
                    { nro_opcion: 1, texto_opcion: 'Alternativa uno' },
                    { nro_opcion: 2, texto_opcion: 'Alternativa dos' },
                ],
            },
        ],
    },
    {
        pregunta_id: 22,
        orden: 2,
        enunciado: 'Enunciado de la segunda pregunta',
        tipo_respuesta: 'desarrollo',
        estado_respuesta: 'respondida',
        incisos: [],
    },
];

const mockUsePreguntasRendicion = vi.mocked(usePreguntasRendicion);

beforeEach(() => {
    mockUsePreguntasRendicion.mockReturnValue({
        preguntas,
        cargando: false,
        error: '',
        recargar: vi.fn(),
        respuestasLocales: {},
        incisosGuardando: [],
        erroresGuardado: {},
        guardarRespuesta: vi.fn(),
    });
});

afterEach(() => cleanup());

describe('RendicionEvaluacion', () => {
    it('presenta la pregunta activa, progreso y estado de navegación', () => {
        render(<RendicionEvaluacion examenId={12} />);

        expect(
            screen.getByRole('heading', {
                name: 'Enunciado de la primera pregunta',
            }),
        ).toBeTruthy();
        expect(screen.getByText('Alternativa uno')).toBeTruthy();
        expect(screen.getByText('Respondidas')).toBeTruthy();
        expect(screen.getByText('Pendientes')).toBeTruthy();
        expect(
            screen
                .getByRole('progressbar', {
                    name: 'Progreso de preguntas respondidas',
                })
                .getAttribute('aria-valuenow'),
        ).toBe('50');
        expect(
            screen
                .getByRole('button', {
                    name: 'Pregunta 1, pendiente, actual',
                })
                .getAttribute('aria-current'),
        ).toBe('step');
    });

    it('navega entre preguntas mediante botones y navegador', () => {
        render(<RendicionEvaluacion examenId={12} />);

        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
        expect(
            screen.getByRole('heading', {
                name: 'Enunciado de la segunda pregunta',
            }),
        ).toBeTruthy();
        expect(
            screen
                .getByRole('button', { name: 'Siguiente' })
                .hasAttribute('disabled'),
        ).toBe(true);

        fireEvent.click(
            screen.getByRole('button', { name: 'Pregunta 1, pendiente' }),
        );
        expect(
            screen.getByRole('heading', {
                name: 'Enunciado de la primera pregunta',
            }),
        ).toBeTruthy();
    });

    it('guarda una selección exclusiva y muestra el estado de guardado', () => {
        const guardarRespuesta = vi.fn().mockResolvedValue(null);
        mockUsePreguntasRendicion.mockReturnValue({
            preguntas,
            cargando: false,
            error: '',
            recargar: vi.fn(),
            respuestasLocales: {},
            incisosGuardando: [],
            erroresGuardado: {},
            guardarRespuesta,
        });

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(screen.getByRole('radio', { name: 'Alternativa uno' }));

        expect(guardarRespuesta).toHaveBeenCalledWith(21, 'a', {
            opciones: [1],
        });
        expect(
            (
                screen.getByRole('radio', {
                    name: 'Alternativa uno',
                }) as HTMLInputElement
            ).checked,
        ).toBe(true);
    });

    it('permite respuestas independientes múltiples, verdadero/falso, desarrollo y numérica', () => {
        const guardarRespuesta = vi.fn().mockResolvedValue(null);
        const preguntaConTipos: PreguntaRendicionEstudiante = {
            pregunta_id: 31,
            orden: 1,
            enunciado: 'Pregunta con diferentes tipos de inciso',
            tipo_respuesta: 'mixto',
            estado_respuesta: 'pendiente',
            incisos: [
                {
                    letra: 'a',
                    enunciado_inciso: 'Elige varias',
                    tipo_respuesta: 'opcion_multiple',
                    opciones: [
                        { nro_opcion: 1, texto_opcion: 'Alternativa A' },
                        { nro_opcion: 2, texto_opcion: 'Alternativa B' },
                    ],
                },
                {
                    letra: 'b',
                    enunciado_inciso: 'Verdadero o falso',
                    tipo_respuesta: 'verdadero_falso',
                    opciones: [
                        { nro_opcion: 1, texto_opcion: 'Verdadero' },
                        { nro_opcion: 2, texto_opcion: 'Falso' },
                    ],
                },
                {
                    letra: 'c',
                    enunciado_inciso: 'Explica tu respuesta',
                    tipo_respuesta: 'desarrollo',
                    opciones: [],
                },
                {
                    letra: 'd',
                    enunciado_inciso: 'Calcula el resultado',
                    tipo_respuesta: 'numerica',
                    opciones: [],
                },
            ],
        };
        mockUsePreguntasRendicion.mockReturnValue({
            preguntas: [preguntaConTipos],
            cargando: false,
            error: '',
            recargar: vi.fn(),
            respuestasLocales: {},
            incisosGuardando: [],
            erroresGuardado: {},
            guardarRespuesta,
        });

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('checkbox', { name: 'Alternativa A' }),
        );
        fireEvent.click(screen.getByRole('radio', { name: 'Verdadero' }));
        fireEvent.change(
            screen.getByRole('textbox', { name: 'Respuesta del inciso c' }),
            { target: { value: 'Desarrollo escrito' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', {
                name: 'Respuesta numérica del inciso d',
            }),
            { target: { value: '42.5' } },
        );

        expect(guardarRespuesta).toHaveBeenNthCalledWith(1, 31, 'a', {
            opciones: [1],
        });
        expect(guardarRespuesta).toHaveBeenNthCalledWith(2, 31, 'b', {
            opciones: [1],
        });
        expect(guardarRespuesta).toHaveBeenNthCalledWith(3, 31, 'c', {
            respuesta_texto: 'Desarrollo escrito',
        });
        expect(guardarRespuesta).toHaveBeenNthCalledWith(4, 31, 'd', {
            respuesta_texto: '42.5',
        });
    });

    it('recupera en pantalla respuestas guardadas durante la sesión y presenta su estado', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce({
            preguntas,
            cargando: false,
            error: '',
            recargar: vi.fn(),
            respuestasLocales: { '21:a': { opciones: [2] } },
            incisosGuardando: [],
            erroresGuardado: {},
            guardarRespuesta: vi.fn(),
        });

        render(<RendicionEvaluacion examenId={12} />);

        expect(
            (
                screen.getByRole('radio', {
                    name: 'Alternativa dos',
                }) as HTMLInputElement
            ).checked,
        ).toBe(true);
        expect(screen.getByText('Respuesta guardada.')).toBeTruthy();
    });

    it('muestra errores de guardado sin ocultar el control', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce({
            preguntas,
            cargando: false,
            error: '',
            recargar: vi.fn(),
            respuestasLocales: {},
            incisosGuardando: [],
            erroresGuardado: { '21:a': 'Verifica tu conexión.' },
            guardarRespuesta: vi.fn(),
        });

        render(<RendicionEvaluacion examenId={12} />);

        expect(screen.getByRole('alert').textContent).toContain(
            'Verifica tu conexión.',
        );
        expect(
            screen.getByRole('radio', { name: 'Alternativa uno' }),
        ).toBeTruthy();
    });

    it('reintenta el último valor escrito sin que el estudiante lo cambie otra vez', () => {
        const guardarRespuesta = vi.fn().mockResolvedValue(null);
        const estadoInicial = {
            preguntas,
            cargando: false,
            error: '',
            recargar: vi.fn(),
            respuestasLocales: {},
            incisosGuardando: [],
            erroresGuardado: {},
            guardarRespuesta,
        };
        mockUsePreguntasRendicion.mockReturnValue(estadoInicial);

        const vista = render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(screen.getByRole('radio', { name: 'Alternativa uno' }));

        mockUsePreguntasRendicion.mockReturnValue({
            ...estadoInicial,
            erroresGuardado: { '21:a': 'Verifica tu conexión.' },
        });
        vista.rerender(<RendicionEvaluacion examenId={12} />);

        expect(screen.getByRole('alert').textContent).toContain(
            'Verifica tu conexión.',
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Reintentar guardado' }),
        );

        expect(guardarRespuesta).toHaveBeenNthCalledWith(1, 21, 'a', {
            opciones: [1],
        });
        expect(guardarRespuesta).toHaveBeenNthCalledWith(2, 21, 'a', {
            opciones: [1],
        });
    });

    it('indica cuando una respuesta se está guardando', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce({
            preguntas,
            cargando: false,
            error: '',
            recargar: vi.fn(),
            respuestasLocales: {},
            incisosGuardando: ['21:a'],
            erroresGuardado: {},
            guardarRespuesta: vi.fn(),
        });

        render(<RendicionEvaluacion examenId={12} />);

        expect(screen.getByRole('status').textContent).toBe(
            'Guardando respuesta…',
        );
    });

    it('muestra la carga y un error con opción de reintento', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce({
            preguntas: [],
            cargando: true,
            error: '',
            recargar: vi.fn(),
            respuestasLocales: {},
            incisosGuardando: [],
            erroresGuardado: {},
            guardarRespuesta: vi.fn(),
        });
        const { rerender } = render(<RendicionEvaluacion examenId={12} />);
        expect(screen.getByLabelText('Cargando rendición')).toBeTruthy();

        const recargar = vi.fn();
        mockUsePreguntasRendicion.mockReturnValueOnce({
            preguntas: [],
            cargando: false,
            error: 'No se pudo consultar la rendición.',
            recargar,
            respuestasLocales: {},
            incisosGuardando: [],
            erroresGuardado: {},
            guardarRespuesta: vi.fn(),
        });
        rerender(<RendicionEvaluacion examenId={12} />);

        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        expect(recargar).toHaveBeenCalledOnce();
        expect(screen.getByRole('alert').textContent).toBe(
            'No se pudo consultar la rendición.',
        );
    });

    it('muestra estado vacío cuando no hay preguntas asignadas', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce({
            preguntas: [],
            cargando: false,
            error: '',
            recargar: vi.fn(),
            respuestasLocales: {},
            incisosGuardando: [],
            erroresGuardado: {},
            guardarRespuesta: vi.fn(),
        });

        render(<RendicionEvaluacion examenId={12} />);

        expect(
            screen.getByRole('heading', {
                name: 'No hay preguntas disponibles',
            }),
        ).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'Volver a instrucciones' })
                .getAttribute('href'),
        ).toBe('/estudiante/evaluaciones/12/instrucciones');
    });
});
