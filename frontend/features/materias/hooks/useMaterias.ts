'use client';

import { useCallback, useEffect, useState } from 'react';

import { materiasService } from '../services/materias.service';
import type { Materia } from '../types';

export function useMaterias() {
    const [materias, setMaterias] = useState<Materia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            setMaterias(await materiasService.getAll());
        } catch {
            setError('No se pudieron cargar las materias');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    return { materias, isLoading, error, refetch: cargar };
}