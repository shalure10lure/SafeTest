
'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { preguntasService } from '@/features/preguntas/services/preguntas.service';
import type { DificultadPregunta } from '@/features/preguntas/types';

export default function NuevaPreguntaPage() {
    const router = useRouter();

    const [enunciado, setEnunciado] = useState('');
    const [dificultad, setDificultad] =
        useState<DificultadPregunta>('media');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!enunciado.trim()) {
            setError('Escribe el enunciado de la pregunta.');
            return;
        }

        setError(
            'Falta seleccionar un tema. Podrás guardar la pregunta cuando esté disponible el selector de temas.',
        );
    }

    return (
        <main className="mx-auto max-w-3xl space-y-6 p-6">
            <div>
                <Link
                    href="/docente/preguntas"
                    className="text-sm font-medium text-blue-700 hover:text-blue-900"
                >
                    ← Volver al banco de preguntas
                </Link>

                <h1 className="mt-4 text-2xl font-bold text-gray-900">
                    Crear pregunta
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Registra una pregunta para utilizarla en tus evaluaciones.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="space-y-6 rounded-xl border border-gray-200 bg-white p-6"
            >
                <div className="space-y-2">
                    <label
                        htmlFor="enunciado"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Enunciado de la pregunta
                    </label>

                    <textarea
                        id="enunciado"
                        value={enunciado}
                        onChange={(event) => setEnunciado(event.target.value)}
                        placeholder="Escribe aquí tu pregunta..."
                        rows={5}
                        maxLength={2000}
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />

                    <p className="text-right text-xs text-gray-500">
                        {enunciado.length}/2000 caracteres
                    </p>
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="dificultad"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Dificultad
                    </label>

                    <select
                        id="dificultad"
                        value={dificultad}
                        onChange={(event) =>
                            setDificultad(
                                event.target.value as DificultadPregunta,
                            )
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="facil">Fácil</option>
                        <option value="media">Media</option>
                        <option value="dificil">Difícil</option>
                    </select>
                </div>

                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700">
                        Tema de la pregunta
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                        El selector se conectará cuando implementes la HU de
                        gestión de temas.
                    </p>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
                    <Link
                        href="/docente/preguntas"
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </Link>

                    <button
                        type="submit"
                        disabled={guardando}
                        className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {guardando ? 'Guardando...' : 'Guardar pregunta'}
                    </button>
                </div>
            </form>
        </main>
    );
}
