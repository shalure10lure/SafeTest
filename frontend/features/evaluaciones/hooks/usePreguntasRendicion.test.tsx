import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePreguntasRendicion } from './usePreguntasRendicion';
import type {
    PreguntasRendicionEstudiante,
    RespuestaGuardadaEstudiante,
} from '../types';

const mocks = vi.hoisted(() => ({
    getPreguntasRendicion: vi.fn(),
    guardarRespuestaRendicion: vi.fn(),
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        getPreguntasRendicion: mocks.getPreguntasRendicion,
        guardarRespuestaRendicion: mocks.guardarRespuestaRendicion,
    },
}));

function crearPreguntas(): PreguntasRendicionEstudiante {
    return {
        examen_id: 12,
        preguntas: [
            {
                pregunta_id: 21,
                orden: 1,
                enunciado: 'Pregunta con dos incisos',
                tipo_respuesta: 'mixto',
                estado_respuesta: 'pendiente',
                incisos: [
                    {
                        letra: 'a',
                        enunciado_inciso: 'Desarrollo',
                        tipo_respuesta: 'desarrollo',
                        opciones: [],
                    },
                    {
                        letra: 'b',
                        enunciado_inciso: 'Numérica',
                        tipo_respuesta: 'numerica',
                        opciones: [],
                    },
                ],
            },
        ],
    };
}

function respuestaGuardada(
    cambios: Partial<RespuestaGuardadaEstudiante> = {},
): RespuestaGuardadaEstudiante {
    return {
        examen_id: 12,
        pregunta_id: 21,
        letra: 'a',
        estado_respuesta: 'pendiente',
        guardado_en: '2026-11-08T14:00:00.000Z',
        ...cambios,
    };
}

beforeEach(() => {
    mocks.getPreguntasRendicion.mockReset();
    mocks.guardarRespuestaRendicion.mockReset();
    mocks.getPreguntasRendicion.mockResolvedValue(crearPreguntas());
    mocks.guardarRespuestaRendicion.mockResolvedValue(respuestaGuardada());
});

afterEach(() => cleanup());

