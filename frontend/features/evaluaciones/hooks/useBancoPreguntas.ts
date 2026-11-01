'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { evaluacionesService } from '../services/evaluaciones.service';
import type {
    BancoEvaluacion,
    PreguntaSeleccionada,
} from '../types';

export function useBancoPreguntas(
    examenId: number,
    materiaId?: number | null,
    /** Preguntas ya guardadas en la evaluación; se muestran aunque no estén en el banco. */
    iniciales: PreguntaSeleccionada[] = [],
) {
    const [banco, setBanco] = useState<BancoEvaluacion | null>(null);
    const [conocidas, setConocidas] = useState<
        Record<number, PreguntaSeleccionada>
    >(() =>
        Object.fromEntries(
            iniciales.map((pregunta) => [pregunta.pregunta_id, pregunta]),
        ),
    );
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
                        // El banco solo devuelve preguntas activas.
                        siguientes[pregunta.pregunta_id] = {
                            ...pregunta,
                            activo: true,
                        };
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