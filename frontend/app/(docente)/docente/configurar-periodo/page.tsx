'use client';

import AsistentePeriodo from '@/features/configuracion-academica/components/AsistentePeriodo';

/**
 * Asistente "Configurar periodo".
 * El título y el breadcrumb los pone el Topbar (ver NAV_DOCENTE) y la
 * protección por rol la hace el layout de /docente.
 */
export default function ConfigurarPeriodoPage() {
    return (
        <main className="p-4 sm:p-6">
            <AsistentePeriodo />
        </main>
    );
}
