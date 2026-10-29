'use client';

import { X } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import type { PreguntaBanco } from '@/features/preguntas/types';

export default function PreguntasSeleccionadas({
    preguntas,
    onQuitar,
}: {
    preguntas: PreguntaBanco[];
    onQuitar: (preguntaId: number) => void;
}) {
    const puntos = preguntas.reduce((suma, p) => suma + p.puntaje_total, 0);

    return (
        <Card className="h-fit p-4 lg:sticky lg:top-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Preguntas seleccionadas</h3>
                <span className="flex size-6 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white tabular-nums">
                    {preguntas.length}
                </span>
            </div>

            {preguntas.length === 0 ? (
                <p className="mt-4 text-center text-xs text-slate-500">
                    <span className="block font-semibold">Ninguna pregunta seleccionada.</span>
                    Marca una pregunta en el listado del banco.
                </p>
            ) : (
                <>
                    <ol className="mt-3 space-y-2">
                        {preguntas.map((pregunta, indice) => (
                            <li
                                key={pregunta.pregunta_id}
                                className="flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-xs"
                            >
                                <span className="font-semibold text-violet-600 tabular-nums">
                                    {indice + 1}.
                                </span>
                                <span className="line-clamp-2 flex-1 text-slate-700">
                                    {pregunta.enunciado}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onQuitar(pregunta.pregunta_id)}
                                    aria-label={`Quitar pregunta ${indice + 1}`}
                                    className="rounded p-0.5 text-slate-400 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-violet-600"
                                >
                                    <X className="size-3.5" aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ol>

                    <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        Total: <strong className="text-slate-800">{puntos} pts</strong>
                    </p>
                </>
            )}
        </Card>
    );
}