'use client';

import { Card } from '@/components/ui/Card';
import { formatoPeriodo } from '../formato';
import type { PanelEstadisticas } from '../types';

interface FiltrosEstadisticasProps {
    datos: PanelEstadisticas;
    /** true mientras se recalcula el panel (se bloquean los selectores). */
    cargando: boolean;
    onCambiar: (
        cambio: Partial<
            Record<
                'materia_id' | 'semestre_id' | 'examen_id' | 'paralelo_id',
                number | null
            >
        >,
    ) => void;
}

const ETIQUETA = 'text-[10px] font-semibold tracking-wider text-slate-500 uppercase';
const SELECT =
    'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400';

/** "" (opción "Todas") -> null; "5" -> 5 */
function aNumeroONulo(valor: string): number | null {
    return valor === '' ? null : Number(valor);
}

export default function FiltrosEstadisticas({
    datos,
    cargando,
    onCambiar,
}: FiltrosEstadisticasProps) {
    const { filtros, seleccion } = datos;

    // Cada selector solo muestra opciones que tienen sentido con los demás.
    const periodos = filtros.periodos.filter(
        (p) =>
            seleccion.materia_id !== null &&
            p.materia_ids.includes(seleccion.materia_id),
    );
    const evaluaciones = filtros.evaluaciones.filter(
        (e) =>
            e.materia_id === seleccion.materia_id &&
            e.semestre_id === seleccion.semestre_id,
    );
    const paralelos = filtros.paralelos.filter(
        (p) =>
            p.materia_id === seleccion.materia_id &&
            p.semestre_id === seleccion.semestre_id,
    );

    return (
        <Card className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <label htmlFor="filtro-materia" className={ETIQUETA}>
                        Materia
                    </label>
                    <select
                        id="filtro-materia"
                        value={seleccion.materia_id ?? ''}
                        disabled={cargando || filtros.materias.length === 0}
                        onChange={(e) =>
                            onCambiar({ materia_id: aNumeroONulo(e.target.value) })
                        }
                        className={SELECT}
                    >
                        {filtros.materias.length === 0 && (
                            <option value="">Sin materias</option>
                        )}
                        {filtros.materias.map((m) => (
                            <option key={m.materia_id} value={m.materia_id}>
                                {m.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="filtro-evaluacion" className={ETIQUETA}>
                        Evaluación
                    </label>
                    <select
                        id="filtro-evaluacion"
                        value={seleccion.examen_id ?? ''}
                        disabled={cargando || evaluaciones.length === 0}
                        onChange={(e) =>
                            onCambiar({ examen_id: aNumeroONulo(e.target.value) })
                        }
                        className={SELECT}
                    >
                        <option value="">Todas</option>
                        {evaluaciones.map((e) => (
                            <option key={e.examen_id} value={e.examen_id}>
                                {e.titulo}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="filtro-paralelo" className={ETIQUETA}>
                        Paralelo
                    </label>
                    <select
                        id="filtro-paralelo"
                        value={seleccion.paralelo_id ?? ''}
                        disabled={cargando || paralelos.length === 0}
                        onChange={(e) =>
                            onCambiar({ paralelo_id: aNumeroONulo(e.target.value) })
                        }
                        className={SELECT}
                    >
                        <option value="">Todos</option>
                        {paralelos.map((p) => (
                            <option key={p.paralelo_id} value={p.paralelo_id}>
                                {p.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="filtro-periodo" className={ETIQUETA}>
                        Periodo
                    </label>
                    <select
                        id="filtro-periodo"
                        value={seleccion.semestre_id ?? ''}
                        disabled={cargando || periodos.length === 0}
                        onChange={(e) =>
                            onCambiar({ semestre_id: aNumeroONulo(e.target.value) })
                        }
                        className={SELECT}
                    >
                        {periodos.length === 0 && (
                            <option value="">Sin periodos</option>
                        )}
                        {periodos.map((p) => (
                            <option key={p.semestre_id} value={p.semestre_id}>
                                {formatoPeriodo(p.gestion)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
                Solo se muestran tus materias, paralelos y periodos. La
                información de otros docentes no está disponible.
            </p>
        </Card>
    );
}
