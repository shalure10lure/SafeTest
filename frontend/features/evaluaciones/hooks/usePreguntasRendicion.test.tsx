import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePreguntasRendicion } from './usePreguntasRendicion';
import type {
    GuardarProcedimientoRendicion,
    PreguntasRendicionEstudiante,
    ProcedimientoRendicion,
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

function procedimientoGuardado(
    cambios: Partial<ProcedimientoRendicion> = {},
): ProcedimientoRendicion {
    return {
        modelo_id: 3,
        valores: { x: 2 },
        resultado_final: '4',
        formula_ids: [101],
        ...cambios,
    };
}

function payloadProcedimiento(
    cambios: Partial<GuardarProcedimientoRendicion> = {},
): GuardarProcedimientoRendicion {
    return {
        modelo_id: 3,
        formula_ids: [101],
        valores: { x: 2 },
        resultado_final: '4',
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

    it('hidrata procedimientos y modelos permitidos desde el GET', async () => {
        const conProcedimiento = crearPreguntas();
        conProcedimiento.preguntas[0].incisos[0].procedimiento =
            procedimientoGuardado();
        conProcedimiento.preguntas[0].incisos[0].modelos_permitidos = [
            {
                modelo_id: 3,
                nombre: 'Modelo',
                descripcion: null,
                variables: { x: { tipo: 'numero' } },
                formulas_permitidas: [{ formula_id: 101, expresion: 'x * x' }],
            },
        ];
        mocks.getPreguntasRendicion.mockResolvedValue(conProcedimiento);

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        expect(result.current.procedimientosLocales).toEqual({
            '21:a': procedimientoGuardado(),
        });
        expect(
            result.current.preguntas[0].incisos[0].modelos_permitidos,
        ).toEqual(conProcedimiento.preguntas[0].incisos[0].modelos_permitidos);
        expect(result.current.respuestasLocales).toEqual({});
    });

    it('elimina el procedimiento local anterior cuando la recarga devuelve null', async () => {
        const conProcedimiento = crearPreguntas();
        conProcedimiento.preguntas[0].incisos[0].procedimiento =
            procedimientoGuardado();
        const sinProcedimiento = crearPreguntas();
        sinProcedimiento.preguntas[0].incisos[0].procedimiento = null;
        mocks.getPreguntasRendicion
            .mockResolvedValueOnce(conProcedimiento)
            .mockResolvedValueOnce(sinProcedimiento);

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));
        expect(result.current.procedimientosLocales['21:a']).toEqual(
            procedimientoGuardado(),
        );

        await act(async () => {
            await result.current.recargar();
        });

        expect(result.current.procedimientosLocales).toEqual({});
    });

    it('no reemplaza un procedimiento guardado por una respuesta GET anterior', async () => {
        let resolverCarga!: (resultado: PreguntasRendicionEstudiante) => void;
        const cargaAnterior = new Promise<PreguntasRendicionEstudiante>(
            (resolve) => {
                resolverCarga = resolve;
            },
        );
        mocks.getPreguntasRendicion.mockReturnValueOnce(crearPreguntas());

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        mocks.getPreguntasRendicion.mockReturnValueOnce(cargaAnterior);
        let recarga!: Promise<void>;
        act(() => {
            recarga = result.current.recargar();
        });
        await waitFor(() =>
            expect(mocks.getPreguntasRendicion).toHaveBeenCalledTimes(2),
        );

        await act(async () => {
            await result.current.guardarProcedimiento(
                21,
                'a',
                payloadProcedimiento(),
            );
        });
        expect(result.current.procedimientosLocales['21:a']).toEqual(
            procedimientoGuardado(),
        );

        await act(async () => {
            resolverCarga(crearPreguntas());
            await recarga;
        });

        expect(result.current.procedimientosLocales['21:a']).toEqual(
            procedimientoGuardado(),
        );
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

    it('sigue guardando correctamente opciones tradicionales HU-22', async () => {
        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        await act(async () => {
            await result.current.guardarRespuesta(21, 'a', {
                opciones: [1, 2],
            });
        });

        expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledWith(
            12,
            21,
            'a',
            {
                opciones: [1, 2],
            },
        );
        expect(result.current.respuestasLocales['21:a']).toEqual({
            opciones: [1, 2],
        });
        expect(result.current.procedimientosLocales).toEqual({});
    });

    it('serializa guardados mixtos HU-22 y HU-23 sin perder información', async () => {
        let resolverRespuesta!: (
            respuesta: RespuestaGuardadaEstudiante,
        ) => void;
        mocks.guardarRespuestaRendicion
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverRespuesta = resolve;
                }),
            )
            .mockResolvedValueOnce(respuestaGuardada());

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        const respuesta = { respuesta_texto: 'Respuesta HU-22' };
        const procedimiento = payloadProcedimiento({
            valores: { x: 7 },
            resultado_final: '49',
        });
        let guardadoRespuesta!: Promise<RespuestaGuardadaEstudiante | null>;
        let guardadoProcedimiento!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            guardadoRespuesta = result.current.guardarRespuesta(
                21,
                'a',
                respuesta,
            );
            guardadoProcedimiento = result.current.guardarProcedimiento(
                21,
                'a',
                procedimiento,
            );
        });

        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(1),
        );
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            1,
            12,
            21,
            'a',
            respuesta,
        );

        await act(async () => {
            resolverRespuesta(respuestaGuardada());
            await guardadoRespuesta;
        });
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(2),
        );
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            2,
            12,
            21,
            'a',
            procedimiento,
        );
        await act(async () => {
            await guardadoProcedimiento;
        });

        expect(result.current.respuestasLocales['21:a']).toEqual(respuesta);
        expect(result.current.procedimientosLocales['21:a']).toEqual(
            procedimientoGuardado({
                valores: { x: 7 },
                resultado_final: '49',
            }),
        );
        expect(result.current.incisosGuardando).toEqual([]);
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

    it('aísla las colas y el estado de guardados entre evaluaciones', async () => {
        let resolverGuardadoAntiguo!: (
            respuesta: RespuestaGuardadaEstudiante,
        ) => void;
        mocks.getPreguntasRendicion.mockImplementation(async (examenId) => ({
            ...crearPreguntas(),
            examen_id: examenId,
        }));
        mocks.guardarRespuestaRendicion
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverGuardadoAntiguo = resolve;
                }),
            )
            .mockResolvedValueOnce(respuestaGuardada());

        const { result, rerender } = renderHook(
            ({ examenId }) => usePreguntasRendicion(examenId),
            { initialProps: { examenId: 12 } },
        );
        await waitFor(() => expect(result.current.cargando).toBe(false));

        let guardadoAntiguo!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            guardadoAntiguo = result.current.guardarProcedimiento(
                21,
                'a',
                payloadProcedimiento(),
            );
        });
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(1),
        );

        rerender({ examenId: 13 });
        await waitFor(() =>
            expect(mocks.getPreguntasRendicion).toHaveBeenCalledWith(13),
        );
        await waitFor(() => expect(result.current.cargando).toBe(false));
        expect(result.current.procedimientosLocales).toEqual({});

        const procedimientoNuevo = payloadProcedimiento({
            valores: { x: 9 },
            resultado_final: '81',
        });
        let guardadoNuevo!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            guardadoNuevo = result.current.guardarProcedimiento(
                21,
                'a',
                procedimientoNuevo,
            );
        });
        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(2),
        );
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            2,
            13,
            21,
            'a',
            procedimientoNuevo,
        );
        await act(async () => {
            await guardadoNuevo;
        });
        expect(result.current.procedimientosLocales['21:a']).toEqual(
            procedimientoGuardado({
                valores: { x: 9 },
                resultado_final: '81',
            }),
        );

        await act(async () => {
            resolverGuardadoAntiguo(respuestaGuardada());
            await guardadoAntiguo;
        });

        expect(result.current.procedimientosLocales['21:a']).toEqual(
            procedimientoGuardado({
                valores: { x: 9 },
                resultado_final: '81',
            }),
        );
        expect(result.current.erroresGuardado).toEqual({});
        expect(result.current.incisosGuardando).toEqual([]);
        expect(result.current.preguntas).toEqual(crearPreguntas().preguntas);
    });

    it.each(['resuelve', 'rechaza'] as const)(
        'no actualiza estado al desmontar con un PATCH pendiente que %s',
        async (resultadoPatch) => {
            let resolver!: (respuesta: RespuestaGuardadaEstudiante) => void;
            let rechazar!: (error: Error) => void;
            mocks.guardarRespuestaRendicion.mockReturnValueOnce(
                new Promise((resolve, reject) => {
                    resolver = resolve;
                    rechazar = reject;
                }),
            );

            let renderCount = 0;
            const { result, unmount } = renderHook(() => {
                renderCount += 1;
                return usePreguntasRendicion(12);
            });
            await waitFor(() => expect(result.current.cargando).toBe(false));

            let guardado!: Promise<RespuestaGuardadaEstudiante | null>;
            act(() => {
                guardado = result.current.guardarProcedimiento(
                    21,
                    'a',
                    payloadProcedimiento(),
                );
            });
            await waitFor(() =>
                expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(
                    1,
                ),
            );

            const rendersAntesDeDesmontar = renderCount;
            unmount();

            await act(async () => {
                if (resultadoPatch === 'resuelve') {
                    resolver(respuestaGuardada());
                    await expect(guardado).resolves.toEqual(
                        respuestaGuardada(),
                    );
                } else {
                    rechazar(new Error('fallo después del desmontaje'));
                    await expect(guardado).resolves.toBeNull();
                }
            });

            expect(renderCount).toBe(rendersAntesDeDesmontar);
        },
    );

    it('serializa procedimientos y conserva el último guardado confirmado si el siguiente falla', async () => {
        let resolverPrimero!: (respuesta: RespuestaGuardadaEstudiante) => void;
        mocks.guardarRespuestaRendicion
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    resolverPrimero = resolve;
                }),
            )
            .mockRejectedValueOnce(new Error('fallo del segundo guardado'));

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        const primero = payloadProcedimiento({
            valores: { x: 2 },
            resultado_final: '4',
        });
        const segundo = payloadProcedimiento({
            valores: { x: 5 },
            resultado_final: '25',
        });
        let promesaPrimera!: Promise<RespuestaGuardadaEstudiante | null>;
        let promesaSegunda!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            promesaPrimera = result.current.guardarProcedimiento(
                21,
                'a',
                primero,
            );
            promesaSegunda = result.current.guardarProcedimiento(
                21,
                'a',
                segundo,
            );
        });

        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(1),
        );
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            1,
            12,
            21,
            'a',
            primero,
        );

        await act(async () => {
            resolverPrimero(respuestaGuardada());
            await promesaPrimera;
        });
        expect(result.current.procedimientosLocales['21:a']).toEqual(
            procedimientoGuardado({
                valores: { x: 2 },
                resultado_final: '4',
            }),
        );

        await waitFor(() =>
            expect(mocks.guardarRespuestaRendicion).toHaveBeenCalledTimes(2),
        );
        expect(mocks.guardarRespuestaRendicion).toHaveBeenNthCalledWith(
            2,
            12,
            21,
            'a',
            segundo,
        );
        await act(async () => {
            await promesaSegunda;
        });

        expect(result.current.procedimientosLocales['21:a']).toEqual(
            procedimientoGuardado({
                valores: { x: 2 },
                resultado_final: '4',
            }),
        );
        expect(result.current.erroresGuardado['21:a']).toBe(
            'No se pudo guardar el procedimiento.',
        );
        expect(result.current.incisosGuardando).toEqual([]);
    });

    it('no actualiza el procedimiento local si falla su único PATCH', async () => {
        mocks.guardarRespuestaRendicion.mockRejectedValueOnce(
            new Error('fallo'),
        );
        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        await act(async () => {
            await result.current.guardarProcedimiento(
                21,
                'a',
                payloadProcedimiento(),
            );
        });

        expect(result.current.procedimientosLocales).toEqual({});
        expect(result.current.erroresGuardado['21:a']).toBe(
            'No se pudo guardar el procedimiento.',
        );
    });

    it('guardar un procedimiento no cambia la respuesta ni el progreso HU-22', async () => {
        const conRespuesta = crearPreguntas();
        conRespuesta.preguntas[0].estado_respuesta = 'respondida';
        conRespuesta.preguntas[0].incisos[0].respuesta = {
            opciones: [2],
        };
        mocks.getPreguntasRendicion.mockResolvedValue(conRespuesta);

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        await act(async () => {
            await result.current.guardarProcedimiento(
                21,
                'a',
                payloadProcedimiento(),
            );
        });

        expect(result.current.respuestasLocales['21:a']).toEqual({
            opciones: [2],
        });
        expect(result.current.preguntas[0].estado_respuesta).toBe('respondida');
        expect(result.current.procedimientosLocales['21:a']).toEqual(
            procedimientoGuardado(),
        );
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

    it('espera los guardados en curso antes de finalizar', async () => {
        let resolverGuardado!: (respuesta: RespuestaGuardadaEstudiante) => void;
        mocks.guardarRespuestaRendicion.mockReturnValueOnce(
            new Promise((resolve) => {
                resolverGuardado = resolve;
            }),
        );

        const { result } = renderHook(() => usePreguntasRendicion(12));
        await waitFor(() => expect(result.current.cargando).toBe(false));

        let guardado!: Promise<RespuestaGuardadaEstudiante | null>;
        act(() => {
            guardado = result.current.guardarRespuesta(21, 'a', {
                respuesta_texto: 'Última respuesta',
            });
        });

        let esperaResuelta = false;
        let espera!: Promise<{ fallidos: string[] }>;
        act(() => {
            espera = result.current
                .esperarGuardadosPendientes()
                .then((resultado) => {
                    esperaResuelta = true;
                    return resultado;
                });
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(esperaResuelta).toBe(false);

        let resultado!: { fallidos: string[] };
        await act(async () => {
            resolverGuardado(
                respuestaGuardada({ estado_respuesta: 'respondida' }),
            );
            resultado = await espera;
            await guardado;
        });

        expect(resultado).toEqual({ fallidos: [] });
        expect(result.current.respuestasLocales['21:a']).toEqual({
            respuesta_texto: 'Última respuesta',
        });
    });

    it('informa los incisos cuyo último guardado falló al finalizar', async () => {
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

        const resultado = await result.current.esperarGuardadosPendientes();

        expect(resultado.fallidos).toEqual(['21:a']);
    });
});
