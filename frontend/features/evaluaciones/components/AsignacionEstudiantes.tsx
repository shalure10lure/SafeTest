'use client';

import { cn } from '@/lib/utils';

import type { AsignacionParalelo } from '../types';

interface AsignacionEstudiantesProps {
    paralelos: AsignacionParalelo[];
    seleccionados: number[];
    onAlternar: (estudianteId: number) => void;
    onAlternarParalelo: (paralelo: AsignacionParalelo) => void;
}

export default function AsignacionEstudiantes({
    paralelos,
    seleccionados,
    onAlternar,
    onAlternarParalelo,
}: AsignacionEstudiantesProps) {
    return (
        <div className="space-y-4">
            {paralelos.map((paralelo) => {
                const marcados = paralelo.estudiantes.filter((estudiante) =>
                    seleccionados.includes(estudiante.estudiante_id),
                ).length;
                const todos =
                    paralelo.estudiantes.length > 0 &&
                    marcados === paralelo.estudiantes.length;

                return (
                    <section
                        key={paralelo.paralelo_id}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                        <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    {paralelo.nombre_paralelo}
                                </h3>
                                <p className="text-xs text-slate-500 tabular-nums">
                                    {marcados} de {paralelo.estudiantes.length} seleccionados
                                </p>
                            </div>

                            {paralelo.estudiantes.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => onAlternarParalelo(paralelo)}
                                    className="text-xs font-medium text-violet-700 hover:underline focus-visible:outline-2 focus-visible:outline-violet-600"
                                >
                                    {todos ? 'Quitar todos' : 'Seleccionar todos'}
                                </button>
                            )}
                        </header>

                        {paralelo.estudiantes.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-slate-500">
                                Este paralelo no tiene estudiantes inscritos.
                            </p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {paralelo.estudiantes.map((estudiante) => {
                                    const marcado = seleccionados.includes(
                                        estudiante.estudiante_id,
                                    );

                                    return (
                                        <li key={estudiante.estudiante_id}>
                                            <label
                                                className={cn(
                                                    'flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors',
                                                    marcado ? 'bg-violet-50/60' : 'hover:bg-slate-50',
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={marcado}
                                                    onChange={() => onAlternar(estudiante.estudiante_id)}
                                                    className="size-4 accent-violet-600"
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm text-slate-900">
                                                        {estudiante.nombre_completo}
                                                    </span>
                                                    <span className="block truncate text-xs text-slate-500">
                                                        {estudiante.correo_institucional}
                                                    </span>
                                                </span>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                );
            })}
        </div>
    );
}