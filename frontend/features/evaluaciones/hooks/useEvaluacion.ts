'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

import { evaluacionesService } from '../services/evaluaciones.service';
import type { EvaluacionDetalle } from '../types';

export function useEvaluacion(examenId: number) {
    const [evaluacion, setEvaluacion] = useState<EvaluacionDetalle | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const recargar = useCallback(async () => {
        setCargando(true);
        setError('');

        try {
            setEvaluacion(await evaluacionesService.getById(examenId));
        } catch (e) {
            setError(
                axios.isAxiosError(e) && e.response?.status === 404
                    ? 'La evaluación no existe.'
                    : 'No se pudo cargar la evaluación.',
            );
        } finally {
            setCargando(false);
        }
    }, [examenId]);

    useEffect(() => {
        void recargar();
    }, [recargar]);

    return { evaluacion, cargando, error, recargar };
}