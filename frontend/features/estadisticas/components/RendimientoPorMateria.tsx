import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { formatoNumero } from '../formato';
import type { PanelEstadisticas } from '../types';

/** Promedio de cada materia del docente en el periodo elegido. */
export default function RendimientoPorMateria({
    materias,
    materiaSeleccionada,
    periodo,
}: {
    materias: PanelEstadisticas['por_materia'];
    materiaSeleccionada: number | null;
    periodo: string;
}) {
    return (
        <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900">
                Rendimiento por materia
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
                Promedio de cada una de tus materias · {periodo}
            </p>

            {materias.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">
                    Todavía no hay calificaciones en este periodo.
                </p>
            ) : (
                <ul className="mt-5 space-y-3">
                    {materias.map((materia) => {
                        const activa = materia.materia_id === materiaSeleccionada;
                        const ancho = Math.min(100, Math.max(0, materia.promedio ?? 0));

                        return (
                            <li
                                key={materia.materia_id}
                                className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 sm:grid-cols-[minmax(0,9rem)_1fr_auto_auto] sm:gap-3"
                            >
                                <span
                                    className={cn(
                                        'truncate text-xs',
                                        activa
                                            ? 'font-semibold text-slate-900'
                                            : 'text-slate-500',
                                    )}
                                    title={materia.nombre}
                                >
                                    {materia.nombre}
                                </span>

                                <div
                                    className="h-6 overflow-hidden rounded bg-slate-100"
                                    role="img"
                                    aria-label={`${materia.nombre}: promedio ${formatoNumero(materia.promedio)} sobre 100`}
                                >
                                    <div
                                        className={cn(
                                            'h-full rounded',
                                            activa ? 'bg-violet-600' : 'bg-violet-300',
                                        )}
                                        style={{ width: `${ancho}%` }}
                                    />
                                </div>

                                <span className="w-8 text-right text-sm font-bold text-violet-600 tabular-nums">
                                    {formatoNumero(materia.promedio)}
                                </span>
                                <span className="hidden w-12 text-right text-[11px] text-slate-400 sm:block">
                                    n={materia.n}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
