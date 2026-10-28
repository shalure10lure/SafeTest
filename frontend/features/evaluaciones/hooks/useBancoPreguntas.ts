'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { evaluacionesService } from '../services/evaluaciones.service';
import type { BancoEvaluacion } from '../types';

export function useBancoPreguntas(
    examenId: number,
    materiaId?: number | null,
) {
    const [banco, setBanco] = useState<BancoEvaluacion | null>(null);
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
            if (vigente()) setBanco(datos);
        } catch {
            if (vigente()) setError('No se pudo cargar el banco de preguntas.');
        } finally {
            if (vigente()) setCargando(false);
        }
    }, [examenId, materiaId]);

    useEffect(() => {
        void recargar();
    }, [recargar]);

    return { banco, cargando, error, recargar };
}