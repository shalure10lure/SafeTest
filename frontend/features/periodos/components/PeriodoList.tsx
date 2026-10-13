'use client';

import Link from 'next/link';

import type { Periodo } from '../types';

export function PeriodoList({ periodos }: { periodos: Periodo[] }) {
    if (periodos.length === 0) {
        return (
            <p className="rounded-lg border bg-white p-6 text-sm text-slate-500">
                Aún no tienes periodos académicos registrados.
            </p>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                        <th className="px-4 py-3">Gestión</th>
                        <th className="px-4 py-3">Fechas</th>
                        <th className="px-4 py-3">Pruebas</th>
                        <th className="px-4 py-3">Materias</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {periodos.map((p) => (
                        <tr key={p.semestre_id} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{p.gestion}</td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                                {p.fecha_inicio ?? '—'} → {p.fecha_fin ?? '—'}
                            </td>
                            <td className="px-4 py-3">{p.nro_pruebas}</td>
                            <td className="px-4 py-3 text-xs">
                                {p.materias.length > 0
                                    ? p.materias.map((m) => m.codigo).join(', ')
                                    : 'Sin materias'}
                            </td>
                            <td className="px-4 py-3">
                                <span
                                    className={`rounded-full border px-2 py-0.5 text-xs ${p.activo
                                            ? 'border-green-300 bg-green-50 text-green-700'
                                            : 'border-slate-300 bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    {p.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <Link
                                    href={`/docente/periodos/${p.semestre_id}/editar`}
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