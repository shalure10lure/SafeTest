'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EstudianteCalificacion, ResumenCalificaciones } from '../calificaciones.types';
import { calificacionesService, mensajeErrorCalificaciones } from '../services/calificaciones.service';
import type { ResultadoLoteCorreccionIa } from '../correccion-ia.types';
import {
  correccionIaService,
  mensajeErrorCorreccionIa,
} from '../services/correccion-ia.service';
import BandejaCorreccionesIa from './BandejaCorreccionesIa';
import CorreoResultadosPanel from './CorreoResultadosPanel';

type Filtro = 'todos' | 'pendientes' | 'listas';

const numero = (valor: string | null): number | null => {
  if (valor === null) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};
const puntos = (valor: number) => valor.toLocaleString('es-BO', { maximumFractionDigits: 2 });

function estadoDe(e: EstudianteCalificacion) {
  if (e.estado === 'en_curso') return { texto: 'En curso', clase: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
  if (e.lista_para_publicar) return { texto: 'Lista para publicar', clase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' };
  return { texto: 'Revisión pendiente', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' };
}

function resumenEstado(datos: ResumenCalificaciones) {
  if (datos.resultados_publicados_en) return 'Resultados publicados';
  if (datos.calificaciones_revisadas_en) return 'Listo para publicar';
  return 'En revisión';
}

export default function RevisionCalificaciones({ examenId }: { examenId: number }) {
  const router = useRouter();
  const [revisandoEstudiante, setRevisandoEstudiante] = useState<number | null>(null);
  const [datos, setDatos] = useState<ResumenCalificaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [preguntarConfirmacion, setPreguntarConfirmacion] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [preguntarPublicacion, setPreguntarPublicacion] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [preguntarSoluciones, setPreguntarSoluciones] = useState(false);
  const [publicandoSoluciones, setPublicandoSoluciones] = useState(false);
  const [solicitandoLote, setSolicitandoLote] = useState(false);
  const [seguimientoLote, setSeguimientoLote] = useState(false);
  const [resultadoLote, setResultadoLote] =
    useState<ResultadoLoteCorreccionIa | null>(null);

  const cargar = useCallback(async () => {
    const respuesta = await calificacionesService.resumen(examenId);
    setDatos(respuesta);
    return respuesta;
  }, [examenId]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    setDatos(null);
    calificacionesService.resumen(examenId)
      .then((respuesta) => { if (activo) setDatos(respuesta); })
      .catch((fallo: unknown) => { if (activo) setError(mensajeErrorCalificaciones(fallo)); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [examenId]);

  const estudiantes = datos?.estudiantes ?? [];
  const pendientes = estudiantes.filter((e) => !e.lista_para_publicar);
  const notas = estudiantes
    .filter((e) => e.lista_para_publicar)
    .map((e) => numero(e.nota_final))
    .filter((n): n is number => n !== null);
  const promedio = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  const total = numero(datos?.puntaje_total ?? null);
  const fechaFin = datos?.disponible_hasta ? new Date(datos.disponible_hasta).getTime() : NaN;
  const finalizado = Number.isFinite(fechaFin) && fechaFin <= Date.now();
  const confirmadas = !!datos?.calificaciones_revisadas_en;
  const publicados = !!datos?.resultados_publicados_en;
  const solucionesPublicadas = !!datos?.respuestas_publicadas_en;
  const puedeConfirmar = !!datos && !confirmadas && !publicados && finalizado &&
    datos.total_rendiciones > 0 && datos.total_pendientes === 0;
  const puedePublicar = !!datos && confirmadas && !publicados && finalizado &&
    datos.total_rendiciones > 0 && datos.total_pendientes === 0;
  const finalizarSeguimientoLote = useCallback(
    () => setSeguimientoLote(false),
    [],
  );

  const visibles = useMemo(() => estudiantes.filter((e) => {
    if (!e.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) &&
        !String(e.estudiante_id).includes(busqueda)) return false;
    if (filtro === 'pendientes') return !e.lista_para_publicar;
    if (filtro === 'listas') return e.lista_para_publicar;
    return true;
  }), [estudiantes, busqueda, filtro]);

  async function confirmar() {
    if (!puedeConfirmar) return;
    setConfirmando(true);
    setError(null);
    setNotificacion(null);
    try {
      await calificacionesService.confirmar(examenId);
      await cargar();
      setNotificacion('Las calificaciones están listas para publicar. No se han publicado todavía.');
      setPreguntarConfirmacion(false);
    } catch (fallo: unknown) {
      setError(mensajeErrorCalificaciones(fallo));
    } finally {
      setConfirmando(false);
    }
  }

  async function publicar() {
    if (!puedePublicar) return;
    setPublicando(true);
    setError(null);
    setNotificacion(null);
    try {
      const publicacion = await calificacionesService.publicarResultados(examenId);
      await cargar();
      setNotificacion(publicacion.ya_publicados
        ? 'Los resultados ya estaban publicados.'
        : 'Resultados publicados. Ahora los estudiantes pueden consultar sus notas oficiales. Revisa el estado de envío de correos debajo.');
      setPreguntarPublicacion(false);
    } catch (fallo: unknown) {
      setError(mensajeErrorCalificaciones(fallo));
    } finally {
      setPublicando(false);
    }
  }

  async function publicarSoluciones() {
    if (!publicados || solucionesPublicadas) return;
    setPublicandoSoluciones(true);
    setError(null);
    setNotificacion(null);
    try {
      const respuesta = await calificacionesService.publicarRespuestas(examenId);
      await cargar();
      setPreguntarSoluciones(false);
      setNotificacion(respuesta.ya_publicadas
        ? 'Las soluciones correctas ya estaban autorizadas.'
        : 'Respuestas correctas publicadas. Ahora los estudiantes pueden ver las soluciones.');
    } catch (fallo: unknown) {
      setError(mensajeErrorCalificaciones(fallo));
    } finally {
      setPublicandoSoluciones(false);
    }
  }

  async function revisarTodoConIa() {
    if (confirmadas || publicados || solicitandoLote || seguimientoLote) return;
    setSolicitandoLote(true);
    setResultadoLote(null);
    setError(null);
    setNotificacion(null);
    try {
      const resultado = await correccionIaService.revisarTodo(examenId);
      setResultadoLote(resultado);
      setSeguimientoLote(resultado.solicitadas > 0);
    } catch (fallo: unknown) {
      setError(mensajeErrorCorreccionIa(fallo));
    } finally {
      setSolicitandoLote(false);
    }
  }

  async function revisarEstudianteConIa(estudianteId: number) {
    if (confirmadas || publicados || revisandoEstudiante !== null) return;
    setRevisandoEstudiante(estudianteId);
    setError(null);
    setNotificacion(null);
    try {
      const resultado = await correccionIaService.revisarEstudiante(examenId, estudianteId);
      // Si no se pudo solicitar nada por un motivo distinto a «ya hay propuesta
      // activa», se informa aquí en lugar de abrir una pantalla sin propuestas.
      const soloActivas = resultado.detalle_omitidas.every((o) => /propuesta activa/i.test(o.motivo));
      if (resultado.solicitadas === 0 && resultado.omitidas > 0 && !soloActivas) {
        const motivos = [...new Set(resultado.detalle_omitidas.map((o) => o.motivo))].slice(0, 3).join(' ');
        setError(`La IA no pudo revisar a este estudiante. ${motivos}`);
        return;
      }
      router.push(`/docente/evaluaciones/${examenId}/calificaciones/${estudianteId}`);
    } catch (fallo: unknown) {
      setError(mensajeErrorCorreccionIa(fallo));
    } finally {
      setRevisandoEstudiante(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 text-slate-900 md:px-6 dark:text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <Link href="/docente/evaluaciones" className="hover:text-violet-600">Mis evaluaciones</Link>
            <span aria-hidden="true">›</span>
            <span>Resultados</span>
          </nav>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Revisión general de resultados</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{datos?.titulo ?? `Evaluación #${examenId}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/docente/evaluaciones" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">← Mis evaluaciones</Link>
          <button
            type="button"
            onClick={() => setPreguntarConfirmacion(true)}
            disabled={!puedeConfirmar || confirmando}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            title="Confirmar las notas, sin publicarlas"
          >
            {confirmadas ? 'Revisión confirmada' : 'Confirmar revisión'}
          </button>
          <button
            type="button"
            onClick={() => setPreguntarPublicacion(true)}
            disabled={!puedePublicar || publicando}
            title={confirmadas ? 'Publicar notas oficiales para estudiantes' : 'Primero confirma la revisión HU-31'}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publicados ? 'Resultados publicados' : 'Publicar resultados'}
          </button>
          <button
            type="button"
            onClick={() => setPreguntarSoluciones(true)}
            disabled={!publicados || solucionesPublicadas || publicandoSoluciones}
            title={!publicados ? 'Primero publica las calificaciones' : 'Autorizar respuestas correctas para los estudiantes'}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {solucionesPublicadas ? 'Respuestas publicadas' : 'Publicar respuestas correctas'}
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</div>}
      {notificacion && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notificacion}</div>}

      {cargando ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Cargando las calificaciones de la evaluación…</div>
      ) : datos ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Estado de calificaciones</p>
              <p className={`mt-2 text-lg font-bold ${confirmadas ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-300'}`}>{resumenEstado(datos)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Promedio de notas completas</p>
              <p className="mt-2 text-xl font-bold">{promedio === null ? '—' : puntos(promedio)}<span className="text-base font-normal text-slate-400">/{total === null ? '—' : puntos(total)}</span></p>
              <p className="mt-1 text-[11px] text-slate-400">{notas.length} de {estudiantes.length} rendiciones calificadas</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pendientes de revisión</p>
              <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-300">{datos.total_pendientes}</p>
              <p className="mt-1 text-[11px] text-slate-400">Rendiciones todavía no listas</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Listas para publicar</p>
              <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">{datos.total_listas}</p>
              <p className="mt-1 text-[11px] text-slate-400">De {datos.total_rendiciones} rendiciones</p>
            </div>
          </div>

          {confirmadas ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              ✓ Revisión confirmada. Las notas ya no pueden modificarse desde esta HU. {publicados ? 'Los resultados también están publicados.' : 'Todavía no se han publicado los resultados.'}
            </div>
          ) : datos.total_rendiciones === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900">Todavía no se registraron rendiciones de estudiantes para esta evaluación.</div>
          ) : pendientes.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Debes completar la revisión de {pendientes.length} {pendientes.length === 1 ? 'estudiante' : 'estudiantes'} antes de confirmar: {' '}
              {pendientes.slice(0, 4).map((e) => e.nombre_completo).join(', ')}{pendientes.length > 4 ? ` y ${pendientes.length - 4} más` : ''}.
            </div>
          ) : !finalizado ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Todas las notas están listas, pero el periodo de la evaluación todavía no terminó.</div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">Todas las rendiciones están corregidas. Ya puedes confirmar la revisión.</div>
          )}

          <CorreoResultadosPanel examenId={examenId} publicados={publicados} />

          {!confirmadas && !publicados && (
            <section
              aria-label="Revisión de propuestas con IA"
              className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/20"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Corrección asistida por IA</h2>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Las propuestas son provisionales y no cambian las calificaciones oficiales.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revisarTodoConIa()}
                  disabled={solicitandoLote || seguimientoLote}
                  className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {solicitandoLote
                    ? 'Solicitando…'
                    : seguimientoLote
                      ? 'Procesando propuestas…'
                      : 'Revisar todo con IA'}
                </button>
              </div>
              {resultadoLote && (
                <div
                  role="status"
                  aria-label="Resumen de solicitudes de corrección IA"
                  className="space-y-2 rounded-lg bg-white p-3 text-sm dark:bg-slate-900"
                >
                  <p>
                    Solicitadas: <strong>{resultadoLote.solicitadas}</strong>
                    {' · '}Omitidas: <strong>{resultadoLote.omitidas}</strong>
                  </p>
                  {resultadoLote.detalle_omitidas.length > 0 && (
                    <ul aria-label="Motivos de omisión" className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {resultadoLote.detalle_omitidas.map((omision, indice) => (
                        <li key={`${omision.estudiante_id}-${omision.pregunta_id}-${omision.letra}-${indice}`}>
                          Estudiante #{omision.estudiante_id}, pregunta #{omision.pregunta_id}, inciso {omision.letra}: {omision.motivo}
                        </li>
                      ))}
                    </ul>
                  )}
                  {seguimientoLote && (
                    <p className="text-xs text-violet-800 dark:text-violet-200">
                      El avance se actualiza automáticamente en la bandeja.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          <BandejaCorreccionesIa
            examenId={examenId}
            seguimientoLote={seguimientoLote}
            onSeguimientoFinalizado={finalizarSeguimientoLote}
            soloLectura={confirmadas || publicados}
            onPropuestasAceptadas={() => void cargar()}
          />

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" aria-label="Resultados de los estudiantes">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold">Resultados por estudiante</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Abre una rendición para revisar respuestas y ajustar puntajes.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar estudiante…" aria-label="Buscar estudiante" className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900" />
                <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label="Filtrar estado" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <option value="todos">Todas</option>
                  <option value="pendientes">Pendientes</option>
                  <option value="listas">Listas</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400 dark:bg-slate-950/40">
                  <tr><th className="px-4 py-3 font-semibold">Estudiante</th><th className="px-4 py-3 font-semibold">Entrega</th><th className="px-4 py-3 font-semibold">Nota final</th><th className="px-4 py-3 font-semibold">Pendientes</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 text-right font-semibold">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibles.map((estudiante) => {
                    const badge = estadoDe(estudiante);
                    const fecha = estudiante.fecha_envio ? new Date(estudiante.fecha_envio) : null;
                    return (
                      <tr key={estudiante.estudiante_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3"><p className="font-semibold">{estudiante.nombre_completo}</p><p className="text-xs text-slate-400">ID #{estudiante.estudiante_id}</p></td>
                        <td className="px-4 py-3 text-slate-500">{fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleDateString('es-BO') : '—'}</td>
                        <td className="px-4 py-3"><span className="font-semibold">{estudiante.nota_final === null ? '—' : puntos(Number(estudiante.nota_final))}</span><span className="text-xs text-slate-400">/{total === null ? '—' : puntos(total)}</span>{estudiante.nota_final === null && <p className="text-[11px] text-slate-400">Sin nota definitiva</p>}</td>
                        <td className="px-4 py-3">{estudiante.pendientes_revision > 0 ? <span className="font-semibold text-amber-600">{estudiante.pendientes_revision}</span> : '0'}</td>
                        <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.clase}`}>{badge.texto}</span></td>
                        <td className="px-4 py-3 text-right"><div className="flex flex-wrap justify-end gap-2"><Link href={`/docente/evaluaciones/${examenId}/calificaciones/${estudiante.estudiante_id}`} className="inline-flex whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">Revisar resultado →</Link>{estudiante.estado !== 'en_curso' && estudiante.pendientes_revision > 0 && !confirmadas && !publicados && (<button type="button" onClick={() => void revisarEstudianteConIa(estudiante.estudiante_id)} disabled={revisandoEstudiante !== null} title="Pide propuestas de corrección a la IA; tú decides si las aceptas" className="inline-flex whitespace-nowrap rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">{revisandoEstudiante === estudiante.estudiante_id ? 'Solicitando…' : '✦ Revisar con IA'}</button>)}</div></td>
                      </tr>
                    );
                  })}
                  {!visibles.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">No hay estudiantes que coincidan con los filtros.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-4 py-3 text-right text-xs text-slate-400 dark:border-slate-800">{visibles.length} de {estudiantes.length} rendiciones</div>
          </section>

          {preguntarConfirmacion && puedeConfirmar && (
            <section role="group" aria-label="Confirmar revisión" className="rounded-xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30">
              <h2 className="font-semibold text-violet-950 dark:text-violet-100">¿Confirmar todas las calificaciones?</h2>
              <p className="mt-2 text-sm text-violet-900/80 dark:text-violet-200">Esta acción bloqueará los ajustes de puntajes. <strong>No publicará los resultados</strong> a los estudiantes.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={confirmando} onClick={() => void confirmar()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{confirmando ? 'Confirmando…' : 'Sí, confirmar revisión'}</button>
                <button type="button" disabled={confirmando} onClick={() => setPreguntarConfirmacion(false)} className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-200">Cancelar</button>
              </div>
            </section>
          )}
          {preguntarPublicacion && puedePublicar && (
            <section role="group" aria-label="Publicación de resultados" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="font-semibold text-emerald-950">¿Publicar resultados oficiales?</h2>
              <p className="mt-2 text-sm text-emerald-900">
                Las notas y la retroalimentación serán visibles para los estudiantes.
                Las soluciones correctas no se liberarán automáticamente.
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => void publicar()} disabled={publicando} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {publicando ? 'Publicando…' : 'Sí, publicar resultados'}
                </button>
                <button type="button" disabled={publicando} onClick={() => setPreguntarPublicacion(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">Cancelar</button>
              </div>
            </section>
          )}
          {preguntarSoluciones && publicados && !solucionesPublicadas && (
            <section role="group" aria-label="Publicación de respuestas correctas" className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h2 className="font-semibold text-blue-950">¿Publicar las respuestas correctas?</h2>
              <p className="mt-2 text-sm text-blue-900">
                Los estudiantes que rindieron la evaluación podrán consultar las opciones correctas,
                soluciones numéricas y rúbricas disponibles. Esta autorización no se puede deshacer desde la interfaz.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void publicarSoluciones()} disabled={publicandoSoluciones} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {publicandoSoluciones ? 'Publicando…' : 'Sí, publicar respuestas'}
                </button>
                <button type="button" onClick={() => setPreguntarSoluciones(false)} disabled={publicandoSoluciones} className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm">Cancelar</button>
              </div>
            </section>
          )}
          {publicados && datos.resultados_publicados_en && (
            <p className="text-sm text-emerald-700">
              Publicados el {new Date(datos.resultados_publicados_en).toLocaleString('es-BO')}.
            </p>
          )}
          <p className="text-xs text-slate-400">
            {solucionesPublicadas
              ? 'Las calificaciones y las respuestas correctas ya están publicadas.'
              : 'Las calificaciones se publican antes que las respuestas correctas. Las soluciones requieren autorización adicional.'}
          </p>
        </>
      ) : !error ? <p className="text-sm text-slate-500">No fue posible cargar la evaluación.</p> : null}
    </main>
  );
}


