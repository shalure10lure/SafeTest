import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { formatoNumero } from '../formato';

export interface BarraComparacion {
    id: number;
    etiqueta: string;
    valor: number | null;
    /** Cantidad de notas que hay detrás del promedio. */
    n: number;
    /** La barra oscura marca el elemento seleccionado (ej. el periodo actual). */
    destacada?: boolean;
}

/**
 * Tarjeta con barras verticales (escala fija 0-100) para comparar grupos.
 * Si hay muchas barras, la tarjeta se desplaza horizontalmente en lugar de
 * apretar el texto.
 */
export default function BarrasComparacion({
    titulo,
    subtitulo,
    barras,
    vacio = 'No hay datos suficientes para comparar.',
    className,
}: {
    titulo: string;
    subtitulo: string;
    barras: BarraComparacion[];
    vacio?: string;
    className?: string;
}) {
    return (
        <Card className={cn('p-4 sm:p-5', className)}>
            <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{subtitulo}</p>

            {barras.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">{vacio}</p>
            ) : (
                <div className="mt-5 overflow-x-auto pb-1">
                    <div
                        className="flex min-w-full items-end justify-around gap-3"
                        style={{ minWidth: `${barras.length * 4.5}rem` }}
                    >
                        {barras.map((barra) => {
                            const alto = Math.min(100, Math.max(0, barra.valor ?? 0));

                            return (
                                <div
                                    key={barra.id}
                                    className="flex w-full max-w-24 min-w-14 flex-col items-center"
                                >
                                    <span className="mb-1 text-xs font-bold text-violet-600 tabular-nums">
                                        {formatoNumero(barra.valor)}
                                    </span>

                                    {/* Contenedor de 150 px = escala 0-100 */}
                                    <div className="flex h-[150px] w-full items-end">
                                        <div
                                            className={cn(
                                                'w-full rounded-t',
                                                barra.destacada
                                                    ? 'bg-violet-600'
                                                    : 'bg-violet-300',
                                            )}
                                            style={{ height: `${Math.max(alto, 1.5)}%` }}
                                            role="img"
                                            aria-label={`${barra.etiqueta}: promedio ${formatoNumero(barra.valor)} sobre 100, ${barra.n} notas`}
                                        />
                                    </div>

                                    <span
                                        className="mt-2 line-clamp-2 w-full text-center text-[11px] leading-tight text-slate-600"
                                        title={barra.etiqueta}
                                    >
                                        {barra.etiqueta}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        n={barra.n}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Card>
    );
}
