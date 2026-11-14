import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { formatearPuntos, parsearPuntaje, sumarPuntos } from '../formato';
import { infoTipoPregunta } from '../tipos-pregunta';
import type { PreguntaSeleccionada } from '../types';

export interface ItemSeleccionado {
    id: number;
    /** `undefined` si la pregunta aún no se ha cargado en esta sesión. */
    pregunta?: PreguntaSeleccionada;
    /** Texto editable del puntaje propio de la pregunta en la evaluación. */
    puntaje: string;
}

interface PanelSeleccionadasProps {
    items: ItemSeleccionado[];
    onQuitar: (id: number) => void;
    onCambiarPuntaje: (id: number, puntaje: string) => void;
    /** Puntaje total configurado en el paso 3; `null` si aún no se define. */
    puntajeTotal?: number | null;
}

export default function PanelSeleccionadas({
    items,
    onQuitar,
    onCambiarPuntaje,
    puntajeTotal = null,
}: PanelSeleccionadasProps) {
    const puntajes = items.map((item) => parsearPuntaje(item.puntaje));
    const hayPuntajesInvalidos = puntajes.some((puntaje) => puntaje === null);
    const suma = hayPuntajesInvalidos
        ? null
        : sumarPuntos(puntajes.filter((puntaje): puntaje is number => puntaje !== null));
    const excedeTotal =
        suma !== null && puntajeTotal !== null && suma > puntajeTotal;

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
                            const puntajeInvalido =
                                parsearPuntaje(item.puntaje) === null;
                            const idError = `puntaje-pregunta-${item.id}-error`;

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
                                                    Banco:{' '}
                                                    {formatearPuntos(item.pregunta.puntos)} pts
                                                </span>
                                            )}
                                            {item.pregunta?.activo === false && (
                                                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                                                    Inactiva
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-1.5 flex items-center gap-1.5">
                                            <label
                                                htmlFor={`puntaje-pregunta-${item.id}`}
                                                className="text-[10px] font-medium text-slate-500"
                                            >
                                                Puntaje
                                            </label>
                                            <input
                                                id={`puntaje-pregunta-${item.id}`}
                                                type="text"
                                                inputMode="decimal"
                                                value={item.puntaje}
                                                onChange={(event) =>
                                                    onCambiarPuntaje(
                                                        item.id,
                                                        event.target.value,
                                                    )
                                                }
                                                aria-invalid={puntajeInvalido}
                                                aria-describedby={
                                                    puntajeInvalido ? idError : undefined
                                                }
                                                className={cn(
                                                    'h-7 w-16 rounded-md border bg-white px-1.5 text-right text-xs text-slate-900 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600',
                                                    puntajeInvalido
                                                        ? 'border-red-400'
                                                        : 'border-slate-200',
                                                )}
                                            />
                                            <span className="text-[10px] text-slate-400">
                                                pts
                                            </span>
                                        </div>

                                        {puntajeInvalido && (
                                            <p
                                                id={idError}
                                                className="mt-1 text-[10px] text-red-600"
                                            >
                                                Puntaje inválido: debe ser mayor que cero y
                                                tener como máximo 2 decimales.
                                            </p>
                                        )}
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

                    <div className="space-y-1 border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
                        <p>
                            {items.length} {items.length === 1 ? 'pregunta' : 'preguntas'} ·{' '}
                            Puntaje total:{' '}
                            <span
                                className={cn(
                                    'font-medium tabular-nums',
                                    excedeTotal ? 'text-red-600' : 'text-slate-700',
                                )}
                            >
                                {suma === null
                                    ? '—'
                                    : `${formatearPuntos(suma)} pts`}
                            </span>
                            {puntajeTotal !== null && (
                                <span className="text-slate-400">
                                    {' '}
                                    / {formatearPuntos(puntajeTotal)} pts
                                </span>
                            )}
                        </p>

                        {puntajeTotal === null ? (
                            <p className="text-slate-400">
                                Define el puntaje total en el paso 3 para validar la
                                suma.
                            </p>
                        ) : (
                            excedeTotal &&
                            suma !== null && (
                                <p role="alert" className="font-medium text-red-600">
                                    {`La suma de los puntajes (${formatearPuntos(suma)}) supera el puntaje total configurado (${formatearPuntos(puntajeTotal)}).`}
                                </p>
                            )
                        )}

                        {hayPuntajesInvalidos && (
                            <p role="alert" className="font-medium text-red-600">
                                Corrige los puntajes marcados en rojo antes de continuar.
                            </p>
                        )}
                    </div>
                </>
            )}
        </aside>
    );
}
