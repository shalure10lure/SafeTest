'use client';

import { useParams } from 'next/navigation';

import AsignacionEvaluacion from '@/features/evaluaciones/components/AsignacionEvaluacion';
import PasosEvaluacion from '@/features/evaluaciones/components/PasosEvaluacion';

export default function AsignacionEvaluacionPage() {
    const params = useParams<{ id: string }>();
    const examenId = Number(params.id);

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
            <PasosEvaluacion pasoActual={4} />

            {Number.isInteger(examenId) && examenId > 0 ? (
                <AsignacionEvaluacion examenId={examenId} />
            ) : (
                <p className="text-sm text-red-600" role="alert">
                    La evaluación no es válida.
                </p>
            )}
        </main>
    );
}