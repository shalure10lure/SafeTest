import { X } from 'lucide-react';

import { formatearPuntos } from '../formato';
import { infoTipoPregunta } from '../tipos-pregunta';
import type { PreguntaBanco } from '../types';

export interface ItemSeleccionado {
    id: number;
    /** `undefined` si la pregunta aún no se ha cargado en esta sesión. */
    pregunta?: PreguntaBanco & { activo?: boolean };
}

interface PanelSeleccionadasProps {
    items: ItemSeleccionado[];
    onQuitar: (id: number) => void;
}

export default function PanelSeleccionadas({
    items,
    onQuitar,
}: PanelSeleccionadasProps) {
    const totalPuntos = items.reduce(
        (suma, item) => suma + (item.pregunta?.puntos ?? 0),
        0,
    );

    return (
        <aside
            aria-label="Preguntas seleccionadas"
            className="rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-4 lg:self-start"
        >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">
                    Preguntas seleccionadas
                </h3>
                <span className="flex size-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-semibold text-white tabular-nums">
                    {items.length}
                </span>
            </div>

            {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                    <p className="text-sm text-slate-400">Ninguna pregunta seleccionada.</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                        Quitar una pregunta no la elimina del banco.
                    </p>
                </div>
            ) : (
                <>
                    <ol className="divide-y divide-slate-100">
                        {items.map((item, indice) => {
                            const tipo = item.pregunta
                                ? infoTipoPregunta(item.pregunta.tipo_respuesta)
                                : null;

                            return (
                                <li key={item.id} className="flex items-start gap-2.5 px-4 py-3">
                                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-700 tabular-nums">
                                        {indice + 1}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-xs text-slate-900">
                                            {item.pregunta?.enunciado ?? `Pregunta #${item.id}`}
                                        </p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-slate-400">
                                            {tipo && <span>{tipo.label}</span>}
                                            {item.pregunta && (
                                                <span>
                                                    {formatearPuntos(item.pregunta.puntos)} pts
                                                </span>
                                            )}
                                            {item.pregunta?.activo === false && (
                                                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                                                    Inactiva
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onQuitar(item.id)}
                                        aria-label={`Quitar la pregunta ${indice + 1}`}
                                        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-violet-600"
                                    >
                                        <X className="size-3.5" aria-hidden="true" />
                                    </button>
                                </li>
                            );
                        })}
                    </ol>

                    <p className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
                        {items.length} {items.length === 1 ? 'pregunta' : 'preguntas'} ·{' '}
                        {formatearPuntos(totalPuntos)} pts en total
                    </p>
                </>
            )}
        </aside>
    );
}