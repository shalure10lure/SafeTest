'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { EvaluacionDocenteBasica } from '@/features/evaluaciones/calificaciones.types';
import {
  calificacionesService,
  mensajeErrorCalificaciones,
} from '@/features/evaluaciones/services/calificaciones.service';

export default function CalificacionesDocentePage() {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionDocenteBasica[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    calificacionesService.listarEvaluaciones()
      .then((datos) => { if (vigente) setEvaluaciones(datos); })
      .catch((e: unknown) => { if (vigente) setError(mensajeErrorCalificaciones(e)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  const publicadas = useMemo(() => evaluaciones.filter((e) =>
    e.estado === 'publicado' &&
    `${e.titulo ?? ''} ${e.materia?.nombre ?? ''}`.toLowerCase().includes(busqueda.toLowerCase()),
  ), [evaluaciones, busqueda]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <Link href="/docente/evaluaciones" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          ← Volver a evaluaciones
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Revisión de calificaciones</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Elige una evaluación publicada para revisar notas, corregir respuestas y confirmar resultados.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <label htmlFor="buscar-evaluacion" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Buscar evaluación
        </label>
        <input
          id="buscar-evaluacion"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Nombre de evaluación o materia"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div>}
      {cargando ? (
        <p className="text-sm text-slate-500" role="status">Cargando evaluaciones…</p>
      ) : !error && publicadas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-600 dark:border-slate-700 dark:text-slate-300">
          No hay evaluaciones publicadas que coincidan con tu búsqueda.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {publicadas.map((evaluacion) => (
            <article key={evaluacion.examen_id} className="flex flex-col justify-between gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="space-y-2">
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                  Evaluación publicada
                </span>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{evaluacion.titulo ?? `Evaluación #${evaluacion.examen_id}`}</h2>
                {evaluacion.materia?.nombre && <p className="text-sm text-slate-500 dark:text-slate-400">{evaluacion.materia.nombre}</p>}
                {evaluacion.disponible_hasta && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Finalización: {new Date(evaluacion.disponible_hasta).toLocaleString('es-BO')}</p>
                )}
              </div>
              <Link
                href={`/docente/evaluaciones/${evaluacion.examen_id}/calificaciones`}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Revisar calificaciones →
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
