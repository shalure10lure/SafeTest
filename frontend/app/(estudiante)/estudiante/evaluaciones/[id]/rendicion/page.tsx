import { notFound } from 'next/navigation';

import RendicionEvaluacion from '@/features/evaluaciones/components/RendicionEvaluacion';
import ControlTiempoRendicion from '@/features/evaluaciones/components/ControlTiempoRendicion';

export default async function RendicionEvaluacionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const examenId = Number(id);

    if (!Number.isSafeInteger(examenId) || examenId <= 0) {
        notFound();
    }

    return (
        <ControlTiempoRendicion examenId={examenId}>
            <RendicionEvaluacion examenId={examenId} />
        </ControlTiempoRendicion>
    );
}
