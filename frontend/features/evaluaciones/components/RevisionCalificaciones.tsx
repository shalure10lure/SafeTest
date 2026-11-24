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
import Alerta from '@/components/ui/Alerta';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import BandejaCorreccionesIa from './BandejaCorreccionesIa';
import CorreoResultadosPanel from './CorreoResultadosPanel';

// Filtros disponibles en la tabla de estudiantes
type Filtro = 'todos' | 'pendientes' | 'listas';

// Convierte un string numérico en número (o null si no es válido)
const numero = (valor: string | null): number | null => {
  if (valor === null) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};
// Formatea puntos con hasta 2 decimales en formato boliviano
const puntos = (valor: number) => valor.toLocaleString('es-BO', { maximumFractionDigits: 2 });

// Devuelve el texto y estilo del badge de estado de cada estudiante
function estadoDe(e: EstudianteCalificacion) {
  if (e.estado === 'en_curso') return { texto: 'En curso', clase: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
  if (e.lista_para_publicar) return { texto: 'Lista para publicar', clase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' };
  return { texto: 'Revisión pendiente', clase: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' };
}

// Texto corto del estado general de la evaluación
function resumenEstado(datos: ResumenCalificaciones) {
  if (datos.resultados_publicados_en) return 'Resultados publicados';
  if (datos.calificaciones_revisadas_en) return 'Listo para publicar';
  return 'En revisión';
}

interface MensajeEstado {
  tono: 'info' | 'exito' | 'aviso';
  titulo: string;
  texto: string;
}

/**
 * UN solo mensaje que resume en qué punto está la revisión y cuál es el
 * siguiente paso (antes eran varios banners de colores distintos).
 * Es la mejora propia; reemplaza los banners sueltos que venían de main.
 */
function mensajeDeEstado(p: {
  confirmadas: boolean;
  publicados: boolean;
  totalRendiciones: number;
  pendientes: EstudianteCalificacion[];
  finalizado: boolean;
}): MensajeEstado {
  if (p.confirmadas) {
    return p.publicados
      ? {
          tono: 'exito',
          titulo: 'Revisión confirmada y resultados publicados',
          texto: 'Los estudiantes ya pueden consultar sus notas. Las calificaciones quedaron bloqueadas y no se pueden modificar.',
        }
      : {
          tono: 'exito',
          titulo: 'Revisión confirmada',
          texto: 'Las calificaciones quedaron bloqueadas, pero los estudiantes todavía no las ven. Pulsa «Publicar resultados» cuando quieras entregarlas.',
        };
  }
  if (p.totalRendiciones === 0) {
    return {
      tono: 'info',
      titulo: 'Aún no hay entregas',
      texto: 'Cuando los estudiantes envíen la evaluación, sus rendiciones aparecerán aquí para que las revises.',
    };
  }
  if (p.pendientes.length > 0) {
    const nombres = p.pendientes.slice(0, 4).map((e) => e.nombre_completo).join(', ');
    const resto = p.pendientes.length > 4 ? ` y ${p.pendientes.length - 4} más` : '';
    return {
      tono: 'aviso',
      titulo: `Faltan ${p.pendientes.length} ${p.pendientes.length === 1 ? 'estudiante' : 'estudiantes'} por revisar`,
      texto: `Completa la revisión de ${nombres}${resto} para poder confirmar las calificaciones.`,
    };
  }
  if (!p.finalizado) {
    return {
      tono: 'aviso',
      titulo: 'La evaluación todavía está abierta',
      texto: 'Todas las notas actuales están listas, pero podrás confirmar la revisión recién cuando termine el periodo de la evaluación.',
    };
  }
  return {
    tono: 'exito',
    titulo: 'Todo listo para confirmar',
    texto: 'Todas las rendiciones están corregidas. Pulsa «Confirmar revisión»: esto bloquea las notas, pero aún no las publica.',
  };
}

export default function RevisionCalificaciones({ examenId }: { examenId: number }) {
  const router = useRouter();
  const toast = useToast();
  // Estudiante al que se le está pidiendo revisión con IA (null si ninguno)
  const [revisandoEstudiante, setRevisandoEstudiante] = useState<number | null>(null);
  // Resumen de calificaciones devuelto por el backend
  const [datos, setDatos] = useState<ResumenCalificaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [confirmando, setConfirmando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [publicandoSoluciones, setPublicandoSoluciones] = useState(false);
  // Estados de los diálogos de confirmación (estaban sin declarar tras el merge)
  const [preguntarConfirmacion, setPreguntarConfirmacion] = useState(false);
  const [preguntarPublicacion, setPreguntarPublicacion] = useState(false);
  const [preguntarSoluciones, setPreguntarSoluciones] = useState(false);
  // Estados de la corrección asistida por IA
  const [solicitandoLote, setSolicitandoLote] = useState(false);
  const [seguimientoLote, setSeguimientoLote] = useState(false);
  const [resultadoLote, setResultadoLote] =
    useState<ResultadoLoteCorreccionIa | null>(null);

  // Vuelve a pedir el resumen al backend
  const cargar = useCallback(async () => {
    const respuesta = await calificacionesService.resumen(examenId);
    setDatos(respuesta);
    return respuesta;
  }, [examenId]);

  // Carga inicial (y cuando cambia el examen)
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

  // Valores derivados
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
  // Callback estable para que la bandeja avise que terminó el seguimiento
  const finalizarSeguimientoLote = useCallback(
    () => setSeguimientoLote(false),
    [],
  );

  // Estudiantes filtrados por búsqueda y por estado
  const visibles = useMemo(() => estudiantes.filter((e) => {
    if (!e.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) &&
      !String(e.estudiante_id).includes(busqueda)) return false;
    if (filtro === 'pendientes') return !e.lista_para_publicar;
    if (filtro === 'listas') return e.lista_para_publicar;
    return true;
  }), [estudiantes, busqueda, filtro]);

  // Confirma la revisión (bloquea las notas, no las publica)
  async function confirmar() {
    if (!puedeConfirmar || confirmando) return;
    setConfirmando(true);
    setError(null);
    try {
      await calificacionesService.confirmar(examenId);
      await cargar();
      // RESOLUCIÓN: se usa el toast propio (setNotificacion ya no existe)
      toast.exito(
        'Revisión confirmada',
        'Las calificaciones quedaron listas para publicar. Los estudiantes todavía no las ven.',
      );
    } catch (fallo: unknown) {
      setError(mensajeErrorCalificaciones(fallo));
    } finally {
      setConfirmando(false);
      setPreguntarConfirmacion(false);
    }
  }

  // Publica los resultados oficiales a los estudiantes
  async function publicar() {
    if (!puedePublicar || publicando) return;
    setPublicando(true);
    setError(null);
    try {
      const publicacion = await calificacionesService.publicarResultados(examenId);
      await cargar();
      if (publicacion.ya_publicados) {
        toast.info('Los resultados ya estaban publicados', 'No se hizo ningún cambio.');
      } else {
        toast.exito(
          'Resultados publicados',
          'Los estudiantes ya pueden consultar sus notas oficiales. Si activaste el envío por correo, revisa su estado en el panel de correo.',
        );
      }
    } catch (fallo: unknown) {
      setError(mensajeErrorCalificaciones(fallo));
    } finally {
      setPublicando(false);
      setPreguntarPublicacion(false);
    }
  }

  // Autoriza que los estudiantes vean las respuestas correctas
  async function publicarSoluciones() {
    if (!publicados || solucionesPublicadas || publicandoSoluciones) return;
    setPublicandoSoluciones(true);
    setError(null);
    try {
      const respuesta = await calificacionesService.publicarRespuestas(examenId);
      await cargar();
      if (respuesta.ya_publicadas) {
        toast.info('Las respuestas ya estaban publicadas', 'No se hizo ningún cambio.');
      } else {
        toast.exito(
          'Respuestas correctas publicadas',
          'Los estudiantes ya pueden ver las soluciones de esta evaluación.',
        );
      }
    } catch (fallo: unknown) {
      setError(mensajeErrorCalificaciones(fallo));
    } finally {
      setPublicandoSoluciones(false);
      setPreguntarSoluciones(false);
    }
  }

  // Pide a la IA propuestas para todos los incisos pendientes
  async function revisarTodoConIa() {
    if (confirmadas || publicados || solicitandoLote || seguimientoLote) return;
    setSolicitandoLote(true);
    setResultadoLote(null);
    setError(null);
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

  // Pide a la IA propuestas para un solo estudiante y abre su revisión
  async function revisarEstudianteConIa(estudianteId: number) {
    if (confirmadas || publicados || revisandoEstudiante !== null) return;
    setRevisandoEstudiante(estudianteId);
    setError(null);
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
      {/* Cabecera con ruta, título y botones de acción */}
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
          <Link
            href={`/docente/evaluaciones/${examenId}/seguridad`}
            className="inline-flex items-center rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
          >
            Ver seguridad y bloqueos
          </Link>
          {/* Los botones ahora ABREN el diálogo de confirmación (antes llamaban directo) */}
          <button
            type="button"
            onClick={() => setPreguntarConfirmacion(true)}
            disabled={!puedeConfirmar || confirmando}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            title="Bloquea las notas, pero todavía no las publica"
          >
            {confirmando ? 'Confirmando…' : confirmadas ? 'Revisión confirmada' : 'Confirmar revisión'}
          </button>
          <button
            type="button"
            onClick={() => setPreguntarPublicacion(true)}
            disabled={!puedePublicar || publicando}
            title={confirmadas ? 'Publicar las notas oficiales para los estudiantes' : 'Primero debes confirmar la revisión'}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publicando ? 'Publicando…' : publicados ? 'Resultados publicados' : 'Publicar resultados'}
          </button>
          <button
            type="button"
            onClick={() => setPreguntarSoluciones(true)}
            disabled={!publicados || solucionesPublicadas || publicandoSoluciones}
            title={!publicados ? 'Primero publica las calificaciones' : 'Autorizar respuestas correctas para los estudiantes'}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publicandoSoluciones ? 'Publicando…' : solucionesPublicadas ? 'Respuestas publicadas' : 'Publicar respuestas correctas'}
          </button>
        </div>
      </div>

      {/* Error general de la pantalla */}
      {error && (
        <Alerta tono="error" titulo="No se pudo completar la acción" onCerrar={() => setError(null)}>
          {error}
        </Alerta>
      )}

      {cargando ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Cargando las calificaciones de la evaluación…</div>
      ) : datos ? (
        <>
          {/* Tarjetas de resumen */}
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

          {/* RESOLUCIÓN: se usa el mensaje único (mejora propia) en vez de los banners de main */}
          {(() => {
            const estado = mensajeDeEstado({
              confirmadas,
              publicados,
              totalRendiciones: datos.total_rendiciones,
              pendientes,
              finalizado,
            });
            return <Alerta tono={estado.tono} titulo={estado.titulo}>{estado.texto}</Alerta>;
          })()}

          {/* Panel de correo institucional */}
          <CorreoResultadosPanel examenId={examenId} publicados={publicados} />

          {/* Corrección asistida por IA (solo mientras se puede editar) */}
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

          {/* Bandeja con las propuestas de la IA */}
          <BandejaCorreccionesIa
            examenId={examenId}
            seguimientoLote={seguimientoLote}
            onSeguimientoFinalizado={finalizarSeguimientoLote}
            soloLectura={confirmadas || publicados}
            onPropuestasAceptadas={() => void cargar()}
          />

          {/* Tabla de resultados por estudiante */}
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

          {/* RESOLUCIÓN: se conservan los diálogos de confirmación (mejora propia) */}
          <ConfirmDialog
            abierto={preguntarConfirmacion && puedeConfirmar}
            titulo="¿Confirmar todas las calificaciones?"
            textoConfirmar="Sí, confirmar revisión"
            procesando={confirmando}
            onCancelar={() => setPreguntarConfirmacion(false)}
            onConfirmar={() => void confirmar()}
          >
            <p>Las notas quedarán bloqueadas y ya no podrás ajustar puntajes.</p>
            <p><strong>Esto no publica los resultados:</strong> los estudiantes todavía no verán sus notas.</p>
          </ConfirmDialog>

          <ConfirmDialog
            abierto={preguntarPublicacion && puedePublicar}
            titulo="¿Publicar los resultados oficiales?"
            textoConfirmar="Sí, publicar resultados"
            procesando={publicando}
            onCancelar={() => setPreguntarPublicacion(false)}
            onConfirmar={() => void publicar()}
          >
            <p>Los estudiantes verán sus notas y la retroalimentación.</p>
            <p>Las respuestas correctas no se publican automáticamente: eso se autoriza aparte.</p>
          </ConfirmDialog>

          <ConfirmDialog
            abierto={preguntarSoluciones && publicados && !solucionesPublicadas}
            titulo="¿Publicar las respuestas correctas?"
            textoConfirmar="Sí, publicar respuestas"
            procesando={publicandoSoluciones}
            onCancelar={() => setPreguntarSoluciones(false)}
            onConfirmar={() => void publicarSoluciones()}
          >
            <p>Quienes rindieron la evaluación podrán ver las opciones correctas, las soluciones numéricas y las rúbricas disponibles.</p>
            <p>Esta autorización no se puede deshacer desde la plataforma.</p>
          </ConfirmDialog>

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
