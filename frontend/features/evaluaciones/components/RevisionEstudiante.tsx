'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
// RESOLUCIÓN: se quitó RespuestaValoracion porque ya no se usa (el guardado es por lote)
import type {
  DetalleCalificacion, IncisoCalificacion, PreguntaCalificacion,
  ResumenCalificaciones,
} from '../calificaciones.types';
import { calificacionesService, mensajeErrorCalificaciones } from '../services/calificaciones.service';
import type {
  AceptarCorreccionIaResponse,
  CorreccionIa,
} from '../correccion-ia.types';
import {
  correccionIaService,
  mensajeErrorCorreccionIa,
} from '../services/correccion-ia.service';
import FormularioValoracion from './FormularioValoracion';
// RESOLUCIÓN: se conservan los imports de AMBAS ramas
import PropuestaCorreccionIa from './PropuestaCorreccionIa'; // propio (IA)
import type { BorradorValoracion } from './FormularioValoracion'; // de main (lote)
import EventosSeguridadEstudiante from './EventosSeguridadEstudiante'; // de main (seguridad)

// Un inciso junto con su pregunta
type FilaInciso = { pregunta: PreguntaCalificacion; inciso: IncisoCalificacion };
type PropuestaIaVista = CorreccionIa;
// Clave única "preguntaId-letra" de cada inciso
const clave = (fila: FilaInciso) => `${fila.pregunta.pregunta_id}-${fila.inciso.letra}`;
// Redondea a 2 decimales
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
// Formatea puntos en formato boliviano
const puntos = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 2 });
// Estados de propuesta de IA que se pueden volver a mostrar al recargar
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

