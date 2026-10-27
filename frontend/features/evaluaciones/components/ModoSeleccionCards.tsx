'use client';

import { ListChecks, Shuffle } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ModoSeleccion } from '../types';

const OPCIONES = [
    {
        valor: 'manual' as const,
        titulo: 'Manual',
        descripcion: 'Eliges una por una las preguntas del banco.',
        icono: ListChecks,
    },
    {
        valor: 'aleatorio' as const,
        titulo: 'Aleatorio',
        descripcion: 'Defines temas y cantidades; SafeTest arma la evaluación.',
        icono: Shuffle,
    },
];

export default function ModoSeleccionCards({
    modo,
    onChange,
}: {
    modo: ModoSeleccion;
    onChange: (modo: ModoSeleccion) => void;
}) {
    return (
        <div role="radiogroup" aria-label="Modo de selección" className="grid gap-3 sm:grid-cols-2">
            {OPCIONES.map(({ valor, titulo, descripcion, icono: Icono }) => {
                const activo = modo === valor;

                return (
                    <button
                        key={valor}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => onChange(valor)}
                        className={cn(
                            'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600',
                            activo
                                ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-100'
                                : 'border-slate-200 bg-white hover:border-slate-300',
                        )}
                    >
                        <span
                            className={cn(
                                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                                activo ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500',
                            )}
                        >
                            <Icono className="size-4" aria-hidden="true" />
                        </span>

                        <span className="min-w-0 flex-1">
                            <span
                                className={cn(
                                    'block text-sm font-semibold',
                                    activo ? 'text-violet-700' : 'text-slate-900',
                                )}
                            >
                                {titulo}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">{descripcion}</span>
                        </span>

                        <span
                            aria-hidden="true"
                            className={cn(
                                'mt-1 size-4 shrink-0 rounded-full border',
                                activo ? 'border-[5px] border-violet-600' : 'border-slate-300',
                            )}
                        />
                    </button>
                );
            })}
        </div>
    );
}