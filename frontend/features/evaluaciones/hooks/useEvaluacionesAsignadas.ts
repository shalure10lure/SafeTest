'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type { EvaluacionAsignada } from '../types';

export function useEvaluacionesAsignadas() {
    const [evaluaciones, setEvaluaciones] = useState<EvaluacionAsignada[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const montado = useRef(false);
    const solicitudEnCurso = useRef<Promise<void> | null>(null);

    const recargar = useCallback(() => {
        if (solicitudEnCurso.current) {
            return solicitudEnCurso.current;
        }

        const solicitud = Promise.resolve().then(async () => {
            if (montado.current) {
                setCargando(true);
                setError('');
            }

            try {
                const datos =
                    await evaluacionesService.getAsignadasEstudiante();

                if (montado.current) {
                    setEvaluaciones(datos);
                }
            } catch (errorConsulta) {
                if (montado.current) {
                    setError(
                        mensajeDeError(
                            errorConsulta,
                            'No se pudieron cargar las evaluaciones asignadas.',
                        ),
                    );
                }
            } finally {
                solicitudEnCurso.current = null;
                if (montado.current) {
                    setCargando(false);
                }
            }
        });

        solicitudEnCurso.current = solicitud;
        return solicitud;
    }, []);

    useEffect(() => {
        montado.current = true;
        void recargar();

        return () => {
            montado.current = false;
        };
    }, [recargar]);

    return {
        evaluaciones,
        cargando,
        estaVacio: !cargando && !error && evaluaciones.length === 0,
        error,
        recargar,
    };
}