// Resumen corto de lo que respondió el estudiante
function respuestaCorta(i: IncisoCalificacion): string {
  const marcadas = i.opciones.filter((o) => o.seleccionada).map((o) => o.texto_opcion);
  if (marcadas.length) return marcadas.join(', ');
  if (i.respuesta_texto?.trim()) return i.respuesta_texto;
  if (i.procedimiento?.resultado_final) return i.procedimiento.resultado_final;
  return 'Sin respuesta';
}
// Resumen corto de la solución esperada
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
  // Identifica qué examen:estudiante ya se cargó (evita mostrar datos viejos al cambiar de estudiante)
  const [claveCargada, setClaveCargada] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  // RESOLUCIÓN: ahora es boolean (guardado por lote de main), ya no un identificador
  const [guardando, setGuardando] = useState(false);
  // Un solo estado mantiene los borradores aunque se abra/cierre Ajustar automático.
  const [borradores, setBorradores] = useState<Record<string, BorradorValoracion>>({});
  // Errores de validación por inciso
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
  // Inciso automático que se está ajustando
  const [editandoAuto, setEditandoAuto] = useState<string | null>(null);
  // Propuestas de la IA por inciso (mejora propia)
  const [propuestasIa, setPropuestasIa] = useState<
    Record<string, PropuestaIaVista>
  >({});

  const rutaGeneral = `/docente/evaluaciones/${examenId}/calificaciones`;
  // Recarga detalle y resumen desde el backend
  const cargar = useCallback(async () => {
    const [respuestas, lista] = await Promise.all([
      calificacionesService.detalle(examenId, estudianteId),
      calificacionesService.resumen(examenId),
    ]);
    setDetalle(respuestas);
    setResumen(lista);
  }, [examenId, estudianteId]);

  // Carga inicial: detalle + resumen + propuestas de IA existentes
  useEffect(() => {
    let activo = true;
    async function cargarInicial() {
      // De main: al cambiar de estudiante se descartan borradores y errores viejos
      setBorradores({});
      setErroresCampo({});
      setEditandoAuto(null);
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
        // Incisos que siguen pendientes de revisión
        const pendientesIniciales = respuestas.preguntas.flatMap((pregunta) =>
          pregunta.incisos
            .filter((inciso) => inciso.pendiente_revision)
            .map((inciso) => ({ pregunta, inciso })),
        );
        const clavesPendientes = new Set(pendientesIniciales.map(clave));
        try {
          // Recupera propuestas de IA ya generadas para este estudiante
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
          // Primero las más recientes (por intento y fecha)
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

  // Todos los incisos en una lista plana
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
  // true hasta que termine de cargar el estudiante actual
  const cargandoPantalla =
    cargando || claveCargada !== `${examenId}:${estudianteId}`;
  // `guardando` ahora es boolean
  const bloqueado = confirmadas || publicados || detalle?.estado_rendicion === 'en_curso' || guardando;
  const completadas = filas.length - pendientes.length;
  const progreso = filas.length > 0 ? Math.round(completadas * 100 / filas.length) : 0;

  // Propio: si la URL trae #revision-..., hace scroll hasta ese inciso al terminar de cargar
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

  // De main: el borrador conserva los cambios del docente hasta el guardado conjunto.
  function obtenerBorrador(fila: FilaInciso): BorradorValoracion {
    return borradores[clave(fila)] ?? {
      puntaje: fila.inciso.puntaje_obtenido ?? '',
      retroalimentacion: fila.inciso.retroalimentacion ?? '',
    };
  }

  // Guarda un cambio del formulario en el borrador y limpia su error
  function cambiarBorrador(fila: FilaInciso, borrador: BorradorValoracion) {
    const id = clave(fila);
    setBorradores((actuales) => ({ ...actuales, [id]: borrador }));
    setErroresCampo((actuales) => {
      if (!(id in actuales)) return actuales;
      const nuevos = { ...actuales };
      delete nuevos[id];
      return nuevos;
    });
    setMensaje(null);
  }

  // true si el borrador difiere de lo guardado
  function tieneCambios(fila: FilaInciso): boolean {
    const borrador = obtenerBorrador(fila);
    const original = fila.inciso;
    return borrador.puntaje !== (original.puntaje_obtenido ?? '') ||
      borrador.retroalimentacion.trim() !== (original.retroalimentacion ?? '').trim();
  }

  const cambiosPendientes = filas.filter((fila) => fila.inciso.pendiente_revision || tieneCambios(fila)).length;

  // Valida y guarda TODAS las revisiones en una sola operación
  async function guardarTodas() {
    if (!detalle || bloqueado) return;
    setError(null);
    setMensaje(null);

    const errores: Record<string, string> = {};
    const revisiones: Array<{ pregunta_id: number; letra: string; puntaje: number; retroalimentacion: string | null }> = [];
    for (const fila of filas) {
      // Solo se procesan incisos pendientes o con cambios
      if (!fila.inciso.pendiente_revision && !tieneCambios(fila)) continue;
      const borrador = obtenerBorrador(fila);
      const puntaje = Number(borrador.puntaje.replace(',', '.'));
      const maximo = Number(fila.inciso.puntaje_max);
      if (!borrador.puntaje.trim() || !Number.isFinite(puntaje) ||
          !Number.isFinite(maximo) || maximo <= 0 || puntaje < 0 ||
          puntaje > maximo || Math.abs(puntaje * 100 - Math.round(puntaje * 100)) > 1e-7) {
        errores[clave(fila)] = `Ingresa un puntaje de 0 a ${fila.inciso.puntaje_max} con máximo dos decimales.`;
        continue;
      }
      if (borrador.retroalimentacion.length > 2000) {
        errores[clave(fila)] = 'La retroalimentación no puede superar 2000 caracteres.';
        continue;
      }
      revisiones.push({
        pregunta_id: fila.pregunta.pregunta_id,
        letra: fila.inciso.letra,
        puntaje,
        retroalimentacion: borrador.retroalimentacion.trim() || null,
      });
    }

    setErroresCampo(errores);
    const primeraInvalida = filas.find((fila) => errores[clave(fila)] !== undefined);
    if (primeraInvalida) {
      // Para un ajuste automático que estaba contraído, abrir su formulario.
      if (automaticas.some((fila) => clave(fila) === clave(primeraInvalida))) {
        setEditandoAuto(clave(primeraInvalida));
      }
      setError(`Revisa ${Object.keys(errores).length} inciso(s) antes de guardar. No se modificó ninguna calificación.`);
      window.requestAnimationFrame(() => irA(primeraInvalida));
      return;
    }

    if (revisiones.length === 0) {
      // Comprueba el estado real del servidor en vez de fiarse solo de la pantalla.
      try {
        await cargar();
        setMensaje('No hay cambios pendientes. Las revisiones ya están guardadas.');
      } catch (fallo: unknown) {
        setError(mensajeErrorCalificaciones(fallo));
      }
      return;
    }

    setGuardando(true);
    try {
      const resultado = await calificacionesService.valorarEnLote(examenId, estudianteId, revisiones);
      // Solo se descartan los borradores después de confirmar que la API los guardó.
      setBorradores({});
      setErroresCampo({});
      // Propio: los incisos guardados manualmente ya no necesitan su propuesta de IA
      setPropuestasIa((actuales) => {
        const restantes = { ...actuales };
        for (const revision of revisiones) {
          delete restantes[`${revision.pregunta_id}-${revision.letra}`];
        }
        return restantes;
      });
      try {
        await cargar();
        setMensaje(resultado.pendientes_revision === 0
          ? `${resultado.guardadas} revisión(es) guardada(s). Todos los incisos están calificados.`
          : `${resultado.guardadas} revisión(es) guardada(s). Quedan ${resultado.pendientes_revision} inciso(s) pendientes.`);
      } catch (fallo: unknown) {
        setError(`El servidor guardó ${resultado.guardadas} revisión(es), pero no se pudo actualizar la pantalla: ${mensajeErrorCalificaciones(fallo)}. Recarga la página para comprobar el resultado.`);
      }
    } catch (fallo: unknown) {
      setError(`No se pudo confirmar el guardado: ${mensajeErrorCalificaciones(fallo)}. Si hubo un corte de conexión, consulta el estado antes de reintentar; la transacción evita guardados parciales.`);
    } finally {
      setGuardando(false);
    }
  }

  // Propio: aplica en pantalla el resultado de aceptar una propuesta de IA
  function aplicarAceptacion(
    propuesta: CorreccionIa,
    resultado: AceptarCorreccionIaResponse,
  ) {
    const calificacion = resultado.calificacion;
    const identificador = `${propuesta.pregunta_id}-${propuesta.letra}`;
    setError(null);
    setMensaje('Propuesta aceptada y calificación oficial actualizada.');
    // Integración: se descarta cualquier borrador de ese inciso para que no
    // tape el puntaje que acaba de aceptarse
    setBorradores((actuales) => {
      if (!(identificador in actuales)) return actuales;
      const restantes = { ...actuales };
      delete restantes[identificador];
      return restantes;
    });
    setErroresCampo((actuales) => {
      if (!(identificador in actuales)) return actuales;
      const restantes = { ...actuales };
      delete restantes[identificador];
      return restantes;
    });
    // Actualiza el detalle localmente con la calificación aceptada
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
    // Confirma con el servidor
    void cargar().catch((fallo: unknown) => {
      setError(mensajeErrorCalificaciones(fallo));
    });
  }

  // Hace scroll hasta un inciso
  function irA(fila: FilaInciso) {
    document.getElementById(`revision-${clave(fila)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  // Salta al siguiente inciso pendiente (o vuelve al resumen si no quedan)
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
              {/* Tabla de corrección automática */}
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

              {/* Formulario para ajustar un inciso automático */}
              {automaticas.filter((fila) => clave(fila) === editandoAuto).map((fila) => (
                <FormularioValoracion
                  key={`${clave(fila)}-${fila.inciso.puntaje_obtenido}-${fila.inciso.retroalimentacion}`}
                  id={`revision-${clave(fila)}`}
                  numeroPregunta={fila.pregunta.orden}
                  preguntaId={fila.pregunta.pregunta_id}
                  enunciadoPregunta={fila.pregunta.enunciado}
                  inciso={fila.inciso} bloqueado={bloqueado} guardando={guardando}
                  borrador={obtenerBorrador(fila)}
                  onCambiar={(valoracion) => cambiarBorrador(fila, valoracion)}
                  errorValidacion={erroresCampo[clave(fila)]}
                />
              ))}

              {/* Revisión manual: formulario + propuesta de IA de cada inciso */}
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
                  return (
                    <div key={identificador} className="space-y-3">
                      {/* RESOLUCIÓN: formulario con props de main (borrador/lote) */}
                      <FormularioValoracion
                        key={`${identificador}-${fila.inciso.puntaje_obtenido}-${fila.inciso.retroalimentacion}`}
                        id={`revision-${identificador}`} numeroPregunta={fila.pregunta.orden}
                        preguntaId={fila.pregunta.pregunta_id} enunciadoPregunta={fila.pregunta.enunciado}
                        inciso={fila.inciso} bloqueado={bloqueado} guardando={guardando}
                        borrador={obtenerBorrador(fila)}
                        onCambiar={(valoracion) => cambiarBorrador(fila, valoracion)}
                        errorValidacion={erroresCampo[identificador]}
                        onSiguiente={pendientes.length > 1 && fila.inciso.pendiente_revision ? () => irAlSiguiente(fila) : undefined}
                      />
                      {/* Propio: propuesta de la IA debajo del formulario */}
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

              {/* De main: eventos de seguridad del estudiante */}
              <EventosSeguridadEstudiante examenId={examenId} estudianteId={estudianteId} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={rutaGeneral} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700">← Revisión general</Link>
                {siguiente && <Link href={`${rutaGeneral}/${siguiente.estudiante_id}`} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Siguiente estudiante →</Link>}
              </div>
            </div>

            {/* Panel lateral: guardado por lote y progreso */}
            <aside className="space-y-3 lg:sticky lg:top-5" aria-label="Progreso de corrección">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
                <div>
                  <h2 className="text-sm font-bold text-violet-950 dark:text-violet-100">Guardar todas las revisiones</h2>
                  <p className="mt-1 text-xs text-violet-800 dark:text-violet-300">
                    {cambiosPendientes} inciso(s) por completar o actualizar. Se validarán antes de guardar todo en una sola operación.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void guardarTodas()}
                  disabled={bloqueado}
                  className="rounded-lg bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {guardando ? 'Guardando todas…' : 'Guardar todas las revisiones'}
                </button>
              </div>

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
