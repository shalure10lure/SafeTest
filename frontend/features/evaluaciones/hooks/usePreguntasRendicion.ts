'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type {
    PreguntaRendicionEstudiante,
    RespuestaGuardadaEstudiante,
    RespuestaRendicion,
} from '../types';

export function claveIncisoRendicion(preguntaId: number, letra: string) {
    return `${preguntaId}:${letra}`;
}

export function usePreguntasRendicion(examenId: number) {
    const [preguntas, setPreguntas] = useState<PreguntaRendicionEstudiante[]>(
        [],
    );
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [respuestasLocales, setRespuestasLocales] = useState<
        Record<string, RespuestaRendicion>
    >({});
    const [incisosGuardando, setIncisosGuardando] = useState<string[]>([]);
    const [erroresGuardado, setErroresGuardado] = useState<
        Record<string, string>
    >({});

    const montado = useRef(false);
    const preguntasActuales = useRef(preguntas);
    const examenCargado = useRef<number | null>(null);
    const versionesPregunta = useRef(new Map<number, number>());
    const versionesInciso = useRef(new Map<string, number>());
    const solicitudesCarga = useRef<{
        examenId: number;
        promesa: Promise<void>;
    } | null>(null);
    const colasPorPregunta = useRef(new Map<number, Promise<void>>());
    const solicitudesPorInciso = useRef(
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
        const solicitudExistente = solicitudesCarga.current;
        if (solicitudExistente?.examenId === examenId) {
            return solicitudExistente.promesa;
        }

        if (examenCargado.current !== examenId) {
            preguntasActuales.current = [];
            setPreguntas([]);
            setRespuestasLocales({});
            versionesPregunta.current.clear();
            examenCargado.current = null;
        }

        setCargando(true);
        setError('');

        const promesa = Promise.resolve().then(async () => {
            const versionesAlConsultar = new Map(versionesPregunta.current);
            try {
                const resultado =
                    await evaluacionesService.getPreguntasRendicion(examenId);

                if (
                    !montado.current ||
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
                examenCargado.current = examenId;
            } catch (errorConsulta) {
                if (
                    montado.current &&
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
                    if (montado.current) setCargando(false);
                }
            }
        });

        solicitudesCarga.current = { examenId, promesa };
        return promesa;
    }, [examenId]);

    const guardarRespuesta = useCallback(
        (preguntaId: number, letra: string, respuesta: RespuestaRendicion) => {
            const claveInciso = claveIncisoRendicion(preguntaId, letra);
            const contenido = JSON.stringify(respuesta);
            const solicitudReciente =
                solicitudesPorInciso.current.get(claveInciso);
            if (solicitudReciente?.contenido === contenido) {
                return solicitudReciente.promesa;
            }
            const version = (versionesInciso.current.get(claveInciso) ?? 0) + 1;
            versionesInciso.current.set(claveInciso, version);

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
                claveInciso,
                (pendientesPorInciso.current.get(claveInciso) ?? 0) + 1,
            );
            setIncisosGuardando((actuales) =>
                actuales.includes(claveInciso)
                    ? actuales
                    : [...actuales, claveInciso],
            );

            const colaAnterior =
                colasPorPregunta.current.get(preguntaId) ?? Promise.resolve();
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
                        versionesInciso.current.get(claveInciso) === version
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
                        versionesInciso.current.get(claveInciso) === version
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
                        (pendientesPorInciso.current.get(claveInciso) ?? 1) - 1;
                    if (pendientes === 0) {
                        pendientesPorInciso.current.delete(claveInciso);
                        if (montado.current) {
                            setIncisosGuardando((actuales) =>
                                actuales.filter(
                                    (clave) => clave !== claveInciso,
                                ),
                            );
                        }
                    } else {
                        pendientesPorInciso.current.set(
                            claveInciso,
                            pendientes,
                        );
                    }

                    if (
                        solicitudesPorInciso.current.get(claveInciso)
                            ?.promesa === promesa
                    ) {
                        solicitudesPorInciso.current.delete(claveInciso);
                    }
                }
            });
            const colaActual = promesa.then(
                () => undefined,
                () => undefined,
            );
            colasPorPregunta.current.set(preguntaId, colaActual);
            colaActual.then(() => {
                if (colasPorPregunta.current.get(preguntaId) === colaActual) {
                    colasPorPregunta.current.delete(preguntaId);
                }
            });

            solicitudesPorInciso.current.set(claveInciso, {
                contenido,
                promesa,
            });
            return promesa;
        },
        [actualizarPreguntas, examenId],
    );

    /**
     * Espera a que terminen todos los guardados en curso o encolados.
     * Devuelve los incisos cuyo último guardado falló para que la pantalla
     * no finalice la evaluación con respuestas sin guardar.
     */
    const esperarGuardadosPendientes = useCallback(async () => {
        // Un guardado nuevo puede encadenarse mientras esperamos la cola
        // anterior, por eso se repite hasta que no queden colas activas.
        while (colasPorPregunta.current.size > 0) {
            await Promise.allSettled([...colasPorPregunta.current.values()]);
        }

        return { fallidos: Object.keys(erroresGuardadoRef.current) };
    }, []);

    useEffect(() => {
        montado.current = true;
        void recargar();

        return () => {
            montado.current = false;
        };
    }, [recargar]);

    return {
        preguntas,
        cargando,
        error,
        recargar,
        respuestasLocales,
        incisosGuardando,
        erroresGuardado,
        guardarRespuesta,
        esperarGuardadosPendientes,
    };
}
