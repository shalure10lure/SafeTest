'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { evaluacionesService } from '../services/evaluaciones.service';
import type { BancoEvaluacion, PreguntaBanco } from '../types';

export function useBancoPreguntas(
    examenId: number,
    materiaId?: number | null,
) {
    const [banco, setBanco] = useState<BancoEvaluacion | null>(null);
    const [conocidas, setConocidas] = useState<Record<number, PreguntaBanco>>({});
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    // Solo la última petición puede actualizar el estado.
    const ultimaPeticion = useRef(0);

    const recargar = useCallback(async () => {
        const peticion = ++ultimaPeticion.current;
        const vigente = () => peticion === ultimaPeticion.current;

        setCargando(true);
        setError('');

        try {
            const datos = await evaluacionesService.getBanco(examenId, materiaId);

            if (vigente()) {
                setBanco(datos);
                setConocidas((previas) => {
                    const siguientes = { ...previas };

                    for (const pregunta of datos.preguntas) {
                        siguientes[pregunta.pregunta_id] = pregunta;
                    }

                    return siguientes;
                });
            }
        } catch {
            if (vigente()) setError('No se pudo cargar el banco de preguntas.');
        } finally {
            if (vigente()) setCargando(false);
        }
    }, [examenId, materiaId]);

    useEffect(() => {
        void recargar();
    }, [recargar]);

    return { banco, conocidas, cargando, error, recargar };
}