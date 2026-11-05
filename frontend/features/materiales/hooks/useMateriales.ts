'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';

import { materialesService } from '../services/materiales.service';
import type { FiltrosMateriales, Material } from '../types';

export function useMateriales(filtros: FiltrosMateriales = {}) {
    const [materiales, setMateriales] = useState<Material[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [claveCompletada, setClaveCompletada] = useState<string | null>(
        null,
    );
    const [recarga, setRecarga] = useState(0);

    const filtrosKey = JSON.stringify(filtros);
    // Cambiar los filtros o pedir una recarga marca la consulta como pendiente
    // sin necesidad de un setState sincrónico dentro del efecto.
    const claveConsulta = `${filtrosKey}#${recarga}`;
    const isLoading = claveCompletada !== claveConsulta;

    // Solo la última petición puede actualizar el estado.
    const ultimaPeticion = useRef(0);

    const cargar = useCallback(() => {
        setRecarga((valor) => valor + 1);
    }, []);

    useEffect(() => {
        const peticion = ++ultimaPeticion.current;
        const vigente = () => peticion === ultimaPeticion.current;

        materialesService
            .getAll(JSON.parse(filtrosKey) as FiltrosMateriales)
            .then((datos) => {
                if (!vigente()) return;

                setMateriales(datos);
                setError(null);
            })
            .catch((err) => {
                if (!vigente()) return;

                setError(
                    mensajeDeError(
                        err,
                        'No se pudieron cargar los materiales.',
                    ),
                );
            })
            .finally(() => {
                if (vigente()) setClaveCompletada(claveConsulta);
            });

        return () => {
            // Invalida la petición en curso al desmontar o cambiar de filtros.
            ultimaPeticion.current += 1;
        };
    }, [filtrosKey, claveConsulta]);

    return { materiales, isLoading, error, cargar };
}
