'use client';

import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type { InstruccionesEvaluacionEstudiante } from '../types';

export function useInstruccionesEvaluacion(examenId: number) {
    const [instrucciones, setInstrucciones] =
        useState<InstruccionesEvaluacionEstudiante | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [noDisponible, setNoDisponible] = useState(false);
    const montado = useRef(false);
    const solicitudEnCurso = useRef<{
        examenId: number;
        promesa: Promise<void>;
    } | null>(null);

    const recargar = useCallback(() => {
        if (solicitudEnCurso.current?.examenId === examenId) {
            return solicitudEnCurso.current.promesa;
        }

        setCargando(true);
        setError('');
        setNoDisponible(false);
        setInstrucciones(null);

        const promesa = Promise.resolve().then(async () => {
            try {
                const datos =
                    await evaluacionesService.getInstruccionesEstudiante(
                        examenId,
                    );

                if (
                    montado.current &&
                    solicitudEnCurso.current?.promesa === promesa
                ) {
                    setInstrucciones(datos);
                }
            } catch (errorConsulta) {
                if (
                    montado.current &&
                    solicitudEnCurso.current?.promesa === promesa
                ) {
                    const estado = axios.isAxiosError(errorConsulta)
                        ? errorConsulta.response?.status
                        : undefined;

                    setNoDisponible(estado === 403 || estado === 404);
                    setError(
                        mensajeDeError(
                            errorConsulta,
                            'No se pudieron cargar las instrucciones de la evaluación.',
                        ),
                    );
                }
            } finally {
                if (solicitudEnCurso.current?.promesa === promesa) {
                    solicitudEnCurso.current = null;
                    if (montado.current) {
                        setCargando(false);
                    }
                }
            }
        });

        solicitudEnCurso.current = { examenId, promesa };
        return promesa;
    }, [examenId]);

    useEffect(() => {
        montado.current = true;
        void recargar();

        return () => {
            montado.current = false;
        };
    }, [recargar]);

    return { instrucciones, cargando, error, noDisponible, recargar };
}
