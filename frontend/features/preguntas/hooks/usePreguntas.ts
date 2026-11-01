
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { preguntasService } from '../services/preguntas.service';
import type { FiltrosPreguntas, Pregunta } from '../types';

export function usePreguntas(filtros: FiltrosPreguntas = {}) {
    const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Solo la última petición puede actualizar el estado.
    const ultimaPeticion = useRef(0);
    const filtrosKey = JSON.stringify(filtros);

    const cargarPreguntas = useCallback(async () => {
        const peticion = ++ultimaPeticion.current;
        const vigente = () => peticion === ultimaPeticion.current;

        try {
            setIsLoading(true);
            setError(null);

            const datos = await preguntasService.getAll(
                JSON.parse(filtrosKey) as FiltrosPreguntas,
            );

            if (vigente()) setPreguntas(datos);
        } catch {
            if (vigente()) {
                setError('No se pudieron cargar las preguntas.');
            }
        } finally {
            if (vigente()) setIsLoading(false);
        }
    }, [filtrosKey]);

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
