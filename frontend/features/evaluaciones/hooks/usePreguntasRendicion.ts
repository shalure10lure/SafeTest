'use client';

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import { mensajeDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type {
    GuardarProcedimientoRendicion,
    PreguntaRendicionEstudiante,
    ProcedimientoRendicion,
    RespuestaGuardadaEstudiante,
    RespuestaRendicion,
} from '../types';

export function claveIncisoRendicion(preguntaId: number, letra: string) {
    return `${preguntaId}:${letra}`;
}

function claveGuardado(examenId: number, preguntaId: number, letra: string) {
    return `${examenId}:${preguntaId}:${letra}`;
}

function claveCola(examenId: number, preguntaId: number) {
    return `${examenId}:${preguntaId}`;
}

interface UsePreguntasRendicionResult {
    preguntas: PreguntaRendicionEstudiante[];
    cargando: boolean;
    error: string;
    recargar: () => Promise<void>;
    respuestasLocales: Record<string, RespuestaRendicion>;
    procedimientosLocales: Record<string, ProcedimientoRendicion>;
    incisosGuardando: string[];
    erroresGuardado: Record<string, string>;
    guardarRespuesta: (
        preguntaId: number,
        letra: string,
        respuesta: RespuestaRendicion,
    ) => Promise<RespuestaGuardadaEstudiante | null>;
    guardarProcedimiento: (
        preguntaId: number,
        letra: string,
        procedimiento: GuardarProcedimientoRendicion,
    ) => Promise<RespuestaGuardadaEstudiante | null>;
    esperarGuardadosPendientes: () => Promise<{ fallidos: string[] }>;
}

export function usePreguntasRendicion(
    examenId: number,
): UsePreguntasRendicionResult {
    const [preguntas, setPreguntas] = useState<PreguntaRendicionEstudiante[]>(
        [],
    );
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [respuestasLocales, setRespuestasLocales] = useState<
        Record<string, RespuestaRendicion>
    >({});
    const [procedimientosLocales, setProcedimientosLocales] = useState<
        Record<string, ProcedimientoRendicion>
    >({});
    const procedimientosActuales = useRef<
        Record<string, ProcedimientoRendicion>
    >({});
    const [incisosGuardando, setIncisosGuardando] = useState<string[]>([]);
    const [erroresGuardado, setErroresGuardado] = useState<
        Record<string, string>
    >({});

    const montado = useRef(false);
    const versionMontaje = useRef(0);
    const preguntasActuales = useRef(preguntas);
    const examenCargado = useRef<number | null>(null);
    const versionesPregunta = useRef(new Map<number, number>());
    const versionesInciso = useRef(new Map<string, number>());
    const solicitudesCarga = useRef<{
        examenId: number;
        versionContexto: number;
        versionMontaje: number;
        promesa: Promise<void>;
    } | null>(null);
    const colasPorPregunta = useRef(new Map<string, Promise<void>>());
    const solicitudesPorInciso = useRef(
        new Map<
            string,
            {
                contenido: string;
                promesa: Promise<RespuestaGuardadaEstudiante | null>;
            }
        >(),
    );
    const versionesProcedimiento = useRef(new Map<string, number>());
    const versionesProcedimientoConfirmado = useRef(new Map<string, number>());
    const solicitudesProcedimientoPorInciso = useRef(
        new Map<
            string,
            {
                contenido: string;
                promesa: Promise<RespuestaGuardadaEstudiante | null>;
            }
        >(),
    );
    const pendientesPorInciso = useRef(new Map<string, number>());
    // Copia sincrónica de los errores de guardado: permite consultarlos al
    // finalizar justo después de esperar las colas, sin depender del estado.
    const erroresGuardadoRef = useRef<Record<string, string>>({});
    const contextoExamen = useRef({ examenId, version: 0 });

    useLayoutEffect(() => {
        if (contextoExamen.current.examenId === examenId) return;

        contextoExamen.current = {
            examenId,
            version: contextoExamen.current.version + 1,
        };
        preguntasActuales.current = [];
        examenCargado.current = null;
        versionesPregunta.current.clear();
        erroresGuardadoRef.current = {};
        procedimientosActuales.current = {};
        setPreguntas([]);
        setRespuestasLocales({});
        setProcedimientosLocales({});
        setIncisosGuardando([]);
        setErroresGuardado({});
        setCargando(true);
        setError('');
    }, [examenId]);

    const actualizarPreguntas = useCallback(
        (
            actualizar: (
                actuales: PreguntaRendicionEstudiante[],
            ) => PreguntaRendicionEstudiante[],
        ) => {
            const siguientes = actualizar(preguntasActuales.current);
            preguntasActuales.current = siguientes;
            setPreguntas(siguientes);
        },
        [],
    );

    const recargar = useCallback(() => {
        const versionContexto = contextoExamen.current.version;
        const versionMontajeSolicitud = versionMontaje.current;
        const solicitudExistente = solicitudesCarga.current;
        if (
            solicitudExistente?.examenId === examenId &&
            solicitudExistente.versionContexto === versionContexto &&
            solicitudExistente.versionMontaje === versionMontajeSolicitud
        ) {
            return solicitudExistente.promesa;
        }

        if (examenCargado.current !== examenId) {
            preguntasActuales.current = [];
            procedimientosActuales.current = {};
            setPreguntas([]);
            setRespuestasLocales({});
            setProcedimientosLocales({});
            versionesPregunta.current.clear();
            examenCargado.current = null;
        }

        setCargando(true);
        setError('');
        const versionesProcedimientoAlConsultar = new Map(
            versionesProcedimientoConfirmado.current,
        );

        const promesa = Promise.resolve().then(async () => {
            const versionesAlConsultar = new Map(versionesPregunta.current);
            try {
                const resultado =
                    await evaluacionesService.getPreguntasRendicion(examenId);

                if (
                    !montado.current ||
                    versionMontaje.current !== versionMontajeSolicitud ||
                    contextoExamen.current.examenId !== examenId ||
                    contextoExamen.current.version !== versionContexto ||
                    solicitudesCarga.current?.promesa !== promesa
                ) {
                    return;
                }

                const actuales = preguntasActuales.current;
                const preguntasActualizadas = resultado.preguntas.map(
                    (pregunta) => {
                        const versionInicial = versionesAlConsultar.get(
                            pregunta.pregunta_id,
                        );
                        const versionActual = versionesPregunta.current.get(
                            pregunta.pregunta_id,
                        );
                        const preguntaActual = actuales.find(
                            (item) => item.pregunta_id === pregunta.pregunta_id,
                        );

                        return preguntaActual &&
                            versionActual !== versionInicial
                            ? {
                                  ...pregunta,
                                  estado_respuesta:
                                      preguntaActual.estado_respuesta,
                              }
                            : pregunta;
                    },
                );

                preguntasActuales.current = preguntasActualizadas;
                setPreguntas(preguntasActualizadas);

                // Precarga lo que el servidor ya tiene guardado; lo que se
                // guardó en esta sesión es más reciente y prevalece.
                const guardadasEnServidor: Record<string, RespuestaRendicion> =
                    {};
                for (const pregunta of resultado.preguntas) {
                    for (const inciso of pregunta.incisos) {
                        if (inciso.respuesta) {
                            guardadasEnServidor[
                                claveIncisoRendicion(
                                    pregunta.pregunta_id,
                                    inciso.letra,
                                )
                            ] = inciso.respuesta;
                        }
                    }
                }
                setRespuestasLocales((actuales) => ({
                    ...guardadasEnServidor,
                    ...actuales,
                }));

                const procedimientosEnServidor: Record<
                    string,
                    ProcedimientoRendicion
                > = {};
                for (const pregunta of resultado.preguntas) {
                    for (const inciso of pregunta.incisos) {
                        if (inciso.procedimiento) {
                            procedimientosEnServidor[
                                claveIncisoRendicion(
                                    pregunta.pregunta_id,
                                    inciso.letra,
                                )
                            ] = inciso.procedimiento;
                        }
                    }
                }
                for (const [
                    claveOperacion,
                    version,
                ] of versionesProcedimientoConfirmado.current) {
                    if (
                        version ===
                        versionesProcedimientoAlConsultar.get(claveOperacion)
                    ) {
                        continue;
                    }

                    const claveInciso = claveOperacion.slice(
                        claveOperacion.indexOf(':') + 1,
                    );
                    const procedimientoActual =
                        procedimientosActuales.current[claveInciso];
                    if (procedimientoActual) {
                        procedimientosEnServidor[claveInciso] =
                            procedimientoActual;
                    } else {
                        delete procedimientosEnServidor[claveInciso];
                    }
                }
                procedimientosActuales.current = procedimientosEnServidor;
                setProcedimientosLocales(procedimientosEnServidor);
                examenCargado.current = examenId;
            } catch (errorConsulta) {
                if (
                    montado.current &&
                    versionMontaje.current === versionMontajeSolicitud &&
                    contextoExamen.current.examenId === examenId &&
                    contextoExamen.current.version === versionContexto &&
                    solicitudesCarga.current?.promesa === promesa
                ) {
                    setError(
                        mensajeDeError(
                            errorConsulta,
                            'No se pudieron cargar las preguntas de la evaluación.',
                        ),
                    );
                }
            } finally {
                if (solicitudesCarga.current?.promesa === promesa) {
                    solicitudesCarga.current = null;
                    if (
                        montado.current &&
                        versionMontaje.current === versionMontajeSolicitud &&
                        contextoExamen.current.examenId === examenId &&
                        contextoExamen.current.version === versionContexto
                    ) {
                        setCargando(false);
                    }
                }
            }
        });

        solicitudesCarga.current = {
            examenId,
            versionContexto,
            versionMontaje: versionMontajeSolicitud,
            promesa,
        };
        return promesa;
    }, [examenId]);

    const guardarRespuesta = useCallback(
        (preguntaId: number, letra: string, respuesta: RespuestaRendicion) => {
            const claveInciso = claveIncisoRendicion(preguntaId, letra);
            const claveOperacion = claveGuardado(examenId, preguntaId, letra);
            const versionContexto = contextoExamen.current.version;
            const versionMontajeSolicitud = versionMontaje.current;
            const contenido = JSON.stringify(respuesta);
            const solicitudReciente =
                solicitudesPorInciso.current.get(claveOperacion);
            if (solicitudReciente?.contenido === contenido) {
                return solicitudReciente.promesa;
            }
            const version =
                (versionesInciso.current.get(claveOperacion) ?? 0) + 1;
            versionesInciso.current.set(claveOperacion, version);

            const copiaRespuesta: RespuestaRendicion =
                'opciones' in respuesta
                    ? { opciones: [...respuesta.opciones] }
                    : { respuesta_texto: respuesta.respuesta_texto };

            setErroresGuardado((actuales) => {
                const siguientes = { ...actuales };
                delete siguientes[claveInciso];
                return siguientes;
            });
            delete erroresGuardadoRef.current[claveInciso];
            pendientesPorInciso.current.set(
                claveOperacion,
                (pendientesPorInciso.current.get(claveOperacion) ?? 0) + 1,
            );
            setIncisosGuardando((actuales) =>
                actuales.includes(claveInciso)
                    ? actuales
                    : [...actuales, claveInciso],
            );

            const colaAnterior =
                colasPorPregunta.current.get(claveCola(examenId, preguntaId)) ??
                Promise.resolve();
            const promesa = colaAnterior.then(async () => {
                try {
                    const resultado =
                        await evaluacionesService.guardarRespuestaRendicion(
                            examenId,
                            preguntaId,
                            letra,
                            copiaRespuesta,
                        );

                    if (
                        montado.current &&
                        versionMontaje.current === versionMontajeSolicitud &&
                        contextoExamen.current.examenId === examenId &&
                        contextoExamen.current.version === versionContexto &&
                        versionesInciso.current.get(claveOperacion) === version
                    ) {
                        setRespuestasLocales((actuales) => ({
                            ...actuales,
                            [claveInciso]: copiaRespuesta,
                        }));
                        actualizarPreguntas((actuales) =>
                            actuales.map((pregunta) =>
                                pregunta.pregunta_id === preguntaId
                                    ? {
                                          ...pregunta,
                                          estado_respuesta:
                                              resultado.estado_respuesta,
                                      }
                                    : pregunta,
                            ),
                        );
                        versionesPregunta.current.set(
                            preguntaId,
                            (versionesPregunta.current.get(preguntaId) ?? 0) +
                                1,
                        );
                        setErroresGuardado((actuales) => {
                            const siguientes = { ...actuales };
                            delete siguientes[claveInciso];
                            return siguientes;
                        });
                        delete erroresGuardadoRef.current[claveInciso];
                    }

                    return resultado;
                } catch (errorRespuesta) {
                    if (
                        montado.current &&
                        versionMontaje.current === versionMontajeSolicitud &&
                        contextoExamen.current.examenId === examenId &&
                        contextoExamen.current.version === versionContexto &&
                        versionesInciso.current.get(claveOperacion) === version
                    ) {
                        const mensaje = mensajeDeError(
                            errorRespuesta,
                            'No se pudo guardar la respuesta.',
                        );
                        erroresGuardadoRef.current[claveInciso] = mensaje;
                        setErroresGuardado((actuales) => ({
                            ...actuales,
                            [claveInciso]: mensaje,
                        }));
                    }
                    return null;
                } finally {
                    const pendientes =
                        (pendientesPorInciso.current.get(claveOperacion) ?? 1) -
                        1;
                    if (pendientes === 0) {
                        pendientesPorInciso.current.delete(claveOperacion);
                        if (
                            montado.current &&
                            versionMontaje.current ===
                                versionMontajeSolicitud &&
                            contextoExamen.current.examenId === examenId &&
                            contextoExamen.current.version === versionContexto
                        ) {
                            setIncisosGuardando((actuales) =>
                                actuales.filter(
                                    (clave) => clave !== claveInciso,
                                ),
                            );
                        }
                    } else {
                        pendientesPorInciso.current.set(
                            claveOperacion,
                            pendientes,
                        );
                    }

                    if (
                        solicitudesPorInciso.current.get(claveOperacion)
                            ?.promesa === promesa
                    ) {
                        solicitudesPorInciso.current.delete(claveOperacion);
                    }
                }
            });
            const colaActual = promesa.then(
                () => undefined,
                () => undefined,
            );
            const claveColaActual = claveCola(examenId, preguntaId);
            colasPorPregunta.current.set(claveColaActual, colaActual);
            colaActual.then(() => {
                if (
                    colasPorPregunta.current.get(claveColaActual) === colaActual
                ) {
                    colasPorPregunta.current.delete(claveColaActual);
                }
            });

            solicitudesPorInciso.current.set(claveOperacion, {
                contenido,
                promesa,
            });
            return promesa;
        },
        [actualizarPreguntas, examenId],
    );

    const guardarProcedimiento = useCallback(
        (
            preguntaId: number,
            letra: string,
            procedimiento: GuardarProcedimientoRendicion,
        ) => {
            const claveInciso = claveIncisoRendicion(preguntaId, letra);
            const claveOperacion = claveGuardado(examenId, preguntaId, letra);
            const versionContexto = contextoExamen.current.version;
            const versionMontajeSolicitud = versionMontaje.current;
            const contenido = JSON.stringify(procedimiento);
            const solicitudReciente =
                solicitudesProcedimientoPorInciso.current.get(claveOperacion);
            if (solicitudReciente?.contenido === contenido) {
                return solicitudReciente.promesa;
            }

            const version =
                (versionesProcedimiento.current.get(claveOperacion) ?? 0) + 1;
            versionesProcedimiento.current.set(claveOperacion, version);

            const copiaProcedimiento: GuardarProcedimientoRendicion = {
                modelo_id: procedimiento.modelo_id,
                formula_ids: [...procedimiento.formula_ids],
                valores: { ...procedimiento.valores },
                ...(procedimiento.resultado_final !== undefined
                    ? { resultado_final: procedimiento.resultado_final }
                    : {}),
            };

            setErroresGuardado((actuales) => {
                const siguientes = { ...actuales };
                delete siguientes[claveInciso];
                return siguientes;
            });
            delete erroresGuardadoRef.current[claveInciso];
            pendientesPorInciso.current.set(
                claveOperacion,
                (pendientesPorInciso.current.get(claveOperacion) ?? 0) + 1,
            );
            setIncisosGuardando((actuales) =>
                actuales.includes(claveInciso)
                    ? actuales
                    : [...actuales, claveInciso],
            );

            const colaAnterior =
                colasPorPregunta.current.get(claveCola(examenId, preguntaId)) ??
                Promise.resolve();
            const promesa = colaAnterior.then(async () => {
                try {
                    const resultado =
                        await evaluacionesService.guardarRespuestaRendicion(
                            examenId,
                            preguntaId,
                            letra,
                            copiaProcedimiento,
                        );

                    if (
                        montado.current &&
                        versionMontaje.current === versionMontajeSolicitud &&
                        contextoExamen.current.examenId === examenId &&
                        contextoExamen.current.version === versionContexto
                    ) {
                        versionesProcedimientoConfirmado.current.set(
                            claveOperacion,
                            (versionesProcedimientoConfirmado.current.get(
                                claveOperacion,
                            ) ?? 0) + 1,
                        );
                        const procedimientosActualizados = {
                            ...procedimientosActuales.current,
                            [claveInciso]: {
                                modelo_id: copiaProcedimiento.modelo_id,
                                valores: copiaProcedimiento.valores,
                                resultado_final:
                                    copiaProcedimiento.resultado_final ?? null,
                                formula_ids: copiaProcedimiento.formula_ids,
                            },
                        };
                        procedimientosActuales.current =
                            procedimientosActualizados;
                        setProcedimientosLocales(procedimientosActualizados);
                        setErroresGuardado((actuales) => {
                            const siguientes = { ...actuales };
                            delete siguientes[claveInciso];
                            return siguientes;
                        });
                        delete erroresGuardadoRef.current[claveInciso];
                    }

                    return resultado;
                } catch (errorProcedimiento) {
                    if (
                        montado.current &&
                        versionMontaje.current === versionMontajeSolicitud &&
                        contextoExamen.current.examenId === examenId &&
                        contextoExamen.current.version === versionContexto &&
                        versionesProcedimiento.current.get(claveOperacion) ===
                            version
                    ) {
                        const mensaje = mensajeDeError(
                            errorProcedimiento,
                            'No se pudo guardar el procedimiento.',
                        );
                        erroresGuardadoRef.current[claveInciso] = mensaje;
                        setErroresGuardado((actuales) => ({
                            ...actuales,
                            [claveInciso]: mensaje,
                        }));
                    }
                    return null;
                } finally {
                    const pendientes =
                        (pendientesPorInciso.current.get(claveOperacion) ?? 1) -
                        1;
                    if (pendientes === 0) {
                        pendientesPorInciso.current.delete(claveOperacion);
                        if (
                            montado.current &&
                            versionMontaje.current ===
                                versionMontajeSolicitud &&
                            contextoExamen.current.examenId === examenId &&
                            contextoExamen.current.version === versionContexto
                        ) {
                            setIncisosGuardando((actuales) =>
                                actuales.filter(
                                    (clave) => clave !== claveInciso,
                                ),
                            );
                        }
                    } else {
                        pendientesPorInciso.current.set(
                            claveOperacion,
                            pendientes,
                        );
                    }

                    if (
                        solicitudesProcedimientoPorInciso.current.get(
                            claveOperacion,
                        )?.promesa === promesa
                    ) {
                        solicitudesProcedimientoPorInciso.current.delete(
                            claveOperacion,
                        );
                    }
                }
            });
            const colaActual = promesa.then(
                () => undefined,
                () => undefined,
            );
            const claveColaActual = claveCola(examenId, preguntaId);
            colasPorPregunta.current.set(claveColaActual, colaActual);
            colaActual.then(() => {
                if (
                    colasPorPregunta.current.get(claveColaActual) === colaActual
                ) {
                    colasPorPregunta.current.delete(claveColaActual);
                }
            });

            solicitudesProcedimientoPorInciso.current.set(claveOperacion, {
                contenido,
                promesa,
            });
            return promesa;
        },
        [examenId],
    );

    /**
     * Espera a que terminen todos los guardados en curso o encolados.
     * Devuelve los incisos cuyo último guardado falló para que la pantalla
     * no finalice la evaluación con respuestas sin guardar.
     */
    const esperarGuardadosPendientes = useCallback(async () => {
        // Un guardado nuevo puede encadenarse mientras esperamos la cola
        // anterior, por eso se repite hasta que no queden colas activas.
        const prefijoCola = `${examenId}:`;
        while (
            [...colasPorPregunta.current.keys()].some((clave) =>
                clave.startsWith(prefijoCola),
            )
        ) {
            const colasActuales = [...colasPorPregunta.current.entries()]
                .filter(([clave]) => clave.startsWith(prefijoCola))
                .map(([, promesa]) => promesa);
            await Promise.allSettled(colasActuales);
        }

        return { fallidos: Object.keys(erroresGuardadoRef.current) };
    }, [examenId]);

    useEffect(() => {
        montado.current = true;
        versionMontaje.current += 1;
        void recargar();

        return () => {
            montado.current = false;
            versionMontaje.current += 1;
        };
    }, [recargar]);

    return {
        preguntas,
        cargando,
        error,
        recargar,
        respuestasLocales,
        procedimientosLocales,
        incisosGuardando,
        erroresGuardado,
        guardarRespuesta,
        guardarProcedimiento,
        esperarGuardadosPendientes,
    };
}
