'use client';

import { useParams } from 'next/navigation';

import RevisionGeneracionIa from '@/features/iageneracion/components/RevisionGeneracionIa';

export default function RevisarGeneracionIaPage() {
    const parametros = useParams<{ generacionId: string }>();
    const generacionId = Number(parametros.generacionId);

    if (!Number.isSafeInteger(generacionId) || generacionId < 1) {
        return (
            <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
                <p role="alert" className="text-sm text-red-700">
                    El identificador de generación no es válido.
                </p>
            </main>
        );
    }

    return (
        <RevisionGeneracionIa
            key={generacionId}
            generacionId={generacionId}
        />
    );
}
