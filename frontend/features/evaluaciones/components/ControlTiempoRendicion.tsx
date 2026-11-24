'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { evaluacionesService } from '../services/evaluaciones.service';
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

  // El hook del tiempo conserva su contrato anterior; el backend devuelve
  // metadatos de seguridad adicionales en el mismo endpoint de estado.
  const seguridad = estado as (typeof estado & {
    bloquear_primer_cambio_pestana?: boolean;
    bloqueada_seguridad?: boolean;
  }) | null;
  const estricto = seguridad?.bloquear_primer_cambio_pestana === true;
  const bloqueadaEnServidor = seguridad?.bloqueada_seguridad === true && seguridad?.estado === 'en_curso';
  const [bloqueoLocal, setBloqueoLocal] = useState<
    'ninguno' | 'registrando' | 'confirmado' | 'error'
  >('ninguno');
  const enviandoEvento = useRef(false);

  const registrarEvento = useCallback(async () => {
    if (enviandoEvento.current) return;
    enviandoEvento.current = true;
    if (estricto) setBloqueoLocal('registrando');
    try {
      const respuesta = await evaluacionesService.registrarCambioPestana(examenId);
      if (respuesta.bloqueada_seguridad) {
        setBloqueoLocal('confirmado');
      } else {
        setBloqueoLocal('ninguno');
      }
    } catch {
      // No afirmamos que el servidor bloqueó si no contestó. Sin embargo,
      // en modo estricto detenemos la interfaz hasta confirmar el evento.
      setBloqueoLocal(estricto ? 'error' : 'ninguno');
    } finally {
      enviandoEvento.current = false;
    }
  }, [examenId, estricto]);

  useEffect(() => {
    if (!seguridad || seguridad.estado !== 'en_curso' || bloqueada ||
        bloqueadaEnServidor || bloqueoLocal !== 'ninguno') return;

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'hidden') {
        void registrarEvento();
      }
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  }, [seguridad?.estado, bloqueada, bloqueadaEnServidor, bloqueoLocal, registrarEvento]);

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

  if (bloqueadaEnServidor || bloqueoLocal !== 'ninguno') {
    const confirmada = bloqueadaEnServidor || bloqueoLocal === 'confirmado';
    return (
      <main className="mx-auto w-full max-w-4xl p-6">
        <section role="alert" className="rounded-xl border border-amber-300 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <AlertTriangle aria-hidden="true" className="size-8 text-amber-600" />
            <h1 className="text-xl font-semibold text-slate-900">
              {confirmada ? 'Rendición restringida por seguridad' : 'Comprobando evento de seguridad'}
            </h1>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700">
            {confirmada
              ? 'Se registró un cambio de pestaña. El servidor restringió esta rendición. Tus respuestas guardadas siguen conservadas. Contacta a tu docente para que revise el evento y, si corresponde, la desbloquee.'
              : 'Se detectó que la pestaña quedó oculta. No podrás continuar hasta que se registre o se confirme el evento con el servidor.'}
          </p>
          {bloqueoLocal === 'error' && (
            <p className="mt-3 text-sm text-amber-900">
              No se pudo confirmar el registro (posible fallo de conexión). Reintenta antes de seguir.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {bloqueoLocal === 'error' && (
              <button type="button" onClick={() => void registrarEvento()}
                className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950">
                Reintentar registro
              </button>
            )}
            <button type="button" onClick={() => window.location.reload()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Consultar si el docente desbloqueó
            </button>
            <Link href={ROUTES.estudiante.evaluaciones} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">
              Volver a mis evaluaciones
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
      {estricto && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Modo estricto activado: si abandonas esta pestaña durante la rendición,
          tu evaluación será bloqueada hasta revisión del docente.
        </p>
      )}
      {children}
    </>
  );
}
