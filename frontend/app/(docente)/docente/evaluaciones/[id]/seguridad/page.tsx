'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { evaluacionesService } from '@/features/evaluaciones/services/evaluaciones.service';
import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';
import type { ResumenSeguridadDocente } from '@/features/evaluaciones/types';

function formatoFecha(valor: string | null) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString('es-BO');
}

export default function SeguridadEvaluacionDocentePage() {
  const { id } = useParams<{ id: string }>();
  const examenId = Number(id);
  const [datos, setDatos] = useState<ResumenSeguridadDocente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [desbloqueando, setDesbloqueando] = useState<number | null>(null);

  const recargar = useCallback(async () => {
    if (!Number.isSafeInteger(examenId) || examenId <= 0) return;
    setCargando(true);
    setError('');
    try {
      setDatos(await evaluacionesService.getSeguridadRendiciones(examenId));
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo consultar los eventos de seguridad.'));
    } finally {
      setCargando(false);
    }
  }, [examenId]);

  useEffect(() => { void recargar(); }, [recargar]);

  async function desbloquear(estudianteId: number) {
    const confirmado = window.confirm(
      '¿Autorizar que este estudiante continúe? Se conserva el historial de eventos.',
    );
    if (!confirmado) return;
    setDesbloqueando(estudianteId);
    setError('');
    try {
      await evaluacionesService.desbloquearRendicion(examenId, estudianteId);
      await recargar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo desbloquear la rendición.'));
    } finally {
      setDesbloqueando(null);
    }
  }

  if (!Number.isSafeInteger(examenId) || examenId <= 0) {
    return <p role="alert" className="p-6 text-sm text-red-700">Evaluación inválida.</p>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Seguridad de la evaluación</h1>
          <p className="mt-1 text-sm text-slate-600">
            {datos?.titulo ?? `Evaluación #${examenId}`} · Historial de eventos observados
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/docente/evaluaciones/${examenId}/resumen`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            Volver al resumen
          </Link>
          <button type="button" onClick={() => void recargar()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            Actualizar
          </button>
        </div>
      </header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {cargando && <p role="status" className="text-sm text-slate-600">Cargando eventos…</p>}
      {datos && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <strong>Política del examen: </strong>
            {datos.bloquear_primer_cambio_pestana
              ? 'Bloqueo estricto al primer cambio de pestaña detectado'
              : 'Registro de eventos sin bloqueo automático'}
            <p className="mt-2 text-xs text-slate-500">
              Los eventos son indicios técnicos, no pruebas concluyentes de uso de otros programas.
            </p>
          </div>
          {datos.rendiciones.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Todavía no hay rendiciones.</p>
          ) : (
            <div className="space-y-3">
              {datos.rendiciones.map((rendicion) => (
                <section key={rendicion.estudiante_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">{rendicion.nombre_completo}</h2>
                      <p className="text-xs text-slate-500">
                        Estado: {rendicion.estado} · Eventos: {rendicion.eventos.length}
                      </p>
                      {rendicion.bloqueada_seguridad_en && (
                        <p className="mt-1 text-xs font-medium text-amber-800">
                          Bloqueada desde {formatoFecha(rendicion.bloqueada_seguridad_en)}
                        </p>
                      )}
                    </div>
                    {rendicion.bloqueada_seguridad_en && rendicion.estado === 'en_curso' && (
                      <button type="button"
                        onClick={() => void desbloquear(rendicion.estudiante_id)}
                        disabled={desbloqueando !== null}
                        className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                        {desbloqueando === rendicion.estudiante_id ? 'Desbloqueando…' : 'Desbloquear rendición'}
                      </button>
                    )}
                  </div>
                  {rendicion.eventos.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="mb-2 text-xs font-medium text-slate-600">Eventos registrados</p>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {rendicion.eventos.map((evento) => (
                          <li key={evento.evento_id}>
                            {formatoFecha(evento.fecha_hora)} — {evento.tipo === 'pestana_oculta'
                              ? 'Pestaña de la evaluación oculta'
                              : evento.tipo === 'desbloqueo_docente'
                                ? 'Desbloqueo autorizado por docente'
                                : evento.tipo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
