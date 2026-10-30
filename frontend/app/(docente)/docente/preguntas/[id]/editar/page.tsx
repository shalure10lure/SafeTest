
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { preguntasService } from '@/features/preguntas/services/preguntas.service';
import { temasService } from '@/features/temas/services/temas.service';

import type {
    DificultadPregunta,
    Pregunta,
} from '@/features/preguntas/types';

import type { Tema } from '@/features/temas/types';

export default function EditarPreguntaPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const id = Number(params.id);

    const [pregunta, setPregunta] = useState<Pregunta | null>(null);
    const [temas, setTemas] = useState<Tema[]>([]);
    const [enunciado, setEnunciado] = useState('');
    const [temaId, setTemaId] = useState('');
    const [dificultad, setDificultad] =
        useState<DificultadPregunta>('media');

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function cargarDatos() {
            if (!Number.isInteger(id) || id <= 0) {
                setError('El identificador de la pregunta no es válido.');
                setCargando(false);
                return;
            }

            try {
                const [datosPregunta, datosTemas] = await Promise.all([
                    preguntasService.getById(id),
                    temasService.getAll(),
                ]);

                setPregunta(datosPregunta);
                setEnunciado(datosPregunta.enunciado);
                setDificultad(datosPregunta.dificultad ?? 'media');
                setTemaId(String(datosPregunta.tema_id));
                setTemas(datosTemas);
            } catch {
                setError(
                    'No se pudo cargar la pregunta o los temas disponibles.',
                );
            } finally {
                setCargando(false);
            }
        }

        void cargarDatos();
    }, [id]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!enunciado.trim()) {
            setError('Escribe el enunciado de la pregunta.');
            return;
        }

        if (!temaId) {
            setError('Selecciona un tema para la pregunta.');
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
                tema_id: Number(temaId),
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

    if (!pregunta) {
        return (
            <main className="space-y-4 p-6">
                <p role="alert" className="text-red-600">
                    {error ?? 'No se encontró la pregunta.'}
                </p>

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

                <h1 className="mt-3 text-2xl font-bold">
                    Editar pregunta
                </h1>

                <p className="mt-1 text-sm text-gray-600">
                    Modifica el enunciado, el tema o la dificultad.
                </p>
            </div>

            {error && (
                <p
                    role="alert"
                    className="rounded-md bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label
                        htmlFor="enunciado"
                        className="block text-sm font-medium"
                    >
                        Enunciado
                    </label>

                    <textarea
                        id="enunciado"
                        value={enunciado}
                        onChange={(event) => setEnunciado(event.target.value)}
                        rows={5}
                        required
                        className="w-full rounded-md border border-gray-300 p-3 outline-none focus:border-blue-500"
                        placeholder="Escribe el enunciado de la pregunta"
                    />
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="tema"
                        className="block text-sm font-medium"
                    >
                        Tema
                    </label>

                    <select
                        id="tema"
                        value={temaId}
                        onChange={(event) => setTemaId(event.target.value)}
                        required
                        className="w-full rounded-md border border-gray-300 bg-white p-3"
                    >
                        <option value="">Selecciona un tema</option>

                        {temas.map((tema) => (
                            <option
                                key={tema.tema_id}
                                value={tema.tema_id}
                            >
                                {tema.nombre_tema}
                                {tema.materia?.nombre
                                    ? ` — ${tema.materia.nombre}`
                                    : ''}
                            </option>
                        ))}
                    </select>

                    {temas.length === 0 && (
                        <p className="text-sm text-amber-700">
                            No hay temas disponibles. Primero crea un tema.
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="dificultad"
                        className="block text-sm font-medium"
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
                        className="w-full rounded-md border border-gray-300 bg-white p-3"
                    >
                        <option value="facil">Fácil</option>
                        <option value="media">Media</option>
                        <option value="dificil">Difícil</option>
                    </select>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={guardando || temas.length === 0}
                        className="rounded-md bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {guardando ? 'Guardando...' : 'Guardar cambios'}
                    </button>

                    <Link
                        href="/docente/preguntas"
                        className="rounded-md border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-50"
                    >
                        Cancelar
                    </Link>
                </div>
            </form>
        </main>
    );
}
