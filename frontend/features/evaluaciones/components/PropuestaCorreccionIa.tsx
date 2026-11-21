'use client';

import { useEffect, useState, type FormEvent } from 'react';

import type {
  AceptarCorreccionIaResponse,
  ActualizarCorreccionIaRequest,
  AdvertenciaAceptacionCorreccionIa,
  CorreccionIa,
  ErrorCorreccionIa,
  SolicitarCorreccionIaResponse,
} from '../correccion-ia.types';
import {
  correccionIaService,
  mensajeErrorCorreccionIa,
} from '../services/correccion-ia.service';

type PropuestaIaVista = CorreccionIa | SolicitarCorreccionIaResponse;

interface Props {
  propuesta: PropuestaIaVista;
  bloqueado: boolean;
  onAceptada: (
    propuesta: CorreccionIa,
    resultado: AceptarCorreccionIaResponse,
  ) => void;
}

const INTERVALO_CONSULTA_MS = 2500;

function esCorreccionIaCompleta(
  propuesta: PropuestaIaVista,
): propuesta is CorreccionIa {
  return 'version' in propuesta;
}

function puntajeValido(puntaje: string, maximo: string | null): boolean {
  const valor = Number(puntaje.replace(',', '.'));
  const limite = maximo === null ? NaN : Number(maximo);
  return (
    Number.isFinite(valor) &&
    Number.isFinite(limite) &&
    valor >= 0 &&
    valor <= limite &&
    Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-7
  );
}

