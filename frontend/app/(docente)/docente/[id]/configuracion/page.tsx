'use client';

import { useParams } from 'next/navigation';

import ConfiguracionEvaluacion from '@/features/evaluaciones/components/ConfiguracionEvaluacion';
import PasosEvaluacion from '@/features/evaluaciones/components/PasosEvaluacion';

export default function ConfiguracionEvaluacionPage() {
    const params = useParams<{ id: string }>();
    const examenId = Number(params.id);

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
            <PasosEvaluacion pasoActual={3} />

            {Number.isInteger(examenId) && examenId > 0 ? (
                <ConfiguracionEvaluacion examenId={examenId} />
            ) : (
                <p className="text-sm text-red-600" role="alert">
                    La evaluación no es válida.
                </p>
            )}
        </main>
    );
}