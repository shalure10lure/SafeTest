'use client';

import ResumenAcademicoView from '@/features/docente/components/ResumenAcademicoView';

/** Gestión académica > Resumen. El título lo pone el Topbar (ver NAV_DOCENTE). */
export default function ResumenAcademicoPage() {
    return (
        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
            <ResumenAcademicoView />
        </main>
    );
}
