'use client';

import EvaluacionesRecientes from '@/features/docente/components/EvaluacionesRecientes';
import ResumenCards from '@/features/docente/components/ResumenCards';
import { useResumenDocente } from '@/features/docente/hooks/useResumenDocente';
import BancoPreguntasResumen from '@/features/docente/components/BancoPreguntasResumen';
import AccesoRapido from '@/features/docente/components/AccesoRapido';

export default function DocenteInicioPage() {
  const { resumen, cargando, error } = useResumenDocente();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      {cargando && (
        <p className="text-sm text-slate-500" aria-live="polite">
          Cargando resumen...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {resumen && (
        <>
          <ResumenCards resumen={resumen} />
          <EvaluacionesRecientes evaluaciones={resumen.evaluaciones} />
          <BancoPreguntasResumen
            preguntasPorTipo={resumen.preguntasPorTipo}
          />
          <AccesoRapido />
        </>
      )}
    </main>
  );
}