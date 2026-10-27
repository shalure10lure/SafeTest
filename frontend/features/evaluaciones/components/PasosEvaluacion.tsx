import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export const PASOS_EVALUACION = [
    'Información',
    'Preguntas',
    'Configuración',
    'Asignación',
    'Resumen',
] as const;

export default function PasosEvaluacion({
    pasoActual,
}: {
    pasoActual: number;
}) {
    return (
        <nav
            aria-label="Pasos para crear la evaluación"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6"
        >
            <ol className="flex items-start">
                {PASOS_EVALUACION.map((nombre, indice) => {
                    const numero = indice + 1;
                    const completado = numero < pasoActual;
                    const actual = numero === pasoActual;
                    const esUltimo = numero === PASOS_EVALUACION.length;

                    return (
                        <li
                            key={nombre}
                            aria-current={actual ? 'step' : undefined}
                            className={cn('flex items-start', !esUltimo && 'flex-1')}
                        >
                            <div className="flex flex-col items-center gap-1.5">
                                <span
                                    className={cn(
                                        'flex size-7 items-center justify-center rounded-full border text-xs font-semibold',
                                        completado && 'border-violet-600 bg-violet-600 text-white',
                                        actual &&
                                        'border-violet-600 bg-white text-violet-600 ring-4 ring-violet-100',
                                        !completado &&
                                        !actual &&
                                        'border-slate-200 bg-white text-slate-400',
                                    )}
                                >
                                    {completado ? (
                                        <Check className="size-3.5" aria-hidden="true" />
                                    ) : (
                                        numero
                                    )}
                                </span>

                                <span
                                    className={cn(
                                        'text-[11px] font-medium whitespace-nowrap',
                                        actual && 'text-violet-700',
                                        completado && 'text-slate-800',
                                        !actual && !completado && 'text-slate-400',
                                        !actual && 'hidden sm:block',
                                    )}
                                >
                                    {nombre}
                                    <span className="sr-only">
                                        {completado ? ' (completado)' : actual ? ' (paso actual)' : ''}
                                    </span>
                                </span>
                            </div>

                            {!esUltimo && (
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'mx-2 mt-3.5 h-0.5 flex-1 rounded-full',
                                        completado ? 'bg-violet-600' : 'bg-slate-200',
                                    )}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}