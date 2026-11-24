import { Card } from '@/components/ui/Card';
import { formatoNumero } from '../formato';
import type { Percentiles } from '../types';

/** Posición (0-100 %) para colocar un valor sobre la escala. */
function pos(valor: number): string {
    return `${Math.min(100, Math.max(0, valor))}%`;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
    return (
        <div>
            <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                {etiqueta}
            </p>
            <p className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">
                {formatoNumero(valor)}
            </p>
        </div>
    );
}

/**
 * Diagrama de caja (box plot) sencillo + valores de P25, mediana, P75 y P90.
 *  - Línea fina: desde la nota mínima hasta la máxima.
 *  - Caja: del P25 al P75 (el 50 % central de los estudiantes).
 *  - Línea gruesa: la mediana.
 */
export default function PercentilesCard({
    percentiles,
    contexto,
}: {
    percentiles: Percentiles | null;
    /** Ej.: "Cálculo I · Todas las evaluaciones · Todos los paralelos · 2026 – II" */
    contexto: string;
}) {
    return (
        <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <h2 className="text-sm font-semibold text-slate-900">Percentiles</h2>
                <p className="text-xs text-slate-400 sm:text-right">{contexto}</p>
            </div>

            {!percentiles ? (
                <p className="mt-4 text-sm text-slate-500">
                    No hay notas suficientes para calcular percentiles.
                </p>
            ) : (
                <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">
                    {/* Escala 0-100 */}
                    <div
                        role="img"
                        aria-label={`Notas entre ${formatoNumero(percentiles.min)} y ${formatoNumero(percentiles.max)}. El 50 % central está entre ${formatoNumero(percentiles.p25)} y ${formatoNumero(percentiles.p75)}. Mediana ${formatoNumero(percentiles.p50)}.`}
                    >
                        <div className="relative h-8">
                            {/* línea base mínimo-máximo */}
                            <div
                                className="absolute top-1/2 h-px -translate-y-1/2 bg-slate-300"
                                style={{
                                    left: pos(percentiles.min),
                                    width: `${Math.max(0, percentiles.max - percentiles.min)}%`,
                                }}
                            />
                            <div
                                className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-slate-400"
                                style={{ left: pos(percentiles.min) }}
                            />
                            <div
                                className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-slate-400"
                                style={{ left: pos(percentiles.max) }}
                            />
                            {/* caja P25-P75 */}
                            <div
                                className="absolute top-1/2 h-6 -translate-y-1/2 rounded border border-violet-300 bg-violet-100"
                                style={{
                                    left: pos(percentiles.p25),
                                    width: `${Math.max(1, percentiles.p75 - percentiles.p25)}%`,
                                }}
                            />
                            {/* mediana */}
                            <div
                                className="absolute top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-violet-600"
                                style={{ left: pos(percentiles.p50) }}
                            />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                            <span>0</span>
                            <span>50</span>
                            <span>100</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 md:gap-x-6">
                        <Dato etiqueta="P25" valor={percentiles.p25} />
                        <Dato etiqueta="P50 · Mediana" valor={percentiles.p50} />
                        <Dato etiqueta="P75" valor={percentiles.p75} />
                        <Dato etiqueta="P90" valor={percentiles.p90} />
                    </div>
                </div>
            )}
        </Card>
    );
}
