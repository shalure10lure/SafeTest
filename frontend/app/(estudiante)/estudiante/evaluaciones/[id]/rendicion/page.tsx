import { notFound } from 'next/navigation';

import RendicionEvaluacion from '@/features/evaluaciones/components/RendicionEvaluacion';

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

    return <RendicionEvaluacion examenId={examenId} />;
}
