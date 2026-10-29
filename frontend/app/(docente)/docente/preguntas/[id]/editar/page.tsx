
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { preguntasService } from '@/features/preguntas/services/preguntas.service';
import type {
    DificultadPregunta,
    Pregunta,
} from '@/features/preguntas/types';

export default function EditarPreguntaPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const id = Number(params.id);

    const [pregunta, setPregunta] = useState<Pregunta | null>(null);
    const [enunciado, setEnunciado] = useState('');
    const [dificultad, setDificultad] =
        useState<DificultadPregunta>('media');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function cargarPregunta() {
            if (!Number.isInteger(id) || id <= 0) {
                setError('El identificador de la pregunta no es válido.');
                setCargando(false);
                return;
            }

            try {
                const datos = await preguntasService.getById(id);

                setPregunta(datos);
                setEnunciado(datos.enunciado);
                setDificultad(datos.dificultad ?? 'media');
            } catch {
                setError('No se pudo cargar la pregunta.');
            } finally {
                setCargando(false);
            }
        }

        void cargarPregunta();
    }, [id]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!enunciado.trim()) {
            setError('Escribe el enunciado de la pregunta.');
            return;
        }

        if (!pregunta) {
            setError('No se ha cargado la pregunta que deseas editar.');
            return;
        }

        try {
            setGuardando(true);

            await preguntasService.update(id, {
                enunciado: enunciado.trim(),
                dificultad,
            });

            router.push('/docente/preguntas');
            router.refresh();
        } catch {
            setError('No se pudieron guardar los cambios.');
        } finally {
            setGuardando(false);
        }
    }

    if (cargando) {
        return <main className="p-6">Cargando pregunta...</main>;
    }

    if (!pregunta && error) {
        return (
            <main className="space-y-4 p-6">
                <p role="alert" className="text-red-600">{error}</p>
                <Link
                    href="/docente/preguntas"
                    className="text-blue-700 hover:underline"
                >
                    Volver al banco de preguntas
                </Link>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl space-y-6 p-6">
            <div>
                <Link
                    href="/docente/preguntas"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Volver al banco de preguntas
                </Link>

                <h1 className="mt-4 text-2xl font-bold text-gray-900">
                    Editar pregunta
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Modifica el enunciado o la dificultad de la pregunta.
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
                        Enunciado
                    </label>

                    <textarea
                        id="enunciado"
                        value={enunciado}
                        onChange={(event) => setEnunciado(event.target.value)}
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
                        Tema
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                        {pregunta?.tema?.nombre_tema ??
                            `Tema ${pregunta?.tema_id}`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        La selección de temas se conectará cuando implementes
                        esa HU.
                    </p>
                </div>

                {error && (
                    <p role="alert" className="text-sm text-red-600">
                        {error}
                    </p>
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
                        disabled={guardando || !pregunta}
                        className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                        {guardando ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </form>
        </main>
    );
}
