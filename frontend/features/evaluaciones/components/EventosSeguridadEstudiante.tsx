'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { evaluacionesService } from '../services/evaluaciones.service';
import { mensajeDeError } from '../mensaje-error';
import type { ResumenSeguridadDocente } from '../types';

interface Props {
  examenId: number;
  estudianteId: number;
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/La_Paz',
});

function mostrarFecha(valor: string | null): string {
  if (!valor) return 'Fecha no disponible';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? 'Fecha no disponible'
    : FORMATO_FECHA.format(fecha);
}

function descripcionEvento(tipo: string): string {
  switch (tipo) {
    case 'pestana_oculta':
      return 'La pestaña de la evaluación pasó a estar oculta';
    case 'desbloqueo_docente':
      return 'El docente autorizó el desbloqueo de la rendición';
    default:
      return tipo.replaceAll('_', ' ');
  }
}

/**
 * HU-43 en el detalle de calificaciones HU-31.
 * Lee el historial de seguridad desde el endpoint docente ya existente.
 * Nunca asume que "sin registros" significa "sin uso de otros recursos".
 */
export default function EventosSeguridadEstudiante({
  examenId,
  estudianteId,
}: Props) {
  const [datos, setDatos] = useState<ResumenSeguridadDocente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setDatos(null);
    setError('');

    evaluacionesService.getSeguridadRendiciones(examenId)
      .then((resultado) => {
        if (activo) setDatos(resultado);
      })
      .catch((fallo: unknown) => {
        if (activo) {
          setError(mensajeDeError(fallo, 'No fue posible consultar los eventos de seguridad.'));
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => { activo = false; };
  }, [examenId, estudianteId, revision]);

  const rendicion = datos?.rendiciones.find(
    (item) => item.estudiante_id === estudianteId,
  );
  const eventos = rendicion?.eventos ?? [];
  const bloqueoActivo = rendicion?.estado === 'en_curso' &&
    rendicion.bloqueada_seguridad_en !== null;

  return (
    <section
      aria-label="Eventos de seguridad"
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Eventos de seguridad</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setRevision((actual) => actual + 1)}
            disabled={cargando}
            className="font-medium text-blue-700 hover:underline disabled:opacity-50 dark:text-blue-300"
          >
            {cargando ? 'Consultando…' : 'Actualizar'}
          </button>
          <Link
            href={`/docente/evaluaciones/${examenId}/seguridad`}
            className="font-medium text-blue-700 hover:underline dark:text-blue-300"
          >
            Administrar bloqueos
          </Link>
        </div>
      </div>

      {cargando && (
        <p role="status" className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Consultando los eventos registrados…
        </p>
      )}

      {!cargando && error && (
        <p role="alert" className="mt-3 text-xs text-red-700 dark:text-red-300">
          {error} No es posible determinar el historial mientras exista este error.
        </p>
      )}

      {!cargando && !error && !rendicion && (
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          No se encontró una rendición para este estudiante en el historial de seguridad.
        </p>
      )}

      {!cargando && !error && rendicion && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {eventos.length} {eventos.length === 1 ? 'evento registrado' : 'eventos registrados'}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                bloqueoActivo
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {bloqueoActivo ? 'Rendición bloqueada' : 'Sin bloqueo activo'}
            </span>
          </div>

          {rendicion.bloqueada_seguridad_en && (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Bloqueo registrado: {mostrarFecha(rendicion.bloqueada_seguridad_en)}
            </p>
          )}

          {eventos.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              No hay eventos registrados para esta rendición.
            </p>
          ) : (
            <ol className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              {[...eventos].reverse().map((evento) => (
                <li key={evento.evento_id} className="flex flex-col gap-1 text-xs sm:flex-row sm:justify-between sm:gap-3">
                  <span className="text-slate-700 dark:text-slate-200">
                    {descripcionEvento(evento.tipo)}
                  </span>
                  <time className="shrink-0 text-slate-500 dark:text-slate-400" dateTime={evento.fecha_hora}>
                    {mostrarFecha(evento.fecha_hora)}
                  </time>
                </li>
              ))}
            </ol>
          )}
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Son eventos reportados por el navegador, no pruebas de uso de otras aplicaciones.
            La ausencia de registros tampoco garantiza que no hayan ocurrido cambios.
          </p>
        </div>
      )}
    </section>
  );
}
