
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { preguntasService } from '@/features/preguntas/services/preguntas.service';
import { temasService } from '@/features/temas/services/temas.service';

import type { DificultadPregunta } from '@/features/preguntas/types';
import type { Tema } from '@/features/temas/types';

export default function NuevaPreguntaPage() {
    const router = useRouter();

    const [enunciado, setEnunciado] = useState('');
    const [dificultad, setDificultad] =
        useState<DificultadPregunta>('media');
    const [temaId, setTemaId] = useState('');
    const [temas, setTemas] = useState<Tema[]>([]);
    const [cargandoTemas, setCargandoTemas] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        async function cargarTemas() {
            try {
                const resultado = await temasService.getAll();
                setTemas(resultado);
            } catch {
                setError(
                    'No se pudieron cargar los temas. Comprueba tu sesión y la conexión con el servidor.',
                );
            } finally {
                setCargandoTemas(false);
            }
        }

        void cargarTemas();
    }, []);

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

        try {
            setGuardando(true);

            await preguntasService.create({
                enunciado: enunciado.trim(),
                tema_id: Number(temaId),
                dificultad,
            });

            router.push('/docente/preguntas');
            router.refresh();
        } catch {
            setError(
                'No se pudo guardar la pregunta. Verifica los datos y que tu sesión de docente siga activa.',
            );
        } finally {
            setGuardando(false);
        }
    }

    return (
        <main className="mx-auto max-w-3xl space-y-6 p-6">
            <header>
                <Link
                    href="/docente/preguntas"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Volver al banco de preguntas
                </Link>

                <h1 className="mt-3 text-2xl font-bold text-gray-900">
                    Crear pregunta
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Registra una pregunta y relaciónala con uno de tus temas.
                </p>
            </header>

            <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-xl border border-gray-200 bg-white p-6"
            >
                <div>
                    <label
                        htmlFor="enunciado"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Enunciado de la pregunta
                    </label>

                    <textarea
                        id="enunciado"
                        value={enunciado}
                        onChange={(event) => setEnunciado(event.target.value)}
                        rows={4}
                        required
                        placeholder="Escribe aquí la pregunta..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                <div>
                    <label
                        htmlFor="temaId"
                        className="mb-2 block text-sm font-medium text-gray-700"
                    >
                        Tema
                    </label>

                    <select
                        id="temaId"
                        value={temaId}
                        onChange={(event) => setTemaId(event.target.value)}
                        required
                        disabled={cargandoTemas || temas.length === 0}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    >
                        <option value="">
                            {cargandoTemas
                                ? 'Cargando temas...'
                                : temas.length === 0
                                  ? 'No hay temas disponibles'
                                  : 'Selecciona un tema'}
                        </option>

                        {temas.map((tema) => (
                            <option
                                key={tema.tema_id}
                                value={tema.tema_id}
                            >
                                {tema.nombre_tema}
                            </option>
                        ))}
                    </select>

                    {!cargandoTemas && temas.length === 0 && (
                        <p className="mt-2 text-sm text-gray-500">
                            Primero registra un tema en Gestión de temas.
                            <Link
                                href="/docente/temas/nuevo"
                                className="ml-1 font-medium text-blue-700 hover:underline"
                            >
                                Crear tema
                            </Link>
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="dificultad"
                        className="mb-2 block text-sm font-medium text-gray-700"
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
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="facil">Fácil</option>
                        <option value="media">Media</option>
                        <option value="dificil">Difícil</option>
                    </select>
                </div>

                {error && (
                    <p
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                        {error}
                    </p>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Link
                        href="/docente/preguntas"
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </Link>

                    <button
                        type="submit"
                        disabled={
                            guardando ||
                            cargandoTemas ||
                            temas.length === 0
                        }
                        className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {guardando ? 'Guardando...' : 'Guardar pregunta'}
                    </button>
                </div>
            </form>
        </main>
    );
}
