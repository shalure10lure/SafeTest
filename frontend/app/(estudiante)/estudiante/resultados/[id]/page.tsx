'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LockKeyhole, MessageSquareText } from 'lucide-react';
import type { DetalleResultadoEstudiante } from '@/features/resultados-estudiante/resultados.types';
import { mensajeErrorResultado, resultadosEstudianteService } from '@/features/resultados-estudiante/resultados.service';

const formato = (valor: string | number) => Number(valor).toLocaleString('es-BO', { maximumFractionDigits: 2 });

export default function DetalleResultadoPage() {
  const { id } = useParams<{ id: string }>();
  const examenId = Number(id);
  const [detalle, setDetalle] = useState<DetalleResultadoEstudiante | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isSafeInteger(examenId) || examenId <= 0) {
      setError('El identificador de la evaluación es inválido.');
      setCargando(false);
      return;
    }
    let activo = true;
    resultadosEstudianteService.detalle(examenId)
      .then((r) => { if (activo) setDetalle(r); })
      .catch((e: unknown) => { if (activo) setError(mensajeErrorResultado(e)); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [examenId]);

  const porcentaje = useMemo(() => {
    const valor = Number(detalle?.nota_final ?? NaN);
    const max = Number(detalle?.puntaje_total ?? NaN);
    return Number.isFinite(valor) && Number.isFinite(max) && max > 0
      ? Math.min(100, Math.max(0, Math.round((valor / max) * 100))) : null;
  }, [detalle]);
  const comentarios = detalle?.preguntas.flatMap((pregunta) =>
    pregunta.incisos.filter((i) => i.retroalimentacion?.trim()).map((i) => ({
      clave: `${pregunta.pregunta_id}-${i.letra}`,
      titulo: `P${pregunta.orden}${pregunta.incisos.length > 1 ? i.letra : ''}`,
      comentario: i.retroalimentacion!,
    })),
  ) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-slate-900 md:px-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">SafeTest › Estudiante › Mis resultados › Detalle</p>
          <h1 className="mt-1 text-2xl font-bold">Detalle del resultado</h1>
          {detalle?.titulo && <p className="mt-1 text-sm text-slate-500">{detalle.titulo}{detalle.materia ? ` — ${detalle.materia}` : ''}</p>}
        </div>
        <Link href="/estudiante/resultados" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">← Volver a resultados</Link>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {cargando ? <p role="status" className="text-sm text-slate-500">Cargando resultado oficial…</p> : detalle && (
        <>
          <section className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex size-28 shrink-0 flex-col items-center justify-center rounded-full border-[9px] border-emerald-500 bg-white">
              <span className="text-2xl font-bold">{porcentaje === null ? '—' : porcentaje}</span>
              <span className="text-xs text-slate-400">{porcentaje === null ? '' : '%'}</span>
            </div>
            <div className="grid flex-1 gap-4 sm:grid-cols-3">
              <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Evaluación</p><p className="mt-1 font-semibold">{detalle.titulo ?? `#${detalle.examen_id}`}</p></div>
              <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Materia</p><p className="mt-1 font-semibold">{detalle.materia ?? '—'}</p></div>
              <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Calificación oficial</p><p className="mt-1 font-bold text-emerald-600">{formato(detalle.nota_final)}/{detalle.puntaje_total === null ? '—' : formato(detalle.puntaje_total)}</p></div>
            </div>
            <p className="w-full text-xs text-slate-500">{detalle.docente ? `Docente: ${detalle.docente} · ` : ''}Publicado el {new Date(detalle.fecha_publicacion).toLocaleString('es-BO')}</p>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2"><MessageSquareText className="text-blue-600" size={18}/><h2 className="font-bold">Retroalimentación del docente</h2></div>
            {comentarios.length ? (
              <div className="space-y-2">
                {comentarios.map((c) => (
                  <article key={c.clave} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                    <span className="shrink-0 font-bold text-blue-700">{c.titulo}</span>
                    <p className="text-slate-700">{c.comentario}</p>
                  </article>
                ))}
              </div>
            ) : <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">El docente no dejó comentarios en esta evaluación.</p>}
          </section>
          <section className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
            {detalle.respuestas_correctas_disponibles ? <CheckCircle2 size={22} className="text-emerald-600"/> : <LockKeyhole size={22} className="text-slate-500"/>}
            <div>
              <h2 className="font-semibold">Soluciones de referencia {detalle.respuestas_correctas_disponibles ? 'autorizadas' : '— contenido restringido'}</h2>
              <p className="text-xs text-slate-500">{detalle.respuestas_correctas_disponibles
                ? 'El docente autorizó las respuestas correctas. Puedes consultarlas aquí debajo.'
                : 'Las respuestas correctas y soluciones solo serán visibles cuando tu docente las autorice.'}</p>
            </div>
          </section>
          {detalle.respuestas_correctas_disponibles && (
            <section className="rounded-xl border border-emerald-200 bg-white p-5">
              <h2 className="text-lg font-bold text-emerald-800">Respuestas correctas y soluciones</h2>
              <p className="mt-1 text-xs text-slate-500">Soluciones autorizadas por el docente para esta evaluación.</p>
              <div className="mt-4 space-y-4">
                {detalle.preguntas.map((pregunta) => (
                  <article key={pregunta.pregunta_id} className="rounded-lg border border-slate-200 p-4">
                    <h3 className="font-semibold">Pregunta {pregunta.orden}: {pregunta.enunciado}</h3>
                    {pregunta.explicacion && (
                      <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                        <strong>Explicación:</strong> {pregunta.explicacion}
                      </p>
                    )}
                    <div className="mt-3 space-y-3">
                      {pregunta.incisos.map((inciso) => {
                        const solucion = inciso.respuesta_correcta;
                        const tieneSolucion = !!solucion && (
                          solucion.opciones_correctas.length > 0 ||
                          solucion.valor_correcto !== null ||
                          !!solucion.solucion_referencia
                        );
                        return (
                          <div key={inciso.letra} className="rounded-lg bg-slate-50 p-3 text-sm">
                            <p className="font-semibold">Inciso {inciso.letra}: {inciso.enunciado_inciso}</p>
                            {inciso.respuesta_estudiante && (
                              <p className="mt-2 whitespace-pre-wrap text-slate-600">
                                <strong>Tu respuesta:</strong> {inciso.respuesta_estudiante}
                              </p>
                            )}
                            {solucion?.opciones_correctas.length ? (
                              <p className="mt-2 text-emerald-800">
                                <strong>{solucion.opciones_correctas.length > 1 ? 'Opciones correctas' : 'Opción correcta'}:</strong>{' '}
                                {solucion.opciones_correctas.map((op) => `${op.nro_opcion}. ${op.texto_opcion}`).join(' · ')}
                              </p>
                            ) : null}
                            {solucion?.valor_correcto !== null && solucion?.valor_correcto !== undefined && (
                              <p className="mt-2 text-emerald-800">
                                <strong>Valor correcto:</strong> {solucion.valor_correcto}
                                {solucion.tolerancia !== null ? ` (tolerancia: ${solucion.tolerancia})` : ''}
                              </p>
                            )}
                            {solucion?.solucion_referencia && (
                              <p className="mt-2 whitespace-pre-wrap text-emerald-800">
                                <strong>Solución de referencia / rúbrica:</strong> {solucion.solucion_referencia}
                              </p>
                            )}
                            {!tieneSolucion && (
                              <p className="mt-2 text-slate-500">No hay una solución de referencia registrada para este inciso.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Puntaje por pregunta</h2>
            <p className="mt-1 text-xs text-slate-500">Tus puntos oficiales y los comentarios disponibles.</p>
            <div className="mt-5 divide-y divide-slate-100">
              {detalle.preguntas.map((pregunta) => {
                const maximo = Number(pregunta.puntaje_max);
                const obtenido = Number(pregunta.puntaje_obtenido);
                const progreso = maximo > 0 ? Math.max(0, Math.min(100, obtenido / maximo * 100)) : 0;
                return (
                  <div key={pregunta.pregunta_id} className="space-y-2 py-4 first:pt-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-12 text-xs font-bold text-blue-700">P{pregunta.orden}</span>
                      <span className="min-w-0 flex-1 text-sm font-medium">{pregunta.enunciado}</span>
                      <span className="text-sm font-bold">{formato(obtenido)} <span className="font-normal text-slate-400">/ {formato(maximo)}</span></span>
                    </div>
                    <div className="ml-0 h-2 overflow-hidden rounded-full bg-slate-100 sm:ml-12"><div className={`h-full rounded-full ${progreso >= 60 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progreso}%` }}/></div>
                    {pregunta.incisos.length > 1 && (
                      <div className="mt-2 space-y-1 pl-12 text-xs text-slate-500">
                        {pregunta.incisos.map((i) => <div key={i.letra}>Inciso {i.letra}: {formato(i.puntaje_obtenido)} / {formato(i.puntaje_max)} puntos (escala del banco)</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
