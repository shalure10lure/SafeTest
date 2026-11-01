'use client';

import { useCallback, useEffect, useState } from 'react';

import { temasService } from '../services/temas.service';
import type { Tema } from '../types';

export function useTemas() {
    const [temas, setTemas] = useState<Tema[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            setTemas(await temasService.getAll());
        } catch {
            setError('No se pudieron cargar los temas');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    return { temas, isLoading, error, refetch: cargar };
}