describe('usePreguntasRendicion', () => {
    it('carga las preguntas asignadas y estados devueltos por el backend', async () => {
        const { result } = renderHook(() => usePreguntasRendicion(12));

        expect(result.current.cargando).toBe(true);
        await waitFor(() => expect(result.current.cargando).toBe(false));

        expect(mocks.getPreguntasRendicion).toHaveBeenCalledExactlyOnceWith(12);
        expect(result.current.preguntas).toEqual(crearPreguntas().preguntas);
        expect(result.current.respuestasLocales).toEqual({});
        expect(result.current.error).toBe('');
    });

    it('precarga las respuestas que el servidor ya tiene guardadas', async () => {
        const conRespuestas = crearPreguntas();
        conRespuestas.preguntas[0].incisos[0].respuesta = {
            respuesta_texto: 'Texto guardado',
        };
        mocks.getPreguntasRendicion.mockResolvedValue(conRespuestas);

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        expect(result.current.respuestasLocales).toEqual({
            '21:a': { respuesta_texto: 'Texto guardado' },
        });
    });

    it('no pisa con datos del servidor lo guardado en esta sesión al recargar', async () => {
        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        await act(async () => {
            await result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'Nuevo',
            });
        });

        const antigua = crearPreguntas();
        antigua.preguntas[0].incisos[0].respuesta = {
            respuesta_texto: 'Viejo',
        };
        mocks.getPreguntasRendicion.mockResolvedValue(antigua);
        await act(async () => {
            await result.current.recargar();
        });

        expect(result.current.respuestasLocales['21:a']).toEqual({
            respuesta_texto: 'Nuevo',
        });
    });

    it('expone el error de carga y permite reintentar', async () => {
        mocks.getPreguntasRendicion
            .mockRejectedValueOnce(new Error('fallo'))
            .mockResolvedValueOnce(crearPreguntas());

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.error).not.toBe(''));
        expect(result.current.error).toBe(
            'No se pudieron cargar las preguntas de la evaluación.',
        );

        await act(async () => {
            await result.current.recargar();
        });

        expect(result.current.preguntas).toEqual(crearPreguntas().preguntas);
        expect(result.current.error).toBe('');
        expect(mocks.getPreguntasRendicion).toHaveBeenCalledTimes(2);
    });

    it('reutiliza una consulta concurrente para evitar solicitudes duplicadas', async () => {
        let resolver!: (resultado: PreguntasRendicionEstudiante) => void;
        mocks.getPreguntasRendicion.mockReturnValueOnce(
            new Promise((resolve) => {
                resolver = resolve;
            }),
        );

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() =>
            expect(mocks.getPreguntasRendicion).toHaveBeenCalledTimes(1),
        );

        let primera!: Promise<void>;
        let segunda!: Promise<void>;
        act(() => {
            primera = result.current.recargar();
            segunda = result.current.recargar();
        });

        expect(primera).toBe(segunda);
        expect(mocks.getPreguntasRendicion).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolver(crearPreguntas());
            await primera;
        });
    });

    it('guarda una respuesta y actualiza la respuesta local y el estado global', async () => {
        mocks.guardarRespuestaRendicion.mockResolvedValueOnce(
            respuestaGuardada({ estado_respuesta: 'respondida' }),
        );

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        let guardado!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            guardado = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'Respuesta escrita',
            });
        });

        expect(result.current.incisosGuardando).toContain('21:a');
        await act(async () => {
            await guardado;
        });

        expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledExactlyOnceWith(
            12,
            21,
            'a',
            { respuesta_texto: 'Respuesta escrita' },
        );
        expect(result.current.respuestasLocales['21:a']).toEqual({
            respuesta_texto: 'Respuesta escrita',
        });
        expect(result.current.preguntas[0].estado_respuesta).toBe('respondida');
        expect(result.current.incisosGuardando).toEqual([]);
        expect(result.current.erroresGuardado).toEqual({});
    });

    it('deduplica guardados idénticos concurrentes del mismo inciso', async () => {
        let resolver!: (respuesta: RespuestaGuardadaEstudiante) => void;
        mocks.guardarRespuestaRendicion.mockReturnValueOnce(
            new Promise((resolve) => {
                resolver = resolve;
            }),
        );
        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        let primero!: Promise<RespuestaGuardadaEstudiante | null>;
        let segundo!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            primero = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'Misma respuesta',
            });
            segundo = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'Misma respuesta',
            });
        });

        expect(primero).toBe(segundo);
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(1),
        );

        await act(async () => {
            resolver(respuestaGuardada());
            await primero;
        });
    });

    it('serializa cambios del mismo inciso y conserva la respuesta solicitada más reciente', async () => {
        let resolverPrimero!: (respuesta: RespuestaGuardadaEstudiante) => void;
        let resolverSegundo!: (respuesta: RespuestaGuardadaEstudiante) => void;
        mocks.guardarRespuestaRendicion
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverPrimero = resolve;
                }),
            )
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverSegundo = resolve;
                }),
            );

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        let primera!: Promise<RespuestaGuardadaEstudiante | null>;
        let segunda!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            primera = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'Primera versión',
            });
            segunda = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'Versión más reciente',
            });
        });

        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(1),
        );
        await act(async () => {
            resolverPrimero(respuestaGuardada());
            await primera;
        });

        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(2),
        );
        await act(async () => {
            resolverSegundo(
                respuestaGuardada({ estado_respuesta: 'respondida' }),
            );
            await segunda;
        });

        expect(result.current.respuestasLocales['21:a']).toEqual({
            respuesta_texto: 'Versión más reciente',
        });
        expect(result.current.preguntas[0].estado_respuesta).toBe('respondida');
    });

    it('persiste A→B→A en orden y no deja que respuestas antiguas reemplacen el valor final', async () => {
        let resolverPrimerA!: (respuesta: RespuestaGuardadaEstudiante) => void;
        let resolverB!: (respuesta: RespuestaGuardadaEstudiante) => void;
        let resolverUltimoA!: (respuesta: RespuestaGuardadaEstudiante) => void;
        let resolverOtroInciso!: (
            respuesta: RespuestaGuardadaEstudiante,
        ) => void;
        mocks.guardarRespuestaRendicion
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverPrimerA = resolve;
                }),
            )
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverB = resolve;
                }),
            )
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverUltimoA = resolve;
                }),
            )
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverOtroInciso = resolve;
                }),
            );

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        let primerA!: Promise<RespuestaGuardadaEstudiante | null>;
        let cambioB!: Promise<RespuestaGuardadaEstudiante | null>;
        let ultimoA!: Promise<RespuestaGuardadaEstudiante | null>;
        let otroInciso!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            primerA = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'A',
            });
            cambioB = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'B',
            });
            ultimoA = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'A',
            });
            otroInciso = result.current.guardarRespuesta(21, 'b', {
                respuesta_texto: 'Respuesta del otro inciso',
            });
        });

        expect(result.current.incisosGuardando).toEqual(
            expect.arrayContaining(['21:a', '21:b']),
        );
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(1),
        );
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            1,
            12,
            21,
            'a',
            { respuesta_texto: 'A' },
        );

        await act(async () => {
            resolverPrimerA(respuestaGuardada());
            await primerA;
        });
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(2),
        );
        expect(result.current.respuestasLocales['21:a']).toBeUndefined();
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            2,
            12,
            21,
            'a',
            { respuesta_texto: 'B' },
        );

        await act(async () => {
            resolverB(respuestaGuardada());
            await cambioB;
        });
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(3),
        );
        expect(result.current.respuestasLocales['21:a']).toBeUndefined();
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            3,
            12,
            21,
            'a',
            { respuesta_texto: 'A' },
        );

        await act(async () => {
            resolverUltimoA(
                respuestaGuardada({ estado_respuesta: 'respondida' }),
            );
            await ultimoA;
        });
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(4),
        );
        expect(result.current.respuestasLocales['21:a']).toEqual({
            respuesta_texto: 'A',
        });
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            4,
            12,
            21,
            'b',
            { respuesta_texto: 'Respuesta del otro inciso' },
        );

        await act(async () => {
            resolverOtroInciso(respuestaGuardada());
            await otroInciso;
        });
        expect(result.current.respuestasLocales).toEqual({
            '21:a': { respuesta_texto: 'A' },
            '21:b': { respuesta_texto: 'Respuesta del otro inciso' },
        });
        expect(result.current.incisosGuardando).toEqual([]);
    });

    it('ignora el error de una respuesta anterior cuando la última modificación se guarda', async () => {
        let rechazarPrimero!: (error: Error) => void;
        let resolverSegundo!: (respuesta: RespuestaGuardadaEstudiante) => void;
        mocks.guardarRespuestaRendicion
            .mockReturnValueOnce(
                new Promise((_resolve, reject) => {
                    rechazarPrimero = reject;
                }),
            )
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverSegundo = resolve;
                }),
            );

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        let primera!: Promise<RespuestaGuardadaEstudiante | null>;
        let segunda!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            primera = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'Versión anterior',
            });
            segunda = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'Versión más reciente',
            });
        });

        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(1),
        );
        await act(async () => {
            rechazarPrimero(new Error('error anterior'));
            await primera;
        });
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(2),
        );
        await act(async () => {
            resolverSegundo(respuestaGuardada());
            await segunda;
        });

        expect(result.current.respuestasLocales['21:a']).toEqual({
            respuesta_texto: 'Versión más reciente',
        });
        expect(result.current.erroresGuardado['21:a']).toBeUndefined();
    });

    it('permite reintentar el último valor fallido y limpia el error al guardarlo', async () => {
        let resolverReintento!: (
            respuesta: RespuestaGuardadaEstudiante,
        ) => void;
        mocks.guardarRespuestaRendicion
            .mockRejectedValueOnce(new Error('fallo temporal'))
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverReintento = resolve;
                }),
            );

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        const valor = { respuesta_texto: 'Respuesta que debe conservarse' };
        await act(async () => {
            await result.current.guardarRespuesta(21, 'a', valor);
        });

        expect(result.current.erroresGuardado['21:a']).toBe(
            'No se pudo guardar la respuesta.',
        );
        expect(result.current.respuestasLocales['21:a']).toBeUndefined();

        let reintento!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            reintento = result.current.guardarRespuesta(21, 'a', valor);
        });

        expect(result.current.incisosGuardando).toContain('21:a');
        expect(result.current.erroresGuardado['21:a']).toBeUndefined();
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(2),
        );
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            2,
            12,
            21,
            'a',
            valor,
        );

        await act(async () => {
            resolverReintento(
                respuestaGuardada({ estado_respuesta: 'respondida' }),
            );
            await reintento;
        });

        expect(result.current.respuestasLocales['21:a']).toEqual(valor);
        expect(result.current.erroresGuardado['21:a']).toBeUndefined();
        expect(result.current.incisosGuardando).toEqual([]);
    });

    it('da prioridad a una modificación nueva durante un reintento y mantiene aislado otro inciso', async () => {
        let resolverReintento!: (
            respuesta: RespuestaGuardadaEstudiante,
        ) => void;
        let resolverNuevaRespuesta!: (
            respuesta: RespuestaGuardadaEstudiante,
        ) => void;
        let resolverOtroInciso!: (
            respuesta: RespuestaGuardadaEstudiante,
        ) => void;
        mocks.guardarRespuestaRendicion
            .mockRejectedValueOnce(new Error('fallo temporal'))
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverReintento = resolve;
                }),
            )
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverNuevaRespuesta = resolve;
                }),
            )
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverOtroInciso = resolve;
                }),
            );

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        const valorFallido = { respuesta_texto: 'Valor anterior' };
        const valorNuevo = { respuesta_texto: 'Valor más reciente' };
        const valorOtroInciso = { respuesta_texto: 'Respuesta del inciso b' };
        await act(async () => {
            await result.current.guardarRespuesta(21, 'a', valorFallido);
        });

        let reintento!: Promise<RespuestaGuardadaEstudiante | null>;
        let nuevaRespuesta!: Promise<RespuestaGuardadaEstudiante | null>;
        let otroInciso!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            reintento = result.current.guardarRespuesta(21, 'a', valorFallido);
            nuevaRespuesta = result.current.guardarRespuesta(
                21,
                'a',
                valorNuevo,
            );
            otroInciso = result.current.guardarRespuesta(
                21,
                'b',
                valorOtroInciso,
            );
        });

        expect(result.current.incisosGuardando).toEqual(
            expect.arrayContaining(['21:a', '21:b']),
        );
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(2),
        );
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            2,
            12,
            21,
            'a',
            valorFallido,
        );

        await act(async () => {
            resolverReintento(respuestaGuardada());
            await reintento;
        });
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(3),
        );
        expect(result.current.respuestasLocales['21:a']).toBeUndefined();
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            3,
            12,
            21,
            'a',
            valorNuevo,
        );

        await act(async () => {
            resolverNuevaRespuesta(
                respuestaGuardada({ estado_respuesta: 'respondida' }),
            );
            await nuevaRespuesta;
        });
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(4),
        );
        expect(result.current.respuestasLocales['21:a']).toEqual(valorNuevo);
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            4,
            12,
            21,
            'b',
            valorOtroInciso,
        );

        await act(async () => {
            resolverOtroInciso(respuestaGuardada());
            await otroInciso;
        });
        expect(result.current.respuestasLocales).toEqual({
            '21:a': valorNuevo,
            '21:b': valorOtroInciso,
        });
        expect(result.current.erroresGuardado).toEqual({});
        expect(result.current.incisosGuardando).toEqual([]);
    });

    it('conserva el resultado local de un guardado si una carga anterior termina después', async () => {
        let resolverCarga!: (resultado: PreguntasRendicionEstudiante) => void;
        mocks.getPreguntasRendicion
            .mockResolvedValueOnce(crearPreguntas())
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverCarga = resolve;
                }),
            );
        mocks.guardarRespuestaRendicion.mockResolvedValueOnce(
            respuestaGuardada({ estado_respuesta: 'respondida' }),
        );

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        let recarga!: Promise<void>;
        act(() => {
            recarga = result.current.recargar();
        });
        await waitFor(() =>
            expect(mocks.getPreguntasRendicion).toHaveBeenCalledTimes(2),
        );

        await act(async () => {
            await result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'Respuesta',
            });
        });

        await act(async () => {
            resolverCarga(crearPreguntas());
            await recarga;
        });

        expect(result.current.preguntas[0].estado_respuesta).toBe('respondida');
    });

    it('expone el error de guardado y no almacena una respuesta fallida', async () => {
        mocks.guardarRespuestaRendicion.mockRejectedValueOnce(
            new Error('fallo'),
        );
        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        await act(async () => {
            await result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'No guardada',
            });
        });

        expect(result.current.respuestasLocales['21:a']).toBeUndefined();
        expect(result.current.erroresGuardado['21:a']).toBe(
            'No se pudo guardar la respuesta.',
        );
        expect(result.current.incisosGuardando).toEqual([]);
    });
});
