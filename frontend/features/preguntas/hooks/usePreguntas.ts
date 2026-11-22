'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';

import { preguntasService } from '../services/preguntas.service';
import type { FiltrosPreguntas, Pregunta } from '../types';

export function usePreguntas(filtros: FiltrosPreguntas = {}) {
    const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Error al eliminar: se guarda aparte para no ocultar la lista.
    const [errorEliminacion, setErrorEliminacion] = useState<string | null>(
        null,
    );

    // Solo la última petición puede actualizar el estado.
    const ultimaPeticion = useRef(0);
    const filtrosKey = JSON.stringify(filtros);

    const cargarPreguntas = useCallback(async () => {
        const peticion = ++ultimaPeticion.current;
        const vigente = () => peticion === ultimaPeticion.current;

        try {
            const datos = await preguntasService.getAll(
                JSON.parse(filtrosKey) as FiltrosPreguntas,
            );

            if (vigente()) {
                setPreguntas(datos);
                setError(null);
            }
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
            try {
                setIsDeleting(true);
                setErrorEliminacion(null);

                await preguntasService.eliminar(id);
                await cargarPreguntas();
            } catch (err) {
                // Muestra el motivo real que envía el servidor
                // (por ejemplo, pregunta vinculada a un examen).
                setErrorEliminacion(
                    mensajeDeError(
                        err,
                        'No se pudo eliminar la pregunta.',
                    ),
                );
            } finally {
                setIsDeleting(false);
            }
        },
        [cargarPreguntas],
    );

    const limpiarErrorEliminacion = useCallback(() => {
        setErrorEliminacion(null);
    }, []);

    useEffect(() => {
        let cancelado = false;

        void Promise.resolve().then(() => {
            if (!cancelado) {
                void cargarPreguntas();
            }
        });

        return () => {
            cancelado = true;
        };
    }, [cargarPreguntas]);

    return {
        preguntas,
        isLoading,
        isDeleting,
        error,
        errorEliminacion,
        cargarPreguntas,
        eliminarPregunta,
        limpiarErrorEliminacion,
    };
}
