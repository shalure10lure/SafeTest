'use client';

import { cn } from '@/lib/utils';

import type { AsignacionParalelo } from '../types';

interface AsignacionParalelosProps {
    paralelos: AsignacionParalelo[];
    seleccionados: number[];
    materiaNombre: string;
    gestion: string;
    onAlternar: (paraleloId: number) => void;
}

export default function AsignacionParalelos({
    paralelos,
    seleccionados,
    materiaNombre,
    gestion,
    onAlternar,
}: AsignacionParalelosProps) {
    return (
        <ul className="space-y-2">
            {paralelos.map((paralelo) => {
                const marcado = seleccionados.includes(paralelo.paralelo_id);

                return (
                    <li key={paralelo.paralelo_id}>
                        <label
                            className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors',
                                marcado
                                    ? 'border-violet-300 bg-violet-50'
                                    : 'border-slate-200 bg-white hover:border-slate-300',
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={marcado}
                                onChange={() => onAlternar(paralelo.paralelo_id)}
                                className="size-4 accent-violet-600"
                            />

                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-slate-900">
                                    {paralelo.nombre_paralelo}
                                </span>
                                <span className="block text-xs text-slate-500">
                                    {materiaNombre} · {gestion}
                                </span>
                            </span>

                            <span className="text-xs whitespace-nowrap text-slate-500 tabular-nums">
                                {paralelo.total_estudiantes}{' '}
                                {paralelo.total_estudiantes === 1
                                    ? 'estudiante'
                                    : 'estudiantes'}
                            </span>
                        </label>
                    </li>
                );
            })}
        </ul>
    );
}