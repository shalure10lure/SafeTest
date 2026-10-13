'use client';

import { useCallback, useEffect, useState } from 'react';

import { periodosService } from '../services/periodos.service';
import type { Periodo } from '../types';

export function usePeriodos() {
    const [periodos, setPeriodos] = useState<Periodo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            setPeriodos(await periodosService.getAll());
        } catch {
            setError('No se pudieron cargar los periodos');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    return { periodos, isLoading, error, refetch: cargar };
}