export default function PropuestaCorreccionIa({
  propuesta: inicial,
  bloqueado,
  onAceptada,
}: Props) {
  const [propuesta, setPropuesta] = useState<PropuestaIaVista>(inicial);
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [puntaje, setPuntaje] = useState('');
  const [valoracion, setValoracion] = useState('');
  const [explicacion, setExplicacion] = useState('');
  const [errores, setErrores] = useState<ErrorCorreccionIa[]>([]);
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [advertencias, setAdvertencias] = useState<
    AdvertenciaAceptacionCorreccionIa[]
  >([]);

  const propuestaId = propuesta.propuesta_id;
  const estado = propuesta.estado;

  useEffect(() => {
    if (estado !== 'pendiente' && estado !== 'procesando') {
      return;
    }

    let activo = true;
    let temporizador: ReturnType<typeof setTimeout>;

    async function consultarDetalle() {
      try {
        const actualizada =
          await correccionIaService.obtenerDetalle(propuestaId);
        if (!activo) return;
        setPropuesta(actualizada);
        setErrorAccion(null);
        if (
          actualizada.estado === 'pendiente' ||
          actualizada.estado === 'procesando'
        ) {
          temporizador = setTimeout(
            consultarDetalle,
            INTERVALO_CONSULTA_MS,
          );
        }
      } catch (fallo: unknown) {
        if (!activo) return;
        setErrorAccion(mensajeErrorCorreccionIa(fallo));
        temporizador = setTimeout(consultarDetalle, INTERVALO_CONSULTA_MS);
      }
    }

    temporizador = setTimeout(consultarDetalle, INTERVALO_CONSULTA_MS);
    return () => {
      activo = false;
      clearTimeout(temporizador);
    };
  }, [estado, propuestaId]);

  function iniciarEdicion(correccion: CorreccionIa) {
    setPuntaje(correccion.puntaje_sugerido ?? '');
    setValoracion(correccion.valoracion ?? '');
    setExplicacion(correccion.explicacion ?? '');
    setErrores(correccion.errores ?? []);
    setEditando(true);
    setErrorAccion(null);
  }

  async function aceptar() {
    if (
      !esCorreccionIaCompleta(propuesta) ||
      propuesta.puntaje_sugerido === null
    ) {
      return;
    }

    setOcupado(true);
    setErrorAccion(null);
    try {
      const resultado = await correccionIaService.aceptar(
        propuesta.propuesta_id,
        {
          version: propuesta.version,
          puntaje_confirmado: propuesta.puntaje_sugerido,
        },
      );
      setPropuesta({ ...propuesta, estado: 'aceptada' });
      setAdvertencias(resultado.advertencias);
      onAceptada(propuesta, resultado);
    } catch (fallo: unknown) {
      setErrorAccion(mensajeErrorCorreccionIa(fallo));
    } finally {
      setOcupado(false);
    }
  }

  async function guardarCambios(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (
      !esCorreccionIaCompleta(propuesta) ||
      !puntajeValido(puntaje, propuesta.puntaje_max_inciso) ||
      errores.some(
        (error) => !error.tipo.trim() || !error.descripcion.trim(),
      )
    ) {
      return;
    }

    const cambios: ActualizarCorreccionIaRequest = {
      puntaje: Number(puntaje.replace(',', '.')),
      valoracion,
      explicacion,
      errores,
    };

    setOcupado(true);
    setErrorAccion(null);
    try {
      const actualizada = await correccionIaService.modificar(
        propuesta.propuesta_id,
        cambios,
      );
      setPropuesta(actualizada);
      setEditando(false);
    } catch (fallo: unknown) {
      setErrorAccion(mensajeErrorCorreccionIa(fallo));
    } finally {
      setOcupado(false);
    }
  }

  async function descartar() {
    if (!esCorreccionIaCompleta(propuesta)) return;
    setOcupado(true);
    setErrorAccion(null);
    try {
      await correccionIaService.descartar(propuesta.propuesta_id, {
        motivo: motivoDescarte.trim() || undefined,
      });
      setPropuesta({
        ...propuesta,
        estado: 'descartada',
        motivo: motivoDescarte.trim() || null,
      });
      setEditando(false);
    } catch (fallo: unknown) {
      setErrorAccion(mensajeErrorCorreccionIa(fallo));
    } finally {
      setOcupado(false);
    }
  }

  async function regenerar() {
    if (!esCorreccionIaCompleta(propuesta)) return;
    setOcupado(true);
    setErrorAccion(null);
    setAdvertencias([]);
    try {
      const nueva = await correccionIaService.regenerar(
        propuesta.examen_id,
        propuesta.estudiante_id,
        propuesta.pregunta_id,
        propuesta.letra,
      );
      setPropuesta(nueva);
    } catch (fallo: unknown) {
      setErrorAccion(mensajeErrorCorreccionIa(fallo));
    } finally {
      setOcupado(false);
    }
  }

  function cambiarError(
    indice: number,
    campo: keyof ErrorCorreccionIa,
    valor: string,
  ) {
    setErrores((actuales) =>
      actuales.map((error, posicion) =>
        posicion === indice ? { ...error, [campo]: valor } : error,
      ),
    );
  }

  const completa = esCorreccionIaCompleta(propuesta);
  const mostrarDetalle = completa && propuesta.puntaje_sugerido !== null;
  const puntajeMaximo = completa ? propuesta.puntaje_max_inciso : null;
  const puntajeEditable =
    completa && puntajeValido(puntaje, propuesta.puntaje_max_inciso);
  const erroresEditables = errores.every(
    (error) => error.tipo.trim() && error.descripcion.trim(),
  );
  const accionesDeshabilitadas = bloqueado || ocupado;

  return (
    <article
      aria-label="Resultado provisional generado con IA"
      className="space-y-4 rounded-xl border border-violet-300 bg-violet-50/70 p-4 dark:border-violet-800 dark:bg-violet-950/20"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-violet-900 dark:text-violet-100">
            Resultado provisional (generado con IA)
          </h3>
          <p className="mt-1 text-xs text-violet-800 dark:text-violet-200">
            Es una sugerencia y no modifica la calificación oficial hasta que la
            aceptes.
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-violet-800 dark:bg-slate-900 dark:text-violet-200">
          {estado}
        </span>
      </header>

      {(estado === 'pendiente' || estado === 'procesando') && (
        <p role="status" className="text-sm text-slate-700 dark:text-slate-200">
          {estado === 'pendiente'
            ? 'La propuesta está pendiente de procesamiento.'
            : 'La propuesta se está procesando. Esta tarjeta se actualizará automáticamente.'}
        </p>
      )}

      {estado === 'error' && (
        <div className="space-y-3">
          <p className="text-sm text-red-800 dark:text-red-200">
            {completa && propuesta.error_mensaje
              ? propuesta.error_mensaje
              : 'No se pudo generar la propuesta.'}
          </p>
          <button
            type="button"
            disabled={accionesDeshabilitadas || !completa}
            onClick={regenerar}
            className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ocupado ? 'Regenerando…' : 'Regenerar'}
          </button>
        </div>
      )}

      {mostrarDetalle && (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <strong>Puntaje sugerido:</strong>{' '}
            {propuesta.puntaje_sugerido} / {propuesta.puntaje_max_inciso ?? '—'}
          </p>
          <p>
            <strong>Confianza:</strong>{' '}
            {propuesta.confianza === null
              ? 'No disponible'
              : `${Math.round(Number(propuesta.confianza) * 100)}%`}
          </p>
          <p className="sm:col-span-2">
            <strong>Valoración:</strong> {propuesta.valoracion ?? '—'}
          </p>
          <p className="whitespace-pre-wrap sm:col-span-2">
            <strong>Explicación:</strong> {propuesta.explicacion ?? '—'}
          </p>
          <div className="sm:col-span-2">
            <strong>Errores detectados:</strong>
            {propuesta.errores && propuesta.errores.length > 0 ? (
              <ul className="mt-1 list-inside list-disc space-y-1">
                {propuesta.errores.map((error, indice) => (
                  <li key={`${error.tipo}-${indice}`}>
                    <span className="font-semibold">{error.tipo}:</span>{' '}
                    {error.descripcion}
                    {error.ubicacion ? ` (${error.ubicacion})` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                No se detectaron errores.
              </p>
            )}
          </div>
        </div>
      )}

      {editando && completa && (
        <form onSubmit={guardarCambios} className="space-y-3 border-t border-violet-200 pt-4 dark:border-violet-900">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium">
              <span>Puntaje sugerido</span>
              <input
                aria-label="Puntaje sugerido"
                type="number"
                min="0"
                max={puntajeMaximo ?? undefined}
                step="0.01"
                value={puntaje}
                onChange={(evento) => setPuntaje(evento.target.value)}
                disabled={accionesDeshabilitadas}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1 text-xs font-medium">
              <span>Valoración</span>
              <input
                aria-label="Valoración"
                value={valoracion}
                onChange={(evento) => setValoracion(evento.target.value)}
                disabled={accionesDeshabilitadas}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs font-medium">
            <span>Explicación</span>
            <textarea
              aria-label="Explicación"
              rows={3}
              value={explicacion}
              onChange={(evento) => setExplicacion(evento.target.value)}
              disabled={accionesDeshabilitadas}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold">Errores detectados</legend>
            {errores.map((error, indice) => (
              <div
                key={indice}
                className="grid gap-2 sm:grid-cols-[minmax(120px,0.35fr)_1fr_minmax(120px,0.35fr)_auto]"
              >
                <input
                  aria-label={`Tipo del error ${indice + 1}`}
                  value={error.tipo}
                  onChange={(evento) =>
                    cambiarError(indice, 'tipo', evento.target.value)
                  }
                  placeholder="Tipo"
                  disabled={accionesDeshabilitadas}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  aria-label={`Descripción del error ${indice + 1}`}
                  value={error.descripcion}
                  onChange={(evento) =>
                    cambiarError(indice, 'descripcion', evento.target.value)
                  }
                  placeholder="Descripción"
                  disabled={accionesDeshabilitadas}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  aria-label={`Ubicación del error ${indice + 1}`}
                  value={error.ubicacion ?? ''}
                  onChange={(evento) =>
                    cambiarError(indice, 'ubicacion', evento.target.value)
                  }
                  placeholder="Ubicación (opcional)"
                  disabled={accionesDeshabilitadas}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  aria-label={`Quitar error ${indice + 1}`}
                  onClick={() =>
                    setErrores((actuales) =>
                      actuales.filter((_, posicion) => posicion !== indice),
                    )
                  }
                  disabled={accionesDeshabilitadas}
                  className="rounded-lg border border-slate-300 px-2 text-xs dark:border-slate-700"
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setErrores((actuales) => [
                  ...actuales,
                  { tipo: '', descripcion: '' },
                ])
              }
              disabled={accionesDeshabilitadas}
              className="rounded-lg border border-violet-300 px-3 py-2 text-xs font-semibold text-violet-800 dark:border-violet-800 dark:text-violet-200"
            >
              Agregar error
            </button>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={
                accionesDeshabilitadas || !puntajeEditable || !erroresEditables
              }
              className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ocupado ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              disabled={ocupado}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {completa &&
        (estado === 'generada' || estado === 'modificada') &&
        !editando && (
          <div className="space-y-3 border-t border-violet-200 pt-4 dark:border-violet-900">
            <label className="block space-y-1 text-xs font-medium">
              <span>Motivo para descartar (opcional)</span>
              <input
                aria-label="Motivo para descartar (opcional)"
                maxLength={300}
                value={motivoDescarte}
                onChange={(evento) => setMotivoDescarte(evento.target.value)}
                disabled={accionesDeshabilitadas}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={aceptar}
                disabled={
                  accionesDeshabilitadas || propuesta.puntaje_sugerido === null
                }
                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ocupado ? 'Aceptando…' : 'Aceptar'}
              </button>
              <button
                type="button"
                onClick={() => iniciarEdicion(propuesta)}
                disabled={accionesDeshabilitadas}
                className="rounded-lg border border-violet-300 px-3 py-2 text-xs font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:text-violet-200"
              >
                Modificar
              </button>
              <button
                type="button"
                onClick={descartar}
                disabled={accionesDeshabilitadas}
                className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-200"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

      {estado === 'descartada' && (
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Propuesta descartada.
        </p>
      )}
      {estado === 'aceptada' && (
        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          Propuesta aceptada y calificación oficial actualizada.
        </p>
      )}
      {estado === 'reemplazada' && (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Esta propuesta fue reemplazada.
        </p>
      )}

      {advertencias.map((advertencia) => (
        <p
          key={advertencia.codigo}
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {advertencia.mensaje}
        </p>
      ))}
      {errorAccion && (
        <p role="alert" className="text-xs text-red-700 dark:text-red-300">
          {errorAccion}
        </p>
      )}
    </article>
  );
}
