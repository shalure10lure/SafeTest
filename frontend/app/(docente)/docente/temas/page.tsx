
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { temasService } from '@/features/temas/services/temas.service';
import { materiasService } from '@/features/materias/services/materias.service';
import type { Tema } from '@/features/temas/types';
import type { Materia } from '@/features/materias/types';

export default function TemasPage() {
    const [temas, setTemas] = useState<Tema[]>([]);
    const [materias, setMaterias] = useState<Materia[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargarDatos = useCallback(async () => {
        try {
            setCargando(true);
            setError(null);

            const [temasObtenidos, materiasObtenidas] =
                await Promise.all([
                    temasService.getAll(),
                    materiasService.getAll(),
                ]);

            setTemas(temasObtenidos);
            setMaterias(materiasObtenidas.filter((materia) => materia.activo));
        } catch {
            setError('No se pudieron cargar los temas. Comprueba tu sesión y la conexión con el servidor.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        void cargarDatos();
    }, [cargarDatos]);

    return (
        <main className="mx-auto max-w-6xl space-y-6 p-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Gestión de temas
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Organiza los temas de tus materias.
                    </p>
                </div>

                <Link
                    href="/docente/temas/nueva"
                    className="rounded-lg bg-blue-700 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800"
                >
                    Crear tema
                </Link>
            </header>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <p className="text-sm text-gray-500">Temas registrados</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {temas.length}
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <p className="text-sm text-gray-500">Materias activas</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {materias.length}
                    </p>
                </div>
            </section>

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {error}
                    <button
                        type="button"
                        onClick={() => void cargarDatos()}
                        className="ml-2 font-semibold underline"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-5 py-4">
                    <h2 className="font-semibold text-gray-900">
                        Mis temas
                    </h2>
                </div>

                {cargando ? (
                    <p className="p-5 text-sm text-gray-500">
                        Cargando temas...
                    </p>
                ) : temas.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="font-medium text-gray-900">
                            Todavía no tienes temas registrados.
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            Crea un tema y asígnalo a una de tus materias activas.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Tema</th>
                                    <th className="px-5 py-3 font-medium">Materia</th>
                                    <th className="px-5 py-3 text-right font-medium">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {temas.map((tema) => {
                                    const materia = materias.find(
                                        (item) => item.materia_id === tema.materia_id,
                                    );

                                    return (
                                        <tr key={tema.tema_id}>
                                            <td className="px-5 py-4 font-medium text-gray-900">
                                                {tema.nombre_tema}
                                            </td>
                                            <td className="px-5 py-4 text-gray-600">
                                                {materia?.nombre ?? `Materia ${tema.materia_id}`}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <Link
                                                    href={`/docente/temas/${tema.tema_id}/editar`}
                                                    className="font-medium text-blue-700 hover:underline"
                                                >
                                                    Editar
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}
