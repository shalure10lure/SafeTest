'use client';

import { useParams } from 'next/navigation';

import PasoPreguntas from '@/features/evaluaciones/components/PasoPreguntas';
import PasosEvaluacion from '@/features/evaluaciones/components/PasosEvaluacion';

export default function SeleccionPreguntasPage() {
    const { id } = useParams<{ id: string }>();
    const examenId = Number(id);

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
            <PasosEvaluacion pasoActual={2} />

            {Number.isInteger(examenId) && examenId > 0 ? (
                <PasoPreguntas examenId={examenId} />
            ) : (
                <p className="text-sm text-red-600">Evaluación no válida.</p>
            )}
        </main>
    );
}