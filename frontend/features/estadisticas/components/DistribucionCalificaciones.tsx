import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { RangoDistribucion } from '../types';

/** Histograma: cuántos estudiantes hay en cada rango de nota. */
export default function DistribucionCalificaciones({
    rangos,
}: {
    rangos: RangoDistribucion[];
}) {
    const maximo = Math.max(1, ...rangos.map((r) => r.cantidad));

    return (
        <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900">
                Distribución de calificaciones
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">Frecuencia por rango</p>

            <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3">
                {rangos.map((rango) => {
                    // Altura proporcional al rango más frecuente (máx. 100 %).
                    const alto = (rango.cantidad / maximo) * 100;

                    return (
                        <div
                            key={rango.etiqueta}
                            className="flex h-full min-w-0 flex-1 flex-col justify-end"
                        >
                            <span className="mb-1 text-center text-[11px] font-semibold text-slate-700 tabular-nums">
                                {rango.cantidad > 0 ? rango.cantidad : ''}
                            </span>
                            <div
                                className={cn(
                                    'w-full rounded-t',
                                    rango.cantidad > 0 ? 'bg-violet-600' : 'bg-slate-200',
                                )}
                                style={{
                                    // Un rango vacío igual deja una pequeña base gris.
                                    height: rango.cantidad > 0 ? `${Math.max(alto, 4)}%` : '3px',
                                }}
                                role="img"
                                aria-label={`${rango.etiqueta}: ${rango.cantidad} estudiantes`}
                            />
                            <span className="mt-1.5 text-center text-[10px] text-slate-400">
                                {rango.etiqueta}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
