'use client';

import Link from 'next/link';

import type { Paralelo } from '../types';

interface Props {
  paralelos: Paralelo[];
  cargando: boolean;
  error: string;
}

export default function ParaleloList({
  paralelos,
  cargando,
  error,
}: Props) {
  if (cargando) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Cargando paralelos...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Paralelo</th>
              <th className="px-5 py-4">Materia</th>
              <th className="px-5 py-4">Periodo</th>
              <th className="px-5 py-4">Estudiantes</th>
              <th className="px-5 py-4">Estado</th>
              <th className="px-5 py-4">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paralelos.map((paralelo) => (
              <tr
                key={paralelo.paralelo_id}
                className="hover:bg-slate-50"
              >
                <td className="px-5 py-4 font-medium text-slate-800">
                  {paralelo.nombre_paralelo}
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {paralelo.materia?.nombre ?? 'Sin información'}
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {paralelo.semestre?.gestion ?? 'Sin información'}
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {paralelo.inscripciones?.length ?? '—'}
                </td>

                <td className="px-5 py-4">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Registrado
                  </span>
                </td>

                <td className="px-5 py-4">
                  <Link
                    href={`/docente/paralelos/${paralelo.paralelo_id}/editar`}
                    className="font-medium text-violet-700 hover:text-violet-900"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}

            {paralelos.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-slate-500"
                >
                  Todavía no tienes paralelos registrados.
                  <p className="mt-2">
                    Crea tu primer paralelo para comenzar.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}