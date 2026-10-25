'use client';

import type { ReactNode } from 'react';

import AppShell from '@/components/layout/AppShell';
import RoleGuard from '@/features/auth/components/RoleGuard';
import {
    ResumenDocenteProvider,
    useResumenDocente,
} from '@/features/docente/hooks/useResumenDocente';
import {
    ACCIONES_TOPBAR_DOCENTE,
    NAV_DOCENTE,
    ROUTES,
} from '@/constants/routes';

function DocenteShell({ children }: { children: ReactNode }) {
    const { resumen } = useResumenDocente();

    return (
        <AppShell
            navegacion={NAV_DOCENTE}
            acciones={ACCIONES_TOPBAR_DOCENTE}
            etiquetaRol="DOC"
            nombreRol="Docente"
            inicioHref={ROUTES.docente.inicio}
            notificaciones={resumen?.notificaciones}
            badges={{
                evaluaciones: resumen?.examenesActivos,
                correccion: resumen?.evaluacionesPorCorregir,
            }}
        >
            {children}
        </AppShell>
    );
}

/**
 * Todas las páginas bajo /docente/* heredan Sidebar + Topbar desde aquí.
 * No hay que volver a montarlos en cada página.
 */
export default function DocenteLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <RoleGuard rolPermitido="docente">
            <ResumenDocenteProvider>
                <DocenteShell>{children}</DocenteShell>
            </ResumenDocenteProvider>
        </RoleGuard>
    );
}