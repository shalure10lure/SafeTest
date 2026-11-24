'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import { describirError } from '@/lib/mensajes';
import { docenteDashboardService } from '../services/docente-dashboard.service';
import type { ResumenDocente } from '../types';

interface ResumenDocenteContextType {
    resumen: ResumenDocente | null;
    cargando: boolean;
    /** Mensaje ya explicado para el docente (qué falló y qué hacer). */
    error: { titulo: string; detalle: string } | null;
    recargar: () => Promise<void>;
}

const ResumenDocenteContext =
    createContext<ResumenDocenteContextType | null>(null);

/**
 * Se monta una sola vez en el layout del docente. Así el Sidebar
 * (badges), el Topbar (notificaciones) y la página de Inicio
 * comparten la misma petición.
 */
export function ResumenDocenteProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [resumen, setResumen] = useState<ResumenDocente | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null);

    const recargar = useCallback(async () => {
        setCargando(true);
        setError(null);

        try {
            setResumen(await docenteDashboardService.getResumen());
        } catch (fallo) {
            setError(describirError(fallo, 'No se pudo cargar tu resumen'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        void recargar();
    }, [recargar]);

    return (
        <ResumenDocenteContext.Provider
            value={{ resumen, cargando, error, recargar }}
        >
            {children}
        </ResumenDocenteContext.Provider>
    );
}

export function useResumenDocente() {
    const contexto = useContext(ResumenDocenteContext);

    if (!contexto) {
        throw new Error(
            'useResumenDocente debe utilizarse dentro de ResumenDocenteProvider.',
        );
    }

    return contexto;
}
