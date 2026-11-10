'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { useTiempoRendicion } from '../hooks/useTiempoRendicion';

function formatearTiempo(segundos: number | null): string {
  if (segundos === null) return 'Sin límite configurado';

  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const restantes = segundos % 60;
  const mm = String(minutos).padStart(2, '0');
  const ss = String(restantes).padStart(2, '0');

  return horas > 0
    ? `${String(horas).padStart(2, '0')}:${mm}:${ss}`
    : `${mm}:${ss}`;
}

/**
 * Envuelve la pantalla de rendición SIN modificar su autoguardado.
 * La interfaz de respuestas solo se monta cuando el backend confirma acceso.
 */
export default function ControlTiempoRendicion({
  examenId,
  children,
}: {
  examenId: number;
  children: ReactNode;
}) {
  const {
    estado,
    cargando,
    error,
    segundosRestantes,
    bloqueada,
    reintentar,
  } = useTiempoRendicion(examenId);

  if (cargando && estado === null) {
    return (
      <main className="mx-auto w-full max-w-4xl p-6">
        <div aria-busy="true" role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-slate-700">
          Comprobando el tiempo de tu evaluación...
        </div>
      </main>
    );
  }

  if (estado === null) {
    return (
      <main className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-lg font-semibold text-amber-950">
            No se pudo consultar la rendición
          </h1>
          <p className="mt-2 text-sm text-amber-900">
            {error || 'No fue posible consultar el estado de la evaluación.'}
          </p>
          <p className="mt-2 text-sm text-amber-900">
            Comprueba que hayas iniciado la evaluación desde las instrucciones.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={reintentar} className="inline-flex items-center gap-2 rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950">
              <RefreshCw aria-hidden="true" className="size-4" /> Reintentar
            </button>
            <Link href={ROUTES.estudiante.instruccionesEvaluacion(examenId)} className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100">
              Ir a las instrucciones
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (bloqueada) {
    const enviada = estado.estado === 'enviada';
    return (
      <main className="mx-auto w-full max-w-4xl p-6">
        <section role="status" aria-live="polite" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            {enviada ? (
              <CheckCircle2 aria-hidden="true" className="size-8 text-emerald-600" />
            ) : (
              <Clock3 aria-hidden="true" className="size-8 text-amber-600" />
            )}
            <h1 className="text-xl font-semibold text-slate-900">
              {enviada ? 'Evaluación enviada' : 'El tiempo terminó'}
            </h1>
          </div>
          <p className="mt-4 text-slate-700">
            {enviada
              ? 'La rendición está cerrada. Las respuestas que el servidor ya había guardado se conservaron.'
              : 'Ya no puedes responder ni modificar respuestas. Si la evaluación tiene envío automático, el backend se encarga de finalizarla.'}
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-amber-800">
              No fue posible confirmar el estado más reciente: {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {!enviada && (
              <button type="button" onClick={reintentar} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
                <RefreshCw aria-hidden="true" className="size-4" /> Consultar estado
              </button>
            )}
            <Link href={ROUTES.estudiante.evaluaciones} className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Volver a mis evaluaciones
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const advertencia =
    segundosRestantes !== null && segundosRestantes <= 60;

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Clock3 aria-hidden="true" className="size-5" />
            Tiempo disponible
          </div>
          <output
            aria-label="Tiempo restante de la evaluación"
            aria-live="off"
            className={`rounded-lg px-4 py-2 font-mono text-xl font-bold tabular-nums ${
              advertencia
                ? 'bg-red-100 text-red-800'
                : 'bg-slate-100 text-slate-900'
            }`}
          >
            {formatearTiempo(segundosRestantes)}
          </output>
        </div>
        {advertencia && (
          <p role="status" className="mx-auto mt-2 max-w-5xl text-sm font-medium text-red-700">
            Queda menos de un minuto. Solo se enviarán las respuestas guardadas en el servidor.
          </p>
        )}
        {error && (
          <p role="alert" className="mx-auto mt-2 flex max-w-5xl items-center gap-2 text-sm text-amber-800">
            <AlertTriangle aria-hidden="true" className="size-4" />
            Sincronización interrumpida. El backend sigue controlando la hora límite.
          </p>
        )}
      </div>
      {children}
    </>
  );
}
