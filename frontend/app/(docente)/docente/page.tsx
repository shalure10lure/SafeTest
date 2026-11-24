'use client';

import { RefreshCw } from 'lucide-react';

import Alerta from '@/components/ui/Alerta';
import AccesoRapido from '@/features/docente/components/AccesoRapido';
import BancoPreguntasResumen from '@/features/docente/components/BancoPreguntasResumen';
import EvaluacionesRecientes from '@/features/docente/components/EvaluacionesRecientes';
import ExamenBorradorCard from '@/features/docente/components/ExamenBorradorCard';
import ResumenCards from '@/features/docente/components/ResumenCards';
import SkeletonInicio from '@/features/docente/components/SkeletonInicio';
import { useResumenDocente } from '@/features/docente/hooks/useResumenDocente';

export default function DocenteInicioPage() {
    const { resumen, cargando, error, recargar } = useResumenDocente();

    return (
        <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
            {cargando && !resumen && <SkeletonInicio />}

            {error && (
                <Alerta
                    tono="error"
                    titulo={error.titulo}
                    accion={
                        <button
                            type="button"
                            onClick={() => void recargar()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                            <RefreshCw className="size-3.5" aria-hidden="true" />
                            Reintentar
                        </button>
                    }
                >
                    {error.detalle}
                </Alerta>
            )}

            {resumen && (
                <>
                    <ResumenCards resumen={resumen} />

                    {/* Escritorio: 2/3 + 1/3. Móvil y tablet: una columna. */}
                    <div className="grid gap-5 lg:grid-cols-3">
                        <div className="space-y-5 lg:col-span-2">
                            <EvaluacionesRecientes evaluaciones={resumen.evaluaciones} />
                            <BancoPreguntasResumen
                                preguntasPorTipo={resumen.preguntasPorTipo}
                            />
                        </div>

                        <div className="space-y-5">
                            {resumen.examenBorrador && (
                                <ExamenBorradorCard borrador={resumen.examenBorrador} />
                            )}
                            <AccesoRapido />
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}
