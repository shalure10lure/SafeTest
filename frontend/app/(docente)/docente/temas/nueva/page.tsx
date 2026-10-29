
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { temasService } from '@/features/temas/services/temas.service';
import { materiasService } from '@/features/materias/services/materias.service';
import type { Materia } from '@/features/materias/types';

export default function NuevoTemaPage() {
    const router = useRouter();

    const [nombreTema, setNombreTema] = useState('');
    const [materiaId, setMateriaId] = useState('');
    const [materias, setMaterias] = useState<Materia[]>([]);
    const [cargandoMaterias, setCargandoMaterias] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function cargarMaterias() {
            try {
                const resultado = await materiasService.getAll();
                const activas = resultado.filter((materia) => materia.activo);

                setMaterias(activas);
            } catch {
                setError('No se pudieron cargar las materias. Comprueba tu sesión.');
            } finally {
                setCargandoMaterias(false);
            }
        }

        void cargarMaterias();
    }, []);

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

            await temasService.create({
                nombre_tema: nombre,
                materia_id: Number(materiaId),
            });

            router.push('/docente/temas');
            router.refresh();
        } catch {
            setError(
                'No se pudo crear el tema. Verifica que no exista otro tema con ese nombre en la materia y que la sesión siga activa.',
            );
        } finally {
            setGuardando(false);
        }
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
                    Crear tema
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Registra un tema y relaciónalo con una de tus materias activas.
                </p>
            </header>

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
                        placeholder="Ej. Ecuaciones diferenciales"
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
                        disabled={cargandoMaterias || materias.length === 0}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    >
                        <option value="">
                            {cargandoMaterias
                                ? 'Cargando materias...'
                                : materias.length === 0
                                  ? 'No hay materias activas'
                                  : 'Selecciona una materia'}
                        </option>

                        {materias.map((materia) => (
                            <option
                                key={materia.materia_id}
                                value={materia.materia_id}
                            >
                                {materia.nombre}
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
                        disabled={
                            guardando ||
                            cargandoMaterias ||
                            materias.length === 0
                        }
                        className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {guardando ? 'Guardando...' : 'Guardar tema'}
                    </button>
                </div>
            </form>
        </main>
    );
}
