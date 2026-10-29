'use client';

import { useParams } from 'next/navigation';

import PasosEvaluacion from '@/features/evaluaciones/components/PasosEvaluacion';
import SeleccionPreguntas from '@/features/evaluaciones/components/SeleccionPreguntas';

export default function SeleccionPreguntasPage() {
    const params = useParams<{ id: string }>();
    const examenId = Number(params.id);
    const valido = Number.isInteger(examenId) && examenId > 0;

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
            <PasosEvaluacion pasoActual={2} />

            {valido ? (
                <SeleccionPreguntas examenId={examenId} />
            ) : (
                <p className="text-sm text-red-600" role="alert">
                    La evaluación no es válida.
                </p>
            )}
        </main>
    );
}