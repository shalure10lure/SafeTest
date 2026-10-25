'use client';

import { useState } from 'react';

import EvaluacionesTabla from '@/features/evaluaciones/components/EvaluacionesTabla';
import ResumenEvaluaciones from '@/features/evaluaciones/components/ResumenEvaluaciones';
import { useEvaluaciones } from '@/features/evaluaciones/hooks/useEvaluaciones';
import type { EstadoExamen } from '@/features/evaluaciones/types';
import { cn } from '@/lib/utils';

type Filtro = 'todas' | EstadoExamen;

const FILTROS: { valor: Filtro; label: string }[] = [
    { valor: 'todas', label: 'Todas' },
    { valor: 'publicado', label: 'Publicadas' },
    { valor: 'borrador', label: 'Borradores' },
];

export default function MisEvaluacionesPage() {
    const { evaluaciones, cargando, error } = useEvaluaciones();
    const [filtro, setFiltro] = useState<Filtro>('todas');

    const visibles =
        filtro === 'todas'
            ? evaluaciones
            : evaluaciones.filter((evaluacion) => evaluacion.estado === filtro);

    return (
        <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
            {cargando && (
                <p className="text-sm text-slate-500" aria-live="polite">
                    Cargando evaluaciones...
                </p>
            )}

            {error && (
                <p className="text-sm text-red-600" role="alert">
                    {error}
                </p>
            )}

            {!cargando && !error && (
                <>
                    <ResumenEvaluaciones evaluaciones={evaluaciones} />

                    <div role="tablist" aria-label="Filtrar evaluaciones" className="flex gap-1">
                        {FILTROS.map((item) => (
                            <button
                                key={item.valor}
                                type="button"
                                role="tab"
                                aria-selected={filtro === item.valor}
                                onClick={() => setFiltro(item.valor)}
                                className={cn(
                                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-violet-600',
                                    filtro === item.valor
                                        ? 'bg-violet-100 text-violet-700'
                                        : 'text-slate-500 hover:text-slate-800',
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {visibles.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                            {evaluaciones.length === 0
                                ? 'Aún no tienes evaluaciones. Crea la primera para empezar.'
                                : 'No hay evaluaciones con este filtro.'}
                        </p>
                    ) : (
                        <EvaluacionesTabla evaluaciones={visibles} />
                    )}

                    <p className="text-right text-xs text-slate-400">
                        {visibles.length}{' '}
                        {visibles.length === 1 ? 'evaluación' : 'evaluaciones'} en total
                    </p>
                </>
            )}
        </main>
    );
}