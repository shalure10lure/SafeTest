
'use client';

import type { Pregunta } from '../types';

interface PreguntaListProps {
    preguntas: Pregunta[];
    isLoading: boolean;
    error: string | null;
    onEliminar: (id: number) => void;
}

export default function PreguntaList({
    preguntas,
    isLoading,
    error,
    onEliminar,
}: PreguntaListProps) {
    if (isLoading) {
        return (
            <div className="py-8 text-center text-gray-500">
                Cargando preguntas...
            </div>
        );
    }

    if (error) {
        return (
            <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
            >
                {error}
            </div>
        );
    }

    if (preguntas.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                <p className="font-medium text-gray-700">
                    Todavía no tienes preguntas.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                    Crea una pregunta para comenzar tu banco de preguntas.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="divide-y divide-gray-200">
                {preguntas.map((pregunta) => (
                    <article
                        key={pregunta.pregunta_id}
                        className="p-5 transition hover:bg-gray-50"
                    >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900">
                                    {pregunta.enunciado}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                                        {pregunta.tema?.nombre_tema ??
                                            `Tema ${pregunta.tema_id}`}
                                    </span>

                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                                        Dificultad:{' '}
                                        {pregunta.dificultad ?? 'No definida'}
                                    </span>

                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                                        Origen: {pregunta.origen}
                                    </span>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-start gap-3">
                                <a
                                    href={`/docente/preguntas/${pregunta.pregunta_id}/editar`}
                                    className="text-sm font-medium text-blue-700 hover:text-blue-900"
                                >
                                    Editar
                                </a>

                                <button
                                    type="button"
                                    onClick={() =>
                                        onEliminar(pregunta.pregunta_id)
                                    }
                                    className="text-sm font-medium text-red-600 hover:text-red-800"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
