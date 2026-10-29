
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { temasService } from '@/features/temas/services/temas.service';
import { materiasService } from '@/features/materias/services/materias.service';
import type { Tema } from '@/features/temas/types';
import type { Materia } from '@/features/materias/types';

export default function EditarTemaPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = Number(params.id);

    const [tema, setTema] = useState<Tema | null>(null);
    const [nombreTema, setNombreTema] = useState('');
    const [materiaId, setMateriaId] = useState('');
    const [materias, setMaterias] = useState<Materia[]>([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function cargarDatos() {
            if (!Number.isInteger(id) || id <= 0) {
                setError('El identificador del tema no es válido.');
                setCargando(false);
                return;
            }

            try {
                const [temaObtenido, materiasObtenidas] = await Promise.all([
                    temasService.getById(id),
                    materiasService.getAll(),
                ]);

                const materiasActivas = materiasObtenidas.filter(
                    (materia) =>
                        materia.activo ||
                        materia.materia_id === temaObtenido.materia_id,
                );

                setTema(temaObtenido);
                setNombreTema(temaObtenido.nombre_tema);
                setMateriaId(String(temaObtenido.materia_id));
                setMaterias(materiasActivas);
            } catch {
                setError('No se pudo cargar el tema. Comprueba tu sesión y la conexión con el servidor.');
            } finally {
                setCargando(false);
            }
        }

        void cargarDatos();
    }, [id]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        const nombre = nombreTema.trim();

        if (!nombre) {
            setError('Escribe el nombre del tema.');
            return;
        }

        if (!materiaId) {
            setError('Selecciona una materia.');
            return;
        }

        try {
            setGuardando(true);

            await temasService.update(id, {
                nombre_tema: nombre,
                materia_id: Number(materiaId),
            });

            router.push('/docente/temas');
            router.refresh();
        } catch {
            setError(
                'No se pudieron guardar los cambios. Verifica que el nombre no esté repetido en la materia y que la sesión siga activa.',
            );
        } finally {
            setGuardando(false);
        }
    }

    if (cargando) {
        return (
            <main className="p-6">
                <p className="text-sm text-gray-500">Cargando tema...</p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl space-y-6 p-6">
            <header>
                <Link
                    href="/docente/temas"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Volver a temas
                </Link>

                <h1 className="mt-3 text-2xl font-bold text-gray-900">
                    Editar tema
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Modifica el nombre o la materia a la que pertenece el tema.
                </p>
            </header>

            {tema && (
                <form
                    onSubmit={handleSubmit}
                    className="space-y-5 rounded-xl border border-gray-200 bg-white p-6"
                >
                    <div>
                        <label
                            htmlFor="nombreTema"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Nombre del tema
                        </label>

                        <input
                            id="nombreTema"
                            type="text"
                            value={nombreTema}
                            onChange={(event) => setNombreTema(event.target.value)}
                            maxLength={150}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="materiaId"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Materia
                        </label>

                        <select
                            id="materiaId"
                            value={materiaId}
                            onChange={(event) => setMateriaId(event.target.value)}
                            required
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">Selecciona una materia</option>

                            {materias.map((materia) => (
                                <option
                                    key={materia.materia_id}
                                    value={materia.materia_id}
                                >
                                    {materia.nombre}
                                    {!materia.activo ? ' (inactiva)' : ''}
                                </option>
                            ))}
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
                            href="/docente/temas"
                            className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </Link>

                        <button
                            type="submit"
                            disabled={guardando}
                            className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            )}

            {!tema && error && (
                <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {error}
                </p>
            )}
        </main>
    );
}
