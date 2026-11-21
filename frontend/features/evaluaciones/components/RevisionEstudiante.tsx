'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DetalleCalificacion, IncisoCalificacion, PreguntaCalificacion,
  RespuestaValoracion, ResumenCalificaciones,
} from '../calificaciones.types';
import { calificacionesService, mensajeErrorCalificaciones } from '../services/calificaciones.service';
import type {
  AceptarCorreccionIaResponse,
  CorreccionIa,
  SolicitarCorreccionIaResponse,
} from '../correccion-ia.types';
import {
  correccionIaService,
  mensajeErrorCorreccionIa,
} from '../services/correccion-ia.service';
import FormularioValoracion from './FormularioValoracion';
import PropuestaCorreccionIa from './PropuestaCorreccionIa';

type FilaInciso = { pregunta: PreguntaCalificacion; inciso: IncisoCalificacion };
type PropuestaIaVista = CorreccionIa | SolicitarCorreccionIaResponse;
const clave = (fila: FilaInciso) => `${fila.pregunta.pregunta_id}-${fila.inciso.letra}`;
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const puntos = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 2 });
const estadosConPropuestaReutilizable = new Set([
  'pendiente',
  'procesando',
  'generada',
  'modificada',
  'error',
]);

/**
 * Cálculo solamente visual para rendiciones con incisos pendientes.
 * Imita la ponderación por pregunta del backend, pero NUNCA reemplaza nota_final.
 */
function puntajeProvisional(detalle: DetalleCalificacion) {
  let automatico = 0;
  let manual = 0;
  let maximo = 0;
  for (const pregunta of detalle.preguntas) {
    const maxBanco = pregunta.incisos.reduce((s, i) => s + Number(i.puntaje_max), 0);
    const maxExamen = pregunta.puntaje_maximo_evaluacion ?? maxBanco;
    if (!Number.isFinite(maxBanco) || maxBanco <= 0 || !Number.isFinite(maxExamen)) continue;
    maximo += maxExamen;
    const sumaAutomatica = pregunta.incisos.reduce((s, i) =>
      s + (i.estado_correccion === 'automatica' ? Number(i.puntaje_obtenido ?? 0) : 0), 0);
    const sumaManual = pregunta.incisos.reduce((s, i) =>
      s + (i.estado_correccion === 'manual' || i.estado_correccion === 'revisada'
        ? Number(i.puntaje_obtenido ?? 0) : 0), 0);
    automatico += redondear(sumaAutomatica * maxExamen / maxBanco);
    manual += redondear(sumaManual * maxExamen / maxBanco);
  }
  return {
    automatico: redondear(automatico),
    manual: redondear(manual),
    total: redondear(automatico + manual),
    maximo: redondear(maximo),
  };
}

function respuestaCorta(i: IncisoCalificacion): string {
  const marcadas = i.opciones.filter((o) => o.seleccionada).map((o) => o.texto_opcion);
  if (marcadas.length) return marcadas.join(', ');
  if (i.respuesta_texto?.trim()) return i.respuesta_texto;
  if (i.procedimiento?.resultado_final) return i.procedimiento.resultado_final;
  return 'Sin respuesta';
}
function solucionCorta(i: IncisoCalificacion): string {
  const correctas = i.opciones.filter((o) => o.correcta).map((o) => o.texto_opcion);
  if (correctas.length) return correctas.join(', ');
  if (i.solucion_numerica !== null) return i.solucion_numerica;
  if (i.solucion_referencia?.trim()) return i.solucion_referencia;
  return 'Referencia no registrada';
}

