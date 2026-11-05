'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    esErrorDefinitivoIa,
    mensajeErrorGeneracionIa,
} from '../errores';
import { iageneracionService } from '../services/iageneracion.service';
import type {
    CreacionGeneracionIa,
    CrearGeneracionIaDto,
    GeneracionIaDetalle,
} from '../types';

/** El worker revisa pendientes cada ~2 s; este intervalo evita ráfagas. */
const INTERVALO_CONSULTA_MS = 2_500;

/** ~5 minutos de seguimiento automático antes de pasar a consulta manual. */
const MAX_CONSULTAS = 120;

export function useGeneracionIa() {
    const [creacion, setCreacion] = useState<CreacionGeneracionIa | null>(
        null,
    );
    const [generacion, setGeneracion] = useState<GeneracionIaDetalle | null>(
        null,
    );
    const [generacionId, setGeneracionId] = useState<number | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [consultando, setConsultando] = useState(false);
    const [siguiendo, setSiguiendo] = useState(false);
    const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState('');
    const [errorSeguimiento, setErrorSeguimiento] = useState('');

    // Ref para bloquear el doble clic antes de que React actualice el estado.
    const enviandoRef = useRef(false);
    const generacionIdRef = useRef<number | null>(null);
    const montadoRef = useRef(true);

    useEffect(() => {
        montadoRef.current = true;

        return () => {
            montadoRef.current = false;
        };
    }, []);

    const crear = useCallback(async (dto: CrearGeneracionIaDto) => {
        if (enviandoRef.current) return null;

        enviandoRef.current = true;
        setEnviando(true);
        setErrorEnvio('');
        setErrorSeguimiento('');
        setCreacion(null);
        setGeneracion(null);
        setGeneracionId(null);
        generacionIdRef.current = null;
        setSiguiendo(false);
        setLimiteAlcanzado(false);

        try {
            const respuesta = await iageneracionService.crear(dto);

            if (!montadoRef.current) return null;

            setCreacion(respuesta);
            setGeneracionId(respuesta.generacion_id);
            generacionIdRef.current = respuesta.generacion_id;
            setSiguiendo(true);

            return respuesta;
        } catch (error) {
            if (montadoRef.current) {
                setErrorEnvio(
                    mensajeErrorGeneracionIa(
                        error,
                        'No se pudo enviar la solicitud de generación. Inténtalo de nuevo.',
                    ),
                );
            }

            return null;
        } finally {
            enviandoRef.current = false;

            if (montadoRef.current) setEnviando(false);
        }
    }, []);

    /**
     * Seguimiento con `setTimeout` recursivo: nunca hay dos consultas en vuelo
     * y el temporizador se cancela al desmontar o al cambiar de generación.
     */
    useEffect(() => {
        if (!siguiendo || generacionId === null) return;

        const id = generacionId;
        let cancelado = false;
        let temporizador: ReturnType<typeof setTimeout> | undefined;
        let consultas = 0;

        async function consultar() {
            consultas += 1;

            if (!cancelado) setConsultando(true);

            try {
                const datos = await iageneracionService.obtener(id);

                if (cancelado) return;

                setGeneracion(datos);
                setErrorSeguimiento('');

                if (
                    datos.estado === 'pendiente' ||
                    datos.estado === 'procesando'
                ) {
                    if (consultas >= MAX_CONSULTAS) {
                        setLimiteAlcanzado(true);
                        setSiguiendo(false);
                    } else {
                        temporizador = setTimeout(
                            consultar,
                            INTERVALO_CONSULTA_MS,
                        );
                    }
                } else {
                    setSiguiendo(false);
                }
            } catch (error) {
                if (cancelado) return;

                setErrorSeguimiento(
                    mensajeErrorGeneracionIa(
                        error,
                        'No se pudo consultar el estado de la generación.',
                    ),
                );

                if (
                    esErrorDefinitivoIa(error) ||
                    consultas >= MAX_CONSULTAS
                ) {
                    if (consultas >= MAX_CONSULTAS) setLimiteAlcanzado(true);
                    setSiguiendo(false);
                } else {
                    temporizador = setTimeout(
                        consultar,
                        INTERVALO_CONSULTA_MS,
                    );
                }
            } finally {
                if (!cancelado) setConsultando(false);
            }
        }

        temporizador = setTimeout(consultar, INTERVALO_CONSULTA_MS);

        return () => {
            cancelado = true;
            clearTimeout(temporizador);
        };
    }, [siguiendo, generacionId]);

    /** Consulta puntual tras el límite automático o un error transitorio. */
    const refrescar = useCallback(async () => {
        if (generacionId === null) return;

        setConsultando(true);
        setErrorSeguimiento('');

        try {
            const datos = await iageneracionService.obtener(generacionId);

            if (
                !montadoRef.current ||
                generacionIdRef.current !== generacionId
            ) {
                return;
            }

            setGeneracion(datos);
            setLimiteAlcanzado(false);

            if (
                datos.estado === 'pendiente' ||
                datos.estado === 'procesando'
            ) {
                setSiguiendo(true);
            }
        } catch (error) {
            if (montadoRef.current) {
                setErrorSeguimiento(
                    mensajeErrorGeneracionIa(
                        error,
                        'No se pudo consultar el estado de la generación.',
                    ),
                );
            }
        } finally {
            if (montadoRef.current) setConsultando(false);
        }
    }, [generacionId]);

    /** Limpia el panel de seguimiento; conserva la configuración del form. */
    const reiniciar = useCallback(() => {
        setSiguiendo(false);
        setCreacion(null);
        setGeneracion(null);
        setGeneracionId(null);
        generacionIdRef.current = null;
        setLimiteAlcanzado(false);
        setErrorEnvio('');
        setErrorSeguimiento('');
        setConsultando(false);
    }, []);

    return {
        creacion,
        generacion,
        enviando,
        consultando,
        siguiendo,
        limiteAlcanzado,
        errorEnvio,
        errorSeguimiento,
        crear,
        refrescar,
        reiniciar,
    };
}
