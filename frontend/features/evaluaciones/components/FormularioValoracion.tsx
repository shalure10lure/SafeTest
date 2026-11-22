'use client';

import { useState, type FormEvent } from 'react';
import type { IncisoCalificacion, RespuestaValoracion } from '../calificaciones.types';

interface Props {
  id?: string;
  numeroPregunta: number;
  preguntaId: number;
  enunciadoPregunta: string;
  inciso: IncisoCalificacion;
  bloqueado: boolean;
  guardando: boolean;
  onGuardar: (preguntaId: number, letra: string, datos: RespuestaValoracion) => Promise<void>;
  onSiguiente?: () => void;
}

const etiquetas: Record<string, string> = {
  automatica: 'Automática',
  pendiente: 'Revisión necesaria',
  manual: 'Revisada manualmente',
  revisada: 'Puntaje ajustado',
};

export default function FormularioValoracion({
  id, numeroPregunta, preguntaId, enunciadoPregunta, inciso, bloqueado, guardando,
  onGuardar, onSiguiente,
}: Props) {
  const [puntaje, setPuntaje] = useState(inciso.puntaje_obtenido ?? '');
  const [retroalimentacion, setRetroalimentacion] = useState(inciso.retroalimentacion ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const max = Number(inciso.puntaje_max);
  const valor = Number(puntaje.replace(',', '.'));
  const valido = puntaje.trim().length > 0 && Number.isFinite(valor) &&
    valor >= 0 && valor <= max && Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-7;
  const cambiado = puntaje !== (inciso.puntaje_obtenido ?? '') ||
    retroalimentacion !== (inciso.retroalimentacion ?? '');
  const sinTexto = !(inciso.respuesta_texto ?? '').trim();
  const opcionesElegidas = inciso.opciones.filter((o) => o.seleccionada);
  const contieneReferencia = inciso.solucion_referencia != null || inciso.solucion_numerica != null ||
    inciso.opciones.some((o) => o.correcta);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setGuardado(false);
    if (!valido) {
      setError(`El puntaje debe estar entre 0 y ${inciso.puntaje_max}, con máximo dos decimales.`);
      return;
    }
    try {
      await onGuardar(preguntaId, inciso.letra, {
        puntaje: valor,
        retroalimentacion: retroalimentacion.trim() || null,
      });
      setGuardado(true);
    } catch (fallo: unknown) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar el puntaje.');
    }
  }

  return (
    <article id={id} className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-violet-700 dark:text-violet-300">Pregunta {numeroPregunta} · inciso {inciso.letra}</span>
          <span className="text-xs text-slate-400">{inciso.tipo_respuesta.replaceAll('_', ' ')}</span>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${inciso.pendiente_revision ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'}`}>
          {etiquetas[inciso.estado_correccion] ?? inciso.estado_correccion}
        </span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Pregunta</p>
          <p className="whitespace-pre-wrap text-sm font-semibold">{enunciadoPregunta}</p>
          {inciso.enunciado_inciso && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{inciso.enunciado_inciso}</p>}
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Respuesta del estudiante</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
            {!sinTexto && <p className="whitespace-pre-wrap break-words">{inciso.respuesta_texto}</p>}
            {opcionesElegidas.length > 0 ? (
              <div className={`${!sinTexto ? 'mt-2 ' : ''}space-y-1`}>
                {opcionesElegidas.map((o) => <p key={o.nro_opcion} className="text-violet-700 dark:text-violet-300">{o.nro_opcion}. {o.texto_opcion}</p>)}
              </div>
            ) : sinTexto && !inciso.procedimiento ? <span className="italic text-slate-400">El estudiante no registró una respuesta en este inciso.</span> : null}
            {inciso.procedimiento && (
              <div className="mt-2 space-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500">Procedimiento / modelo</p>
                <p>Modelo: {inciso.procedimiento.modelo_id ?? 'Sin modelo'}</p>
                {inciso.procedimiento.resultado_final && <p>Resultado: {inciso.procedimiento.resultado_final}</p>}
                {inciso.procedimiento.formula_ids.length > 0 && <p>Fórmulas seleccionadas: {inciso.procedimiento.formula_ids.join(', ')}</p>}
                {inciso.procedimiento.valores !== null && (
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-white p-2 text-xs dark:bg-slate-900">{JSON.stringify(inciso.procedimiento.valores, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
        </div>

        {contieneReferencia && (
          <details className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600 hover:text-violet-700 dark:text-slate-300">Ver solución esperada / rúbrica</summary>
            <div className="space-y-2 border-t border-slate-100 px-3 py-3 text-sm dark:border-slate-800">
              {inciso.solucion_numerica !== null && <p>Valor correcto: <strong>{inciso.solucion_numerica}</strong></p>}
              {inciso.solucion_referencia && <p className="whitespace-pre-wrap">{inciso.solucion_referencia}</p>}
              {inciso.opciones.filter((o) => o.correcta).map((o) => <p key={o.nro_opcion} className="text-emerald-700 dark:text-emerald-300">✓ {o.nro_opcion}. {o.texto_opcion}</p>)}
            </div>
          </details>
        )}

        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-[minmax(130px,145px)_1fr]">
          <div>
            <label htmlFor={`nota-${preguntaId}-${inciso.letra}`} className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Puntaje asignado</label>
            <div className="flex items-center gap-1.5">
              <input
                id={`nota-${preguntaId}-${inciso.letra}`} type="number" inputMode="decimal"
                step="0.01" min="0" max={inciso.puntaje_max} value={puntaje}
                onChange={(e) => { setPuntaje(e.target.value); setGuardado(false); }}
                disabled={bloqueado || guardando}
                placeholder="—"
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
              />
              <span className="whitespace-nowrap text-sm text-slate-400">/ {inciso.puntaje_max}</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Máximo {inciso.puntaje_max}</p>
          </div>
          <div>
            <label htmlFor={`comentario-${preguntaId}-${inciso.letra}`} className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Retroalimentación</label>
            <textarea
              id={`comentario-${preguntaId}-${inciso.letra}`} rows={3} maxLength={2000}
              disabled={bloqueado || guardando} value={retroalimentacion}
              onChange={(e) => { setRetroalimentacion(e.target.value); setGuardado(false); }}
              placeholder="Observaciones sobre la respuesta…"
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={bloqueado || guardando || !valido || !cambiado} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {guardando ? 'Guardando…' : 'Guardar revisión'}
              </button>
              {onSiguiente && <button type="button" onClick={onSiguiente} className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700">Siguiente pendiente →</button>}
            </div>
          </div>
          {error && <p role="alert" className="text-xs text-red-700 dark:text-red-300 sm:col-span-2">{error}</p>}
          {guardado && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300 sm:col-span-2">Revisión guardada. Se actualizó la calificación en el backend.</p>}
          {bloqueado && <p className="text-xs text-slate-500 sm:col-span-2">La calificación no se puede editar: la rendición está en curso o la revisión ya fue confirmada/publicada.</p>}
        </form>
      </div>
    </article>
  );
}