export default function RevisionEstudiante({ examenId, estudianteId }: { examenId: number; estudianteId: number }) {
  const router = useRouter();
  const [detalle, setDetalle] = useState<DetalleCalificacion | null>(null);
  const [resumen, setResumen] = useState<ResumenCalificaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [claveCargada, setClaveCargada] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [editandoAuto, setEditandoAuto] = useState<string | null>(null);
  const [propuestasIa, setPropuestasIa] = useState<
    Record<string, PropuestaIaVista>
  >({});
  const [solicitandoIa, setSolicitandoIa] = useState<string | null>(null);

  const rutaGeneral = `/docente/evaluaciones/${examenId}/calificaciones`;
  const cargar = useCallback(async () => {
    const [respuestas, lista] = await Promise.all([
      calificacionesService.detalle(examenId, estudianteId),
      calificacionesService.resumen(examenId),
    ]);
    setDetalle(respuestas);
    setResumen(lista);
  }, [examenId, estudianteId]);

  useEffect(() => {
    let activo = true;
    async function cargarInicial() {
      try {
        const [respuestas, lista] = await Promise.all([
          calificacionesService.detalle(examenId, estudianteId),
          calificacionesService.resumen(examenId),
        ]);
        if (!activo) return;
        setError(null);
        setMensaje(null);
        setDetalle(respuestas);
        setResumen(lista);
        setPropuestasIa({});
        const pendientesIniciales = respuestas.preguntas.flatMap((pregunta) =>
          pregunta.incisos
            .filter((inciso) => inciso.pendiente_revision)
            .map((inciso) => ({ pregunta, inciso })),
        );
        const clavesPendientes = new Set(pendientesIniciales.map(clave));
        try {
          const bandeja = await correccionIaService.listarPorExamen(
            examenId,
            {
              estudiante_id: estudianteId,
              limite: 200,
              desplazamiento: 0,
            },
          );
          if (!activo) return;
          const recuperadas: Record<string, PropuestaIaVista> = {};
          const propuestasOrdenadas = [...bandeja.propuestas].sort(
            (a, b) =>
              b.intento - a.intento ||
              Date.parse(b.actualizada_en) - Date.parse(a.actualizada_en),
          );
          for (const propuesta of propuestasOrdenadas) {
            const identificador = `${propuesta.pregunta_id}-${propuesta.letra}`;
            if (
              clavesPendientes.has(identificador) &&
              estadosConPropuestaReutilizable.has(propuesta.estado) &&
              !recuperadas[identificador]
            ) {
              recuperadas[identificador] = propuesta;
            }
          }
          setPropuestasIa((actuales) => ({ ...recuperadas, ...actuales }));
        } catch (fallo: unknown) {
          if (activo) setError(mensajeErrorCorreccionIa(fallo));
        }
      } catch (fallo: unknown) {
        if (activo) {
          setMensaje(null);
          setError(mensajeErrorCalificaciones(fallo));
          setDetalle(null);
          setResumen(null);
          setPropuestasIa({});
        }
      } finally {
        if (activo) {
          setClaveCargada(`${examenId}:${estudianteId}`);
          setCargando(false);
        }
      }
    }

    void cargarInicial();
    return () => { activo = false; };
  }, [examenId, estudianteId]);

  const filas: FilaInciso[] = useMemo(() => detalle?.preguntas.flatMap((pregunta) =>
    pregunta.incisos.map((inciso) => ({ pregunta, inciso }))) ?? [], [detalle]);
  const automaticas = filas.filter((f) => f.inciso.estado_correccion === 'automatica' && !f.inciso.pendiente_revision);
  const manuales = filas.filter((f) => f.inciso.estado_correccion !== 'automatica' || f.inciso.pendiente_revision);
  const pendientes = filas.filter((f) => f.inciso.pendiente_revision);
  const parciales = detalle ? puntajeProvisional(detalle) : null;
  const estudiante = resumen?.estudiantes.find((e) => e.estudiante_id === estudianteId);
  const candidatos = resumen?.estudiantes.filter((e) => e.estado !== 'en_curso') ?? [];
  const indice = candidatos.findIndex((e) => e.estudiante_id === estudianteId);
  const siguiente = candidatos[indice + 1];
  const confirmadas = !!detalle?.calificaciones_revisadas_en;
  const publicados = !!detalle?.resultados_publicados_en;
  const cargandoPantalla =
    cargando || claveCargada !== `${examenId}:${estudianteId}`;
  const bloqueado = confirmadas || publicados || detalle?.estado_rendicion === 'en_curso' || !!guardando;
  const completadas = filas.length - pendientes.length;
  const progreso = filas.length > 0 ? Math.round(completadas * 100 / filas.length) : 0;

  useEffect(() => {
    if (cargandoPantalla || !window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [cargandoPantalla]);

  async function guardarValoracion(preguntaId: number, letra: string, datos: RespuestaValoracion) {
    const identificador = `${preguntaId}-${letra}`;
    setError(null);
    setMensaje(null);
    setGuardando(identificador);
    try {
      await calificacionesService.valorar(examenId, estudianteId, preguntaId, letra, datos);
      setPropuestasIa((actuales) => {
        const restantes = { ...actuales };
        delete restantes[identificador];
        return restantes;
      });
      await cargar();
      setMensaje('Puntaje guardado y calificación recalculada correctamente.');
    } catch (fallo: unknown) {
      throw new Error(mensajeErrorCalificaciones(fallo));
    } finally {
      setGuardando(null);
    }
  }

  async function solicitarPropuesta(fila: FilaInciso) {
    const identificador = clave(fila);
    if (bloqueado || solicitandoIa !== null) return;
    setError(null);
    setSolicitandoIa(identificador);
    try {
      const propuesta = await correccionIaService.solicitar(
        examenId,
        estudianteId,
        fila.pregunta.pregunta_id,
        fila.inciso.letra,
      );
      setPropuestasIa((actuales) => ({
        ...actuales,
        [identificador]: propuesta,
      }));
    } catch (fallo: unknown) {
      setError(mensajeErrorCorreccionIa(fallo));
    } finally {
      setSolicitandoIa(null);
    }
  }

  function aplicarAceptacion(
    propuesta: CorreccionIa,
    resultado: AceptarCorreccionIaResponse,
  ) {
    const calificacion = resultado.calificacion;
    setError(null);
    setMensaje('Propuesta aceptada y calificación oficial actualizada.');
    setDetalle((actual) => {
      if (!actual) return actual;
      return {
        ...actual,
        nota_final: calificacion.nota_final,
        estado_rendicion: calificacion.estado_rendicion,
        preguntas: actual.preguntas.map((pregunta) =>
          pregunta.pregunta_id !== propuesta.pregunta_id
            ? pregunta
            : {
                ...pregunta,
                incisos: pregunta.incisos.map((inciso) =>
                  inciso.letra !== propuesta.letra
                    ? inciso
                    : {
                        ...inciso,
                        puntaje_obtenido: calificacion.puntaje_obtenido,
                        estado_correccion: calificacion.estado_correccion,
                        pendiente_revision: false,
                      },
                ),
              },
        ),
      };
    });
    void cargar().catch((fallo: unknown) => {
      setError(mensajeErrorCalificaciones(fallo));
    });
  }

  function irA(fila: FilaInciso) {
    document.getElementById(`revision-${clave(fila)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function irAlSiguiente(actual: FilaInciso) {
    const posicion = pendientes.findIndex((f) => clave(f) === clave(actual));
    const siguientePendiente = pendientes[posicion + 1] ?? pendientes.find((f) => clave(f) !== clave(actual));
    if (siguientePendiente) irA(siguientePendiente);
    else router.push(rutaGeneral);
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 text-slate-900 md:px-6 dark:text-slate-100">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <Link href="/docente/evaluaciones" className="hover:text-violet-600">Mis evaluaciones</Link>
            <span aria-hidden="true">›</span>
            <Link href={rutaGeneral} className="hover:text-violet-600">Resultados</Link>
            <span aria-hidden="true">›</span>
            <span className="truncate">{detalle?.nombre_completo ?? `Estudiante #${estudianteId}`}</span>
          </nav>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{detalle?.nombre_completo ?? 'Revisión individual'} · {detalle?.titulo ?? `Evaluación #${examenId}`}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {estudiante?.fecha_envio ? `Entregado el ${new Date(estudiante.fecha_envio).toLocaleString('es-BO')}` : detalle?.estado_rendicion === 'en_curso' ? 'Evaluación en curso' : 'Fecha de entrega no disponible'}
            {parciales && ` · ${detalle?.nota_final !== null ? 'Nota final' : 'Puntaje provisional'} ${puntos(detalle?.nota_final !== null ? Number(detalle?.nota_final) : parciales.total)}/${puntos(Number(resumen?.puntaje_total ?? parciales.maximo))}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="cambiar-estudiante">Cambiar estudiante</label>
          <select
            id="cambiar-estudiante" value={estudianteId}
            onChange={(e) => router.push(`${rutaGeneral}/${e.target.value}`)}
            className="max-w-[190px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
          >
            {!candidatos.some((e) => e.estudiante_id === estudianteId) && <option value={estudianteId}>{detalle?.nombre_completo ?? `Estudiante ${estudianteId}`}</option>}
            {candidatos.map((e) => <option key={e.estudiante_id} value={e.estudiante_id}>{e.nombre_completo}</option>)}
          </select>
          <Link href={rutaGeneral} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900">← Revisión general</Link>
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {mensaje && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">{mensaje}</p>}
      {cargandoPantalla && <p role="status" className="rounded-xl border border-slate-200 bg-white p-10 text-slate-500 dark:border-slate-800 dark:bg-slate-900">Cargando las respuestas y puntajes…</p>}

      {!cargandoPantalla && detalle && parciales && (
        <>
          {confirmadas && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">✓ Esta evaluación ya fue confirmada por el docente. Las valoraciones son de solo lectura.</div>}
          {pendientes.length === 0 && detalle.estado_rendicion === 'corregida' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              <span><strong>✓ Resultado corregido.</strong> La nota final de {detalle.nombre_completo} es {detalle.nota_final ?? '—'} puntos.</span>
              <Link href={rutaGeneral} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">Ver resumen actualizado →</Link>
            </div>
          )}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
            <div className="min-w-0 space-y-5">
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">✓</span>
                    <h2 className="text-sm font-semibold">Corrección automática</h2>
                  </div>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{puntos(parciales.automatico)} pts</span>
                </div>
                {automaticas.length === 0 ? (
                  <p className="px-4 py-7 text-sm text-slate-500">No hay incisos calificados automáticamente en esta rendición.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 dark:bg-slate-950/40">
                        <tr><th className="px-4 py-2.5">Pregunta</th><th className="px-4 py-2.5">Respuesta estudiante</th><th className="px-4 py-2.5">Solución esperada</th><th className="px-4 py-2.5 text-right">Puntaje inciso</th><th className="px-4 py-2.5 text-right">Acción</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {automaticas.map((fila) => (
                          <tr key={clave(fila)}>
                            <td className="px-4 py-3"><span className="font-semibold">P{fila.pregunta.orden} · {fila.inciso.letra}</span><p className="text-[10px] text-slate-400">{fila.inciso.tipo_respuesta.replaceAll('_', ' ')}</p></td>
                            <td className="max-w-[180px] truncate px-4 py-3 text-emerald-700 dark:text-emerald-300" title={respuestaCorta(fila.inciso)}>{respuestaCorta(fila.inciso)}</td>
                            <td className="max-w-[200px] truncate px-4 py-3 text-slate-600 dark:text-slate-300" title={solucionCorta(fila.inciso)}>{solucionCorta(fila.inciso)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{fila.inciso.puntaje_obtenido ?? '—'} <span className="font-normal text-slate-400">/ {fila.inciso.puntaje_max}</span></td>
                            <td className="px-4 py-3 text-right"><button type="button" disabled={bloqueado} onClick={() => setEditandoAuto((v) => v === clave(fila) ? null : clave(fila))} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-40 dark:border-slate-700 dark:text-violet-300">{editandoAuto === clave(fila) ? 'Cerrar' : 'Ajustar'}</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {automaticas.filter((fila) => clave(fila) === editandoAuto).map((fila) => (
                <FormularioValoracion
                  key={`${clave(fila)}-${fila.inciso.puntaje_obtenido}-${fila.inciso.retroalimentacion}`}
                  numeroPregunta={fila.pregunta.orden}
                  preguntaId={fila.pregunta.pregunta_id}
                  enunciadoPregunta={fila.pregunta.enunciado}
                  inciso={fila.inciso} bloqueado={bloqueado} guardando={guardando === clave(fila)}
                  onGuardar={guardarValoracion}
                />
              ))}

              <section className="space-y-4" aria-label="Revisión manual de incisos">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h2 className="text-base font-bold">Revisión manual</h2><p className="text-xs text-slate-500 dark:text-slate-400">Valora los incisos pendientes y ajusta los que ya revisaste.</p></div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{pendientes.length} pendientes</span>
                </div>
                {manuales.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Todas las respuestas de esta rendición fueron calificadas automáticamente. Si necesitas ajustar alguna, utiliza el botón <strong>Ajustar</strong> en la tabla anterior.</div>
                ) : manuales.map((fila) => {
                  const identificador = clave(fila);
                  const propuestaIa = propuestasIa[identificador];
                  const permiteNuevaPropuesta =
                    !propuestaIa ||
                    !estadosConPropuestaReutilizable.has(propuestaIa.estado);
                  return (
                    <div key={identificador} className="space-y-3">
                      <FormularioValoracion
                        key={`${identificador}-${fila.inciso.puntaje_obtenido}-${fila.inciso.retroalimentacion}`}
                        id={`revision-${identificador}`} numeroPregunta={fila.pregunta.orden}
                        preguntaId={fila.pregunta.pregunta_id} enunciadoPregunta={fila.pregunta.enunciado}
                        inciso={fila.inciso} bloqueado={bloqueado} guardando={guardando === identificador}
                        onGuardar={guardarValoracion}
                        onSiguiente={pendientes.length > 1 && fila.inciso.pendiente_revision ? () => irAlSiguiente(fila) : undefined}
                      />
                      {fila.inciso.pendiente_revision && permiteNuevaPropuesta && (
                        <button
                          type="button"
                          disabled={bloqueado || solicitandoIa !== null}
                          onClick={() => void solicitarPropuesta(fila)}
                          className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200"
                        >
                          {solicitandoIa === identificador
                            ? 'Solicitando…'
                            : 'Sugerir con IA'}
                        </button>
                      )}
                      {propuestaIa && (
                        <PropuestaCorreccionIa
                          key={propuestaIa.propuesta_id}
                          propuesta={propuestaIa}
                          bloqueado={bloqueado}
                          onAceptada={aplicarAceptacion}
                        />
                      )}
                    </div>
                  );
                })}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-sm font-semibold">Eventos de seguridad</h2>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Los endpoints de la HU-31 todavía no proporcionan eventos de seguridad. No podemos afirmar que no hubo eventos sin consultar el registro correspondiente.</p>
              </section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={rutaGeneral} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700">← Revisión general</Link>
                {siguiente && <Link href={`${rutaGeneral}/${siguiente.estudiante_id}`} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Siguiente estudiante →</Link>}
              </div>
            </div>

            <aside className="space-y-3 lg:sticky lg:top-5" aria-label="Progreso de corrección">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Revisión necesaria</h2>
                <div className="mt-3 space-y-2">
                  {pendientes.length ? pendientes.map((fila) => (
                    <button key={clave(fila)} type="button" onClick={() => irA(fila)} className="flex w-full items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-left text-xs hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-950/60">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">{fila.pregunta.orden}</span>
                      <span className="min-w-0"><span className="block font-semibold text-violet-800 dark:text-violet-200">Preg. {fila.pregunta.orden}{fila.inciso.letra}</span><span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{fila.inciso.tipo_respuesta.replaceAll('_', ' ')} · {fila.inciso.puntaje_max} pts</span></span>
                    </button>
                  )) : <p className="text-xs text-emerald-700 dark:text-emerald-300">✓ No quedan incisos pendientes de revisión.</p>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Progreso</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Automático</span><strong className="text-blue-700 dark:text-blue-300">{puntos(parciales.automatico)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Manual / ajustado</span><strong>{puntos(parciales.manual)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Incisos corregidos</span><strong>{completadas} de {filas.length}</strong></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div style={{ width: `${progreso}%` }} className="h-full rounded-full bg-violet-600" /></div>
                  <div className="flex items-baseline justify-between border-t border-slate-100 pt-3 dark:border-slate-800"><span className="font-medium">{detalle.nota_final === null ? 'Puntaje provisional' : 'Nota final'}</span><strong className="text-lg text-violet-700 dark:text-violet-300">{puntos(detalle.nota_final === null ? parciales.total : Number(detalle.nota_final))}/{puntos(Number(resumen?.puntaje_total ?? parciales.maximo))}</strong></div>
                  {detalle.nota_final === null && <p className="text-[10px] leading-relaxed text-slate-400">El puntaje provisional solo considera incisos ya corregidos y su ponderación. No es una nota definitiva.</p>}
                  {!confirmadas && !publicados && <p className="text-[10px] text-slate-400">No se ha publicado ninguna nota mediante esta revisión.</p>}
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
