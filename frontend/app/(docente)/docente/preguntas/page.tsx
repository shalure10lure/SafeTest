
'use client';

import Link from 'next/link';

import PreguntaList from '@/features/preguntas/components/PreguntaList';
import { usePreguntas } from '@/features/preguntas/hooks/usePreguntas';

export default function PreguntasPage() {
    const {
        preguntas,
        isLoading,
        isDeleting,
        error,
        eliminarPregunta,
    } = usePreguntas();

    return (
        <main className="space-y-6 p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Banco de preguntas
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Administra las preguntas de tus materias.
                    </p>
                </div>

                <Link
                    href="/docente/preguntas/nuevo"
                    className="rounded-lg bg-blue-700 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800"
                >
                    Crear pregunta
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <p className="text-sm text-gray-500">
                        Preguntas registradas
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {preguntas.length}
                    </p>
                </div>
            </div>

            {isDeleting && (
                <p className="text-sm text-gray-500">
                    Eliminando pregunta...
                </p>
            )}

            <PreguntaList
                preguntas={preguntas}
                isLoading={isLoading}
                error={error}
                onEliminar={eliminarPregunta}
            />
        </main>
    );
}
