'use client';

import { useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { describirError } from '@/lib/mensajes';
import { usePeriodos } from '@/features/periodos/hooks/usePeriodos';
import { estadisticasService } from '../services/estadisticas.service';
import type { ComparacionPeriodos as ComparacionPeriodosTipo } from '../types';
import { ComparacionPeriodos } from './ComparacionPeriodos';

/**
 * Conserva la comparación detallada que ya existía (elegir de 2 a 6
 * periodos y ver la diferencia entre ellos), ahora plegada debajo del
 * panel para que la pantalla principal quede limpia.
 * Se monta solo al abrirla, así no hace peticiones innecesarias.
 */
export default function ComparacionPeriodosAvanzada({
    materiaId,
}: {
    materiaId: number | null;
}) {
    const [abierta, setAbierta] = useState(false);
    const { periodos } = usePeriodos();

    const [comparacion, setComparacion] =
        useState<ComparacionPeriodosTipo | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Solo periodos activos que incluyen la materia seleccionada.
    const periodosDisponibles = periodos.filter(
        (periodo) =>
            periodo.activo &&
            materiaId !== null &&
            periodo.materias.some((materia) => materia.materia_id === materiaId),
    );

    const comparar = useCallback(async (id: number, periodoIds: number[]) => {
        setCargando(true);
        setError(null);

        try {
            setComparacion(await estadisticasService.compararPeriodos(id, periodoIds));
        } catch (fallo) {
            setComparacion(null);
            const { titulo, detalle } = describirError(
                fallo,
                'No se pudo comparar los periodos',
            );
            setError(`${titulo}. ${detalle}`);
        } finally {
            setCargando(false);
        }
    }, []);

    const limpiar = useCallback(() => {
        setComparacion(null);
        setError(null);
    }, []);

    return (
        <Card>
            <button
                type="button"
                onClick={() => setAbierta((valor) => !valor)}
                aria-expanded={abierta}
                className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5"
            >
                <span>
                    <span className="block text-sm font-semibold text-slate-900">
                        Comparación detallada entre periodos
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                        Elige de 2 a 6 periodos y mira cuánto cambió el promedio
                        entre uno y otro.
                    </span>
                </span>
                <ChevronDown
                    className={`size-5 shrink-0 text-slate-400 transition-transform ${abierta ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>

            {abierta && (
                <div className="border-t border-slate-100 p-4 sm:p-5">
                    <ComparacionPeriodos
                        materiaId={materiaId}
                        periodos={periodosDisponibles}
                        comparacion={comparacion}
                        isLoading={cargando}
                        error={error}
                        onComparar={comparar}
                        onLimpiar={limpiar}
                    />
                </div>
            )}
        </Card>
    );
}
