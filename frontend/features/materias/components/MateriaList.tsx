'use client';

import Link from 'next/link';

import type { Materia } from '../types';

export function MateriaList({ materias }: { materias: Materia[] }) {
    if (materias.length === 0) {
        return (
            <p className="rounded-lg border bg-white p-6 text-sm text-slate-500">
                Aún no tienes materias registradas.
            </p>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {materias.map((m) => (
                        <tr key={m.materia_id} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{m.nombre}</td>
                            <td className="px-4 py-3 font-mono text-xs">{m.codigo}</td>
                            <td className="px-4 py-3">
                                <span
                                    className={`rounded-full border px-2 py-0.5 text-xs ${m.activo
                                            ? 'border-green-300 bg-green-50 text-green-700'
                                            : 'border-slate-300 bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    {m.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <Link
                                    href={`/docente/materias/${m.materia_id}/editar`}
                                    className="text-violet-600 hover:underline"
                                >
                                    Editar
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}