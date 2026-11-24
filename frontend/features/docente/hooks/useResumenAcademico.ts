'use client';

import { useCallback, useEffect, useState } from 'react';

import { describirError } from '@/lib/mensajes';
import { docenteDashboardService } from '../services/docente-dashboard.service';
import type { ResumenAcademico } from '../types';

/** Carga los datos de la pantalla "Gestión académica" (Resumen). */
export function useResumenAcademico() {
    const [datos, setDatos] = useState<ResumenAcademico | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);

        try {
            setDatos(await docenteDashboardService.getResumenAcademico());
        } catch (fallo) {
            setError(describirError(fallo, 'No se pudo cargar la gestión académica'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    return { datos, cargando, error, recargar: cargar };
}
