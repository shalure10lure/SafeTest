
'use client';

import RoleGuard from '@/features/auth/components/RoleGuard';
import { EstadisticasMateria } from '@/features/estadisticas/components/EstadisticasMateria';
import { ComparacionPeriodos } from '@/features/estadisticas/components/ComparacionPeriodos';
import { useEstadisticas } from '@/features/estadisticas/hooks/useEstadisticas';
import { usePeriodos } from '@/features/periodos/hooks/usePeriodos';

export default function EstadisticasPage() {
    const {
        materias,
        materiaSeleccionada,
        setMateriaSeleccionada,
        estadisticas,
        isLoading,
        error,
        comparacion,
        isLoadingComparacion,
        errorComparacion,
        compararPeriodos,
        limpiarComparacion,
    } = useEstadisticas();

    const { periodos } = usePeriodos();

    const periodosDisponibles = periodos.filter(
        (periodo) =>
            periodo.activo &&
            materiaSeleccionada !== null &&
            periodo.materias.some(
                (materia) => materia.materia_id === materiaSeleccionada,
            ),
    );

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto max-w-6xl space-y-8 p-8">
                <header>
                    <h1 className="text-xl font-semibold text-slate-900">
                        Estadísticas por materia
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Consulta el rendimiento de tus estudiantes y los
                        resultados de las evaluaciones por materia.
                    </p>
                </header>

                <EstadisticasMateria
                    materias={materias}
                    materiaSeleccionada={materiaSeleccionada}
                    onSeleccionarMateria={setMateriaSeleccionada}
                    estadisticas={estadisticas}
                    isLoading={isLoading}
                    error={error}
                    periodosDisponibles={periodosDisponibles}
                />

                <ComparacionPeriodos
                    materiaId={materiaSeleccionada}
                    periodos={periodosDisponibles}
                    comparacion={comparacion}
                    isLoading={isLoadingComparacion}
                    error={errorComparacion}
                    onComparar={compararPeriodos}
                    onLimpiar={limpiarComparacion}
                />
            </main>
        </RoleGuard>
    );
}
