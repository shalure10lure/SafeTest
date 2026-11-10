'use client';

import { useCallback, useEffect, useState } from 'react';

import type { RecursoPregunta } from '@/features/preguntas/types';

import { evaluacionesService } from '../services/evaluaciones.service';

interface EstadoRecursos {
    clave: string;
    recursos: RecursoPregunta[];
    error: boolean;
}

/**
 * Fórmulas, tablas e imágenes de una pregunta de la rendición en curso.
 * El servidor solo los entrega si la pregunta fue asignada al estudiante.
 */
export function useRecursosRendicion(examenId: number, preguntaId: number) {
    const clave = `${examenId}:${preguntaId}`;
    const [estado, setEstado] = useState<EstadoRecursos | null>(null);

    useEffect(() => {
        let vigente = true;

        evaluacionesService
            .getRecursosPreguntaRendicion(examenId, preguntaId)
            .then((recursos) => {
                if (vigente) setEstado({ clave, recursos, error: false });
            })
            .catch(() => {
                if (vigente) setEstado({ clave, recursos: [], error: true });
            });

        return () => {
            vigente = false;
        };
    }, [examenId, preguntaId, clave]);

    const cargarImagen = useCallback(
        (recurso: string) =>
            evaluacionesService.getImagenRecursoRendicion(
                examenId,
                preguntaId,
                recurso,
            ),
        [examenId, preguntaId],
    );

    // Si el estado es de otra pregunta, todavía se está cargando la actual.
    const actual = estado?.clave === clave ? estado : null;

    return {
        recursos: actual?.recursos ?? [],
        cargando: actual === null,
        error: actual?.error ?? false,
        cargarImagen,
    };
}
