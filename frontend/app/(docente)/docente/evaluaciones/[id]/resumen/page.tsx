'use client';

import { useParams } from 'next/navigation';

import PasosEvaluacion from '@/features/evaluaciones/components/PasosEvaluacion';
import ResumenPublicacion from '@/features/evaluaciones/components/ResumenPublicacion';

export default function ResumenPublicacionPage() {
    const params = useParams<{ id: string }>();
    const examenId = Number(params.id);
    const valido = Number.isInteger(examenId) && examenId > 0;

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
            <PasosEvaluacion pasoActual={5} />

            {valido ? (
                <ResumenPublicacion examenId={examenId} />
            ) : (
                <p className="text-sm text-red-600" role="alert">
                    La evaluación no es válida.
                </p>
            )}
        </main>
    );
}
