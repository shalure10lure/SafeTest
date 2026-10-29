
'use client';

import { useCallback, useEffect, useState } from 'react';

import { preguntasService } from '../services/preguntas.service';
import type { Pregunta } from '../types';

export function usePreguntas() {
    const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cargarPreguntas = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const datos = await preguntasService.getAll();
            setPreguntas(datos);
        } catch {
            setError('No se pudieron cargar las preguntas.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const eliminarPregunta = useCallback(
        async (id: number) => {
            const confirmar = window.confirm(
                '¿Estás seguro de que deseas eliminar esta pregunta?',
            );

            if (!confirmar) return;

            try {
                setIsDeleting(true);
                setError(null);

                await preguntasService.eliminar(id);
                await cargarPreguntas();
            } catch {
                setError('No se pudo eliminar la pregunta.');
            } finally {
                setIsDeleting(false);
            }
        },
        [cargarPreguntas],
    );

    useEffect(() => {
        void cargarPreguntas();
    }, [cargarPreguntas]);

    return {
        preguntas,
        isLoading,
        isDeleting,
        error,
        cargarPreguntas,
        eliminarPregunta,
    };
}
