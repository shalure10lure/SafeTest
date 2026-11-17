'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList } from 'lucide-react';
import type { ResultadoListadoEstudiante } from '@/features/resultados-estudiante/resultados.types';
import { mensajeErrorResultado, resultadosEstudianteService } from '@/features/resultados-estudiante/resultados.service';

export default function MisResultadosPage() {
  const [resultados, setResultados] = useState<ResultadoListadoEstudiante[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let activo = true;
    resultadosEstudianteService.listar()
      .then((filas) => { if (activo) setResultados(filas); })
      .catch((fallo: unknown) => { if (activo) setError(mensajeErrorResultado(fallo)); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const visibles = useMemo(() => resultados.filter((resultado) =>
    `${resultado.titulo ?? ''} ${resultado.materia ?? ''}`.toLowerCase().includes(busqueda.toLowerCase()),
  ), [resultados, busqueda]);
  const publicados = resultados.filter((r) => r.estado === 'publicado').length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-slate-900 md:px-7">
      <header className="space-y-2">
        <p className="text-xs text-slate-400">SafeTest › Estudiante › Mis resultados</p>
        <h1 className="text-2xl font-bold">Mis resultados</h1>
        <p className="text-sm text-slate-500">Consulta las calificaciones oficiales publicadas por tus docentes.</p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Resultados publicados</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{publicados}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pendientes de publicación</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{resultados.length - publicados}</p>
        </div>
      </div>
      <div>
        <label htmlFor="buscar-resultado" className="mb-1 block text-xs font-semibold text-slate-600">Buscar evaluación</label>
        <input id="buscar-resultado" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Nombre de evaluación o materia" className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {cargando ? <p role="status" className="text-sm text-slate-500">Cargando resultados…</p> : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 font-semibold">Evaluaciones rendidas</div>
          {visibles.length === 0 ? (
            <p className="px-5 py-10 text-sm text-slate-500">Todavía no hay resultados para mostrar.</p>
          ) : <div className="divide-y divide-slate-100">
            {visibles.map((resultado) => {
              const publicado = resultado.estado === 'publicado';
              return (
                <article key={resultado.examen_id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><ClipboardList size={20}/></span>
                    <div>
                      <h2 className="font-semibold">{resultado.titulo ?? `Evaluación #${resultado.examen_id}`}</h2>
                      <p className="mt-1 text-xs text-slate-500">{resultado.materia ?? 'Materia no indicada'}{resultado.docente ? ` · ${resultado.docente}` : ''}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-xs">
                        {publicado ? <CheckCircle2 size={14} className="text-emerald-600"/> : <AlertCircle size={14} className="text-amber-600"/>}
                        <span className={publicado ? 'text-emerald-700' : 'text-amber-700'}>
                          {publicado ? 'Publicado' : 'Pendiente de publicación'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-right text-lg font-bold">
                      {publicado && resultado.nota_final !== null ? Number(resultado.nota_final).toLocaleString('es-BO', {maximumFractionDigits:2}) : '—'}
                      <span className="text-sm font-normal text-slate-400">{publicado && resultado.puntaje_total !== null ? `/${Number(resultado.puntaje_total)}` : ''}</span>
                    </span>
                    {publicado ? (
                      <Link href={`/estudiante/resultados/${resultado.examen_id}`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                        Ver detalle →
                      </Link>
                    ) : <span className="text-xs text-slate-400">Aún no disponible</span>}
                  </div>
                </article>
              );
            })}
          </div>}
        </section>
      )}
    </main>
  );
}
