'use client';

import { useCallback, useEffect, useState } from 'react';

import { evaluacionesService } from '../services/evaluaciones.service';
import type { Evaluacion } from '../types';

export function useEvaluaciones() {
    const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const recargar = useCallback(async () => {
        setCargando(true);
        setError('');

        try {
            setEvaluaciones(await evaluacionesService.getAll());
        } catch {
            setError('No se pudieron cargar las evaluaciones.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        void recargar();
    }, [recargar]);

    return { evaluaciones, cargando, error, recargar };
}