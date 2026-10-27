'use client';

import { Minus, Plus, Shuffle, X } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import type { Tema } from '@/features/temas/types';
import { cn } from '@/lib/utils';

export interface CriterioForm {
    clave: number;
    tema_id: number | null;
    cantidad: number;
}

export default function SeleccionAleatoria({
    temas,
    criterios,
    materiaNombre,
    mostrarErrores,
    onChange,
}: {
    temas: Tema[];
    criterios: CriterioForm[];
    materiaNombre: string;
    mostrarErrores: boolean;
    onChange: (criterios: CriterioForm[]) => void;
}) {
    const totalBanco = temas.reduce((suma, tema) => suma + tema.total_preguntas, 0);
    const totalSeleccion = criterios.reduce(
        (suma, criterio) => suma + (criterio.tema_id === null ? 0 : criterio.cantidad),
        0,
    );

    function actualizar(clave: number, cambios: Partial<CriterioForm>) {
        onChange(criterios.map((c) => (c.clave === clave ? { ...c, ...cambios } : c)));
    }

    function quitar(clave: number) {
        onChange(criterios.filter((c) => c.clave !== clave));
    }

    function agregar() {
        const siguiente = Math.max(0, ...criterios.map((c) => c.clave)) + 1;
        onChange([...criterios, { clave: siguiente, tema_id: null, cantidad: 1 }]);
    }

    return (
        <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Criterios por tema</h3>
                <p className="text-xs text-slate-500">
                    {totalBanco} preguntas de {materiaNombre} en tu banco
                </p>
            </div>

            <div className="mt-4 hidden grid-cols-[2rem_1fr_9rem_2rem] gap-3 px-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase sm:grid">
                <span />
                <span>Tema</span>
                <span>Cantidad</span>
                <span />
            </div>

            <ul className="mt-2 space-y-3">
                {criterios.map((criterio, indice) => {
                    const tema = temas.find((t) => t.tema_id === criterio.tema_id);
                    const disponibles = tema?.total_preguntas ?? 0;
                    const sinTema = mostrarErrores && criterio.tema_id === null;
                    const excede = tema !== undefined && criterio.cantidad > disponibles;

                    return (
                        <li key={criterio.clave}>
                            <div className="grid grid-cols-[2rem_1fr_auto_2rem] items-center gap-3 sm:grid-cols-[2rem_1fr_9rem_2rem]">
                                <span className="flex size-6 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                                    {indice + 1}
                                </span>

                                <select
                                    value={criterio.tema_id ?? ''}
                                    onChange={(e) =>
                                        actualizar(criterio.clave, {
                                            tema_id: Number(e.target.value) || null,
                                            cantidad: 1,
                                        })
                                    }
                                    aria-label={`Tema del criterio ${indice + 1}`}
                                    className={cn(
                                        'h-10 w-full rounded-lg border bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-violet-600',
                                        sinTema ? 'border-red-400' : 'border-slate-200',
                                    )}
                                >
                                    <option value="">Selecciona un tema</option>
                                    {temas.map((t) => (
                                        <option
                                            key={t.tema_id}
                                            value={t.tema_id}
                                            disabled={criterios.some(
                                                (c) => c.clave !== criterio.clave && c.tema_id === t.tema_id,
                                            )}
                                        >
                                            {t.nombre_tema} ({t.total_preguntas})
                                        </option>
                                    ))}
                                </select>

                                <div className="flex h-10 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            actualizar(criterio.clave, {
                                                cantidad: Math.max(1, criterio.cantidad - 1),
                                            })
                                        }
                                        aria-label="Disminuir cantidad"
                                        className="flex h-full w-9 items-center justify-center text-slate-500 hover:bg-slate-50"
                                    >
                                        <Minus className="size-3.5" aria-hidden="true" />
                                    </button>
                                    <span className="flex-1 text-center text-sm tabular-nums">
                                        {criterio.cantidad}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            actualizar(criterio.clave, {
                                                cantidad: Math.min(100, criterio.cantidad + 1),
                                            })
                                        }
                                        aria-label="Aumentar cantidad"
                                        className="flex h-full w-9 items-center justify-center text-slate-500 hover:bg-slate-50"
                                    >
                                        <Plus className="size-3.5" aria-hidden="true" />
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => quitar(criterio.clave)}
                                    disabled={criterios.length === 1}
                                    aria-label={`Quitar criterio ${indice + 1}`}
                                    className="flex size-8 items-center justify-center rounded text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            </div>

                            {sinTema && (
                                <p className="mt-1 pl-11 text-xs text-red-600" role="alert">
                                    Selecciona un tema.
                                </p>
                            )}
                            {excede && (
                                <p className="mt-1 pl-11 text-xs text-red-600" role="alert">
                                    El tema solo tiene {disponibles}{' '}
                                    {disponibles === 1 ? 'pregunta disponible' : 'preguntas disponibles'}.
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>

            <button
                type="button"
                onClick={agregar}
                disabled={criterios.length >= temas.length}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
            >
                <Plus className="size-3.5" aria-hidden="true" />
                Agregar otro tema
            </button>

            <p className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-violet-50 p-3 text-xs text-violet-800">
                <span className="flex items-center gap-2">
                    <Shuffle className="size-3.5" aria-hidden="true" />
                    SafeTest seleccionará preguntas disponibles según estos criterios.
                </span>
                <strong className="whitespace-nowrap tabular-nums">
                    {totalSeleccion} {totalSeleccion === 1 ? 'pregunta' : 'preguntas'}
                </strong>
            </p>
        </Card>
    );
}