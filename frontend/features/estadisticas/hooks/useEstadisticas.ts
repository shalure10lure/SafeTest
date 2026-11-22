'use client';

import { useCallback, useEffect, useState } from 'react';

import { estadisticasService } from '../services/estadisticas.service';
import type {
    ComparacionPeriodos,
    EstadisticasMateria,
    MateriaEstadistica,
} from '../types';

export function useEstadisticas() {
    const [materias, setMaterias] = useState<MateriaEstadistica[]>([]);
    const [materiaSeleccionada, setMateriaSeleccionada] = useState<number | null>(null);
    const [estadisticas, setEstadisticas] = useState<EstadisticasMateria | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [comparacion, setComparacion] = useState<ComparacionPeriodos | null>(null);
    const [isLoadingComparacion, setIsLoadingComparacion] = useState(false);
    const [errorComparacion, setErrorComparacion] = useState<string | null>(null);

    const cargarMaterias = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const datos = await estadisticasService.getMaterias();
            setMaterias(datos);

            if (datos.length > 0) {
                setMateriaSeleccionada((actual) => actual ?? datos[0].materia_id);
            } else {
                setMateriaSeleccionada(null);
                setEstadisticas(null);
            }
        } catch {
            setError('No se pudieron cargar las materias');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const cargarEstadisticas = useCallback(async (materiaId: number) => {
        try {
            setIsLoading(true);
            setError(null);

            const datos = await estadisticasService.getPorMateria(materiaId);
            setEstadisticas(datos);
        } catch {
            setEstadisticas(null);
            setError('No se pudieron cargar las estadísticas de esta materia');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const compararPeriodos = useCallback(async (
        materiaId: number,
        periodoIds: number[],
    ) => {
        try {
            setIsLoadingComparacion(true);
            setErrorComparacion(null);

            const datos = await estadisticasService.compararPeriodos(
                materiaId,
                periodoIds,
            );

            setComparacion(datos);
        } catch {
            setComparacion(null);
            setErrorComparacion('No se pudo realizar la comparación de periodos');
        } finally {
            setIsLoadingComparacion(false);
        }
    }, []);
    const limpiarComparacion = useCallback(() => {
        setComparacion(null);
        setErrorComparacion(null);
    }, []);

    useEffect(() => {
        cargarMaterias();
    }, [cargarMaterias]);

    useEffect(() => {
        if (materiaSeleccionada !== null) {
            cargarEstadisticas(materiaSeleccionada);
        }
    }, [materiaSeleccionada, cargarEstadisticas]);

    return {
        materias,
        materiaSeleccionada,
        setMateriaSeleccionada,
        estadisticas,
        isLoading,
        error,
        refetch: cargarMaterias,
        comparacion,
        isLoadingComparacion,
        errorComparacion,
        compararPeriodos,
        setComparacion,
        limpiarComparacion,
    };
}