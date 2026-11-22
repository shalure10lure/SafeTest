'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type {
  CorreccionIa,
  EstadoCorreccionIa,
  FiltrosBandejaCorreccionIa,
} from '../correccion-ia.types';
import {
  correccionIaService,
  mensajeErrorCorreccionIa,
} from '../services/correccion-ia.service';

const TAMANO_PAGINA = 10;

const ESTADOS: { valor: EstadoCorreccionIa; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'procesando', etiqueta: 'En proceso' },
  { valor: 'generada', etiqueta: 'Generada' },
  { valor: 'modificada', etiqueta: 'Modificada' },
  { valor: 'aceptada', etiqueta: 'Aceptada' },
  { valor: 'descartada', etiqueta: 'Descartada' },
  { valor: 'reemplazada', etiqueta: 'Reemplazada' },
  { valor: 'error', etiqueta: 'Error' },
];

function etiquetaEstado(estado: EstadoCorreccionIa): string {
  return ESTADOS.find((opcion) => opcion.valor === estado)?.etiqueta ?? estado;
}

function esperaDecision(estado: EstadoCorreccionIa): boolean {
  return estado === 'generada' || estado === 'modificada';
}

function enlaceRevision(examenId: number, propuesta: CorreccionIa): string {
  return `/docente/evaluaciones/${examenId}/calificaciones/${propuesta.estudiante_id}#revision-${propuesta.pregunta_id}-${encodeURIComponent(propuesta.letra)}`;
}

interface Props {
  examenId: number;
  seguimientoLote?: boolean;
  onSeguimientoFinalizado?: () => void;
}

export default function BandejaCorreccionesIa({
  examenId,
  seguimientoLote = false,
  onSeguimientoFinalizado,
}: Props) {
  const [estado, setEstado] = useState<EstadoCorreccionIa | ''>('');
  const [estudianteTexto, setEstudianteTexto] = useState('');
  const [soloPendientesRevision, setSoloPendientesRevision] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [reintento, setReintento] = useState(0);
  const [respuesta, setRespuesta] = useState<{
    total: number;
    propuestas: CorreccionIa[];
  } | null>(null);
  const [consultaTerminada, setConsultaTerminada] = useState('');
  const [errorConsulta, setErrorConsulta] = useState<{
    clave: string;
    mensaje: string;
  } | null>(null);

  const estudianteId =
    estudianteTexto.trim() === '' ? undefined : Number(estudianteTexto);
  const estudianteValido =
    estudianteId === undefined ||
    (Number.isSafeInteger(estudianteId) && estudianteId > 0);

  const filtros = useMemo<FiltrosBandejaCorreccionIa>(
    () => ({
      limite: TAMANO_PAGINA,
      desplazamiento: (pagina - 1) * TAMANO_PAGINA,
      ...(estado ? { estado } : {}),
      ...(estudianteValido && estudianteId !== undefined
        ? { estudiante_id: estudianteId }
        : {}),
      ...(soloPendientesRevision
        ? { solo_pendientes_revision: true }
        : {}),
    }),
    [
      estado,
      estudianteId,
      estudianteValido,
      pagina,
      soloPendientesRevision,
    ],
  );
  const claveConsulta = JSON.stringify([examenId, filtros, reintento]);

  useEffect(() => {
    if (!estudianteValido) return;

    let activa = true;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    async function consultar() {
      try {
        const resultado = await correccionIaService.listarPorExamen(
          examenId,
          seguimientoLote
            ? { limite: 200, desplazamiento: 0 }
            : filtros,
        );
        if (!activa) return;
        setRespuesta(resultado);
        setErrorConsulta(null);
        setConsultaTerminada(claveConsulta);
        const hayPropuestasActivas = resultado.propuestas.some(
          (propuesta) =>
            propuesta.estado === 'pendiente' ||
            propuesta.estado === 'procesando',
        );
        if (seguimientoLote && hayPropuestasActivas) {
          temporizador = setTimeout(() => void consultar(), 2500);
        } else if (seguimientoLote) {
          onSeguimientoFinalizado?.();
        }
      } catch (fallo: unknown) {
        if (!activa) return;
        setErrorConsulta({
          clave: claveConsulta,
          mensaje: mensajeErrorCorreccionIa(fallo),
        });
        setConsultaTerminada(claveConsulta);
        if (seguimientoLote) {
          temporizador = setTimeout(() => void consultar(), 2500);
        }
      }
    }

    void consultar();

    return () => {
      activa = false;
      if (temporizador !== undefined) clearTimeout(temporizador);
    };
  }, [
    claveConsulta,
    examenId,
    filtros,
    estudianteValido,
    seguimientoLote,
    onSeguimientoFinalizado,
  ]);

  const consultaActual = consultaTerminada === claveConsulta;
  const cargando = estudianteValido && !consultaActual;
  const error =
    errorConsulta?.clave === claveConsulta ? errorConsulta.mensaje : null;
  const registros = consultaActual && !error && estudianteValido
    ? respuesta?.propuestas ?? []
    : [];
  const filtradas = seguimientoLote
    ? registros.filter((propuesta) => {
        if (estado && propuesta.estado !== estado) return false;
        if (estudianteId !== undefined && propuesta.estudiante_id !== estudianteId) {
          return false;
        }
        if (
          soloPendientesRevision &&
          !esperaDecision(propuesta.estado)
        ) {
          return false;
        }
        return true;
      })
    : registros;
  const propuestas = seguimientoLote
    ? filtradas.slice(
        (pagina - 1) * TAMANO_PAGINA,
        pagina * TAMANO_PAGINA,
      )
    : filtradas;
  const total = consultaActual && !error && estudianteValido
    ? seguimientoLote
      ? filtradas.length
      : (respuesta?.total ?? 0)
    : 0;
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const resumenPagina = {
    generada: propuestas.filter((propuesta) => propuesta.estado === 'generada')
      .length,
    modificada: propuestas.filter(
      (propuesta) => propuesta.estado === 'modificada',
    ).length,
    error: propuestas.filter((propuesta) => propuesta.estado === 'error').length,
    enProceso: propuestas.filter(
      (propuesta) =>
        propuesta.estado === 'pendiente' ||
        propuesta.estado === 'procesando',
    ).length,
  };

  return (
    <section
      aria-label="Bandeja de propuestas de corrección IA"
      className="space-y-4 rounded-xl border border-violet-200 bg-white p-4 dark:border-violet-900 dark:bg-slate-900"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Propuestas de corrección IA</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Resultados provisionales para revisar desde el inciso. Esta bandeja
            solo permite consultar y navegar.
          </p>
        </div>
        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
          {total} propuestas
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-violet-50 p-3 dark:bg-violet-950/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Generadas</p>
          <p className="mt-1 text-xl font-bold">{resumenPagina.generada}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Modificadas</p>
          <p className="mt-1 text-xl font-bold">{resumenPagina.modificada}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">Errores</p>
          <p className="mt-1 text-xl font-bold">{resumenPagina.error}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">En proceso</p>
          <p className="mt-1 text-xl font-bold">{resumenPagina.enProceso}</p>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        Conteos de la página actual; el total se actualiza con los filtros
        aplicados.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs font-medium">
          <span>Estado</span>
          <select
            aria-label="Filtrar propuestas por estado"
            value={estado}
            onChange={(evento) => {
              setEstado(evento.target.value as EstadoCorreccionIa | '');
              setPagina(1);
            }}
            className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          <span>Estudiante (ID)</span>
          <input
            aria-label="Filtrar propuestas por estudiante"
            type="number"
            min="1"
            step="1"
            value={estudianteTexto}
            onChange={(evento) => {
              setEstudianteTexto(evento.target.value);
              setPagina(1);
            }}
            className="block w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-xs">
          <input
            aria-label="Solo pendientes de revisión"
            type="checkbox"
            checked={soloPendientesRevision}
            onChange={(evento) => {
              setSoloPendientesRevision(evento.target.checked);
              setPagina(1);
            }}
            className="h-4 w-4 rounded border-slate-300 text-violet-700"
          />
          Solo pendientes de revisión
        </label>
      </div>

      {!estudianteValido && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          Ingresa un ID de estudiante entero mayor que cero.
        </p>
      )}
      {cargando && (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          Cargando propuestas de corrección IA…
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setReintento((actual) => actual + 1)}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold dark:border-red-800"
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && estudianteValido && propuestas.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-slate-950/40">
          No hay propuestas que coincidan con los filtros.
        </p>
      )}

      {!cargando && !error && propuestas.length > 0 && (
        <ul className="space-y-3">
          {propuestas.map((propuesta) => {
            const requiereDecision = esperaDecision(propuesta.estado);
            return (
              <li
                key={propuesta.propuesta_id}
                className={`rounded-lg border p-4 ${
                  requiereDecision
                    ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20'
                    : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/30'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-violet-900 dark:text-violet-100">
                      Resultado provisional (generado con IA)
                    </p>
                    <p className="text-sm font-semibold">
                      Estudiante #{propuesta.estudiante_id} · Pregunta #
                      {propuesta.pregunta_id} · inciso {propuesta.letra}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Puntaje sugerido:{' '}
                      {propuesta.puntaje_sugerido ?? 'No disponible'} /{' '}
                      {propuesta.puntaje_max_inciso ?? '—'}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {propuesta.error_mensaje ??
                        propuesta.valoracion ??
                        'Sin valoración disponible.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {etiquetaEstado(propuesta.estado)}
                    </span>
                    {requiereDecision && (
                      <span className="rounded-full bg-amber-200 px-2.5 py-1 text-[10px] font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
                        Espera decisión docente
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-400">
                    Intento {propuesta.intento}
                  </p>
                  <Link
                    href={enlaceRevision(examenId, propuesta)}
                    className="inline-flex rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200"
                  >
                    Abrir inciso →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <p className="text-slate-500 dark:text-slate-400">
          {total === 0
            ? '0 propuestas'
            : `${(pagina - 1) * TAMANO_PAGINA + 1}–${Math.min(
                pagina * TAMANO_PAGINA,
                total,
              )} de ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pagina <= 1 || cargando}
            onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
          >
            Anterior
          </button>
          <span aria-live="polite">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            disabled={pagina >= totalPaginas || cargando}
            onClick={() =>
              setPagina((actual) => Math.min(totalPaginas, actual + 1))
            }
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
          >
            Siguiente
          </button>
        </div>
      </footer>
    </section>
  );
}
