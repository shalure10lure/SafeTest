import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RendicionEvaluacion from './RendicionEvaluacion';
import { usePreguntasRendicion } from '../hooks/usePreguntasRendicion';
import type { PreguntaRendicionEstudiante } from '../types';

const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    finalizarRendicion: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        finalizarRendicion: mocks.finalizarRendicion,
    },
}));

vi.mock('../hooks/usePreguntasRendicion', () => ({
    claveIncisoRendicion: (preguntaId: number, letra: string) =>
        `${preguntaId}:${letra}`,
    usePreguntasRendicion: vi.fn(),
}));

vi.mock('../hooks/useRecursosRendicion', () => ({
    useRecursosRendicion: () => ({
        recursos: [],
        cargando: false,
        error: false,
        cargarImagen: vi.fn(),
    }),
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

/** Estado del hook con valores seguros por defecto; cada prueba ajusta lo suyo. */
function crearEstado(
    cambios: Partial<ReturnType<typeof usePreguntasRendicion>> = {},
): ReturnType<typeof usePreguntasRendicion> {
    return {
        preguntas,
        cargando: false,
        error: '',
        recargar: vi.fn(),
        respuestasLocales: {},
        incisosGuardando: [],
        erroresGuardado: {},
        guardarRespuesta: vi.fn().mockResolvedValue(null),
        esperarGuardadosPendientes: vi
            .fn()
            .mockResolvedValue({ fallidos: [] }),
        ...cambios,
    };
}

beforeEach(() => {
    mocks.replace.mockReset();
    mocks.finalizarRendicion.mockReset();
    mocks.finalizarRendicion.mockResolvedValue({
        examen_id: 12,
        estado: 'enviada',
        fecha_envio: '2026-11-08T15:00:00.000Z',
    });

    mockUsePreguntasRendicion.mockReturnValue(crearEstado());
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
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ guardarRespuesta }),
        );

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
            ...crearEstado({ guardarRespuesta }),
            preguntas: [preguntaConTipos],
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
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({
                respuestasLocales: { '21:a': { opciones: [2] } },
            }),
        );

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

    it('indica que todo está guardado y no avisa al cerrar la pestaña', () => {
        const agregar = vi.spyOn(window, 'addEventListener');
        render(<RendicionEvaluacion examenId={12} />);

        expect(
            screen.getByText('Todas tus respuestas están guardadas.'),
        ).toBeTruthy();
        expect(
            agregar.mock.calls.some(([tipo]) => tipo === 'beforeunload'),
        ).toBe(false);
        agregar.mockRestore();
    });

    it('avisa antes de cerrar la pestaña mientras hay un guardado en curso', () => {
        mockUsePreguntasRendicion.mockReturnValue({
            ...mockUsePreguntasRendicion(12),
            incisosGuardando: ['21:a'],
        });
        const agregar = vi.spyOn(window, 'addEventListener');
        const quitar = vi.spyOn(window, 'removeEventListener');

        const { unmount } = render(<RendicionEvaluacion examenId={12} />);

        expect(screen.getByText('Guardando respuestas…')).toBeTruthy();
        expect(
            agregar.mock.calls.some(([tipo]) => tipo === 'beforeunload'),
        ).toBe(true);

        unmount();
        expect(
            quitar.mock.calls.some(([tipo]) => tipo === 'beforeunload'),
        ).toBe(true);
        agregar.mockRestore();
        quitar.mockRestore();
    });

    it('marca respuestas sin guardar cuando falla un guardado', () => {
        mockUsePreguntasRendicion.mockReturnValue({
            ...mockUsePreguntasRendicion(12),
            erroresGuardado: { '21:a': 'Sin conexión' },
        });

        render(<RendicionEvaluacion examenId={12} />);

        expect(
            screen.getByText(
                'Hay respuestas sin guardar. Usa «Reintentar guardado».',
            ),
        ).toBeTruthy();
    });

    it('muestra errores de guardado sin ocultar el control', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({
                erroresGuardado: { '21:a': 'Verifica tu conexión.' },
            }),
        );

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
        const estadoInicial = crearEstado({ guardarRespuesta });
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
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({ incisosGuardando: ['21:a'] }),
        );

        render(<RendicionEvaluacion examenId={12} />);

        expect(screen.getByText('Guardando respuesta…')).toBeTruthy();
    });

    it('muestra la carga y un error con opción de reintento', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({ preguntas: [], cargando: true }),
        );
        const { rerender } = render(<RendicionEvaluacion examenId={12} />);
        expect(screen.getByLabelText('Cargando rendición')).toBeTruthy();

        const recargar = vi.fn();
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({
                preguntas: [],
                error: 'No se pudo consultar la rendición.',
                recargar,
            }),
        );
        rerender(<RendicionEvaluacion examenId={12} />);

        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        expect(recargar).toHaveBeenCalledOnce();
        expect(screen.getByRole('alert').textContent).toBe(
            'No se pudo consultar la rendición.',
        );
    });

    it('muestra estado vacío cuando no hay preguntas asignadas', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({ preguntas: [] }),
        );

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

    it('pide confirmación y cancelar mantiene al estudiante en la evaluación', () => {
        render(<RendicionEvaluacion examenId={12} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'Finalizar evaluación' }),
        );

        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(
            screen.getByRole('heading', { name: '¿Finalizar evaluación?' }),
        ).toBeTruthy();
        expect(mocks.finalizarRendicion).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(mocks.finalizarRendicion).not.toHaveBeenCalled();
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(
            screen.getByRole('heading', {
                name: 'Enunciado de la primera pregunta',
            }),
        ).toBeTruthy();
    });

    it('espera los guardados pendientes y redirige solo tras confirmar el backend', async () => {
        let resolverGuardados!: (valor: { fallidos: string[] }) => void;
        const esperarGuardadosPendientes = vi.fn(
            () =>
                new Promise<{ fallidos: string[] }>((resolve) => {
                    resolverGuardados = resolve;
                }),
        );
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ esperarGuardadosPendientes }),
        );

        let resolverFinalizar!: (valor: {
            examen_id: number;
            estado: string;
            fecha_envio: string | null;
        }) => void;
        mocks.finalizarRendicion.mockReturnValue(
            new Promise((resolve) => {
                resolverFinalizar = resolve;
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Finalizar evaluación' }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Sí, finalizar' }),
        );

        expect(esperarGuardadosPendientes).toHaveBeenCalledTimes(1);
        expect(mocks.finalizarRendicion).not.toHaveBeenCalled();
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(
            screen
                .getByRole('button', { name: 'Finalizando…' })
                .hasAttribute('disabled'),
        ).toBe(true);

        resolverGuardados({ fallidos: [] });

        await waitFor(() =>
            expect(mocks.finalizarRendicion).toHaveBeenCalledWith(12),
        );
        expect(mocks.replace).not.toHaveBeenCalled();

        resolverFinalizar({
            examen_id: 12,
            estado: 'enviada',
            fecha_envio: null,
        });

        await waitFor(() =>
            expect(mocks.replace).toHaveBeenCalledWith(
                '/estudiante/evaluaciones',
            ),
        );
    });

    it('no finaliza si quedaron respuestas sin guardar', async () => {
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                esperarGuardadosPendientes: vi
                    .fn()
                    .mockResolvedValue({ fallidos: ['21:a'] }),
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Finalizar evaluación' }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Sí, finalizar' }),
        );

        await waitFor(() =>
            expect(screen.getByRole('alert').textContent).toContain(
                'no se pudieron guardar',
            ),
        );
        expect(mocks.finalizarRendicion).not.toHaveBeenCalled();
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Reintentar' }),
        ).toBeTruthy();
    });

    it('un error del backend no redirige y permite reintentar', async () => {
        mocks.finalizarRendicion.mockRejectedValueOnce(
            new Error('fallo de red'),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Finalizar evaluación' }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Sí, finalizar' }),
        );

        await waitFor(() =>
            expect(screen.getByRole('alert').textContent).toContain(
                'No se pudo finalizar la evaluación.',
            ),
        );
        expect(mocks.replace).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

        await waitFor(() =>
            expect(mocks.replace).toHaveBeenCalledWith(
                '/estudiante/evaluaciones',
            ),
        );
        expect(mocks.finalizarRendicion).toHaveBeenCalledTimes(2);
    });

    it('evita solicitudes duplicadas mientras la finalización está en curso', async () => {
        let resolverFinalizar!: (valor: {
            examen_id: number;
            estado: string;
            fecha_envio: string | null;
        }) => void;
        mocks.finalizarRendicion.mockReturnValue(
            new Promise((resolve) => {
                resolverFinalizar = resolve;
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Finalizar evaluación' }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Sí, finalizar' }),
        );

        await waitFor(() =>
            expect(mocks.finalizarRendicion).toHaveBeenCalledTimes(1),
        );

        const enProceso = screen.getByRole('button', {
            name: 'Finalizando…',
        });
        expect(enProceso.hasAttribute('disabled')).toBe(true);

        fireEvent.click(enProceso);

        expect(mocks.finalizarRendicion).toHaveBeenCalledTimes(1);

        resolverFinalizar({
            examen_id: 12,
            estado: 'enviada',
            fecha_envio: null,
        });

        await waitFor(() =>
            expect(mocks.replace).toHaveBeenCalledWith(
                '/estudiante/evaluaciones',
            ),
        );
    });
});
