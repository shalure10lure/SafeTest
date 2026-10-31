'use client';

import { useMemo, useState } from 'react';
import { Info, Search } from 'lucide-react';

import { Badge } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

import { infoTipoPregunta } from '../tipos-pregunta';
import type { PreguntaBanco, TemaBanco } from '../types';

const ENTRADA =
    'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600';

export default function SeleccionManual({
    preguntas,
    temas,
    seleccionadas,
    onAlternar,
}: {
    preguntas: PreguntaBanco[];
    temas: TemaBanco[];
    seleccionadas: number[];
    onAlternar: (preguntaId: number) => void;
}) {
    const [busqueda, setBusqueda] = useState('');
    const [temaFiltro, setTemaFiltro] = useState('');

    const visibles = useMemo(() => {
        const termino = busqueda.trim().toLowerCase();

        return preguntas.filter(
            (pregunta) =>
                (!temaFiltro || pregunta.tema.tema_id === Number(temaFiltro)) &&
                (!termino || pregunta.enunciado.toLowerCase().includes(termino)),
        );
    }, [preguntas, busqueda, temaFiltro]);

    return (
        <div className="space-y-4">
            <p className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-800">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                    <strong>Reutilización:</strong> las preguntas se agregan como referencia.
                    Seguirán disponibles en el banco y podrás usarlas en otras evaluaciones.
                </span>
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search
                        className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar en el banco..."
                        aria-label="Buscar en el banco"
                        className={cn(ENTRADA, 'pl-9')}
                    />
                </div>

                <select
                    value={temaFiltro}
                    onChange={(e) => setTemaFiltro(e.target.value)}
                    aria-label="Filtrar por tema"
                    className={cn(ENTRADA, 'sm:w-52')}
                >
                    <option value="">Todos los temas</option>
                    {temas.map((tema) => (
                        <option key={tema.tema_id} value={tema.tema_id}>
                            {tema.nombre_tema}
                        </option>
                    ))}
                </select>
            </div>

            <p className="text-xs text-slate-500">
                {visibles.length} de {preguntas.length} preguntas en tu banco
            </p>

            {visibles.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                    {preguntas.length === 0
                        ? 'Esta materia aún no tiene preguntas en tu banco.'
                        : 'Ninguna pregunta coincide con la búsqueda.'}
                </p>
            ) : (
                <ul className="space-y-2">
                    {visibles.map((pregunta) => {
                        const marcada = seleccionadas.includes(pregunta.pregunta_id);

                        return (
                            <li key={pregunta.pregunta_id}>
                                <label
                                    className={cn(
                                        'flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3.5 transition-colors',
                                        marcada
                                            ? 'border-violet-400 bg-violet-50/50'
                                            : 'border-slate-200 hover:border-slate-300',
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={marcada}
                                        onChange={() => onAlternar(pregunta.pregunta_id)}
                                        className="mt-1 size-4 accent-violet-600"
                                    />

                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <Badge tono="blue">{infoTipoPregunta(pregunta.tipo_respuesta).label}</Badge>
                                            <span className="text-xs text-slate-500">
                                                {pregunta.materia.nombre} · {pregunta.tema.nombre_tema} ·{' '}
                                                {pregunta.puntos} pts
                                            </span>
                                            {pregunta.usada_en > 0 && (
                                                <span className="ml-auto rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500">
                                                    Usada en {pregunta.usada_en}{' '}
                                                    {pregunta.usada_en === 1 ? 'evaluación' : 'evaluaciones'}
                                                </span>
                                            )}
                                        </span>

                                        <span className="mt-1.5 block text-sm text-slate-900">
                                            {pregunta.enunciado}
                                        </span>
                                    </span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}