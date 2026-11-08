import { notFound } from 'next/navigation';

import InstruccionesEvaluacion from '@/features/evaluaciones/components/InstruccionesEvaluacion';

export default async function InstruccionesEvaluacionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const examenId = Number(id);

    if (!Number.isSafeInteger(examenId) || examenId <= 0) {
        notFound();
    }

    return <InstruccionesEvaluacion examenId={examenId} />;
}
