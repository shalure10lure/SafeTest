'use client';

import { useCallback, useEffect, useState } from 'react';

import { estadisticasService } from '../services/estadisticas.service';
import type {
    EstadisticasMateria,
    MateriaEstadistica,
} from '../types';

export function useEstadisticas() {
    const [materias, setMaterias] = useState<MateriaEstadistica[]>([]);
    const [materiaSeleccionada, setMateriaSeleccionada] = useState<number | null>(null);
    const [estadisticas, setEstadisticas] = useState<EstadisticasMateria | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
    };
}