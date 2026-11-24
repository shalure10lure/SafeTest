'use client';

import PanelEstadisticasView from '@/features/estadisticas/components/PanelEstadisticasView';

/**
 * Estadísticas del docente.
 * El título y el breadcrumb ya los muestra el Topbar (ver NAV_DOCENTE) y la
 * protección por rol la hace el layout de /docente, por eso aquí solo va
 * el contenido.
 */
export default function EstadisticasPage() {
    return (
        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
            <PanelEstadisticasView />
        </main>
    );
}
