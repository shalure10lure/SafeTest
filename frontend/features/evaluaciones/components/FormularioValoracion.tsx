'use client';

import type { IncisoCalificacion } from '../calificaciones.types';

export interface BorradorValoracion {
  puntaje: string;
  retroalimentacion: string;
}

interface Props {
  id?: string;
  numeroPregunta: number;
  preguntaId: number;
  enunciadoPregunta: string;
  inciso: IncisoCalificacion;
  bloqueado: boolean;
  guardando: boolean;
  borrador: BorradorValoracion;
  onCambiar: (valoracion: BorradorValoracion) => void;
  errorValidacion?: string;
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
  borrador, onCambiar, errorValidacion, onSiguiente,
}: Props) {
  const { puntaje, retroalimentacion } = borrador;

  const sinTexto = !(inciso.respuesta_texto ?? '').trim();
  const opcionesElegidas = inciso.opciones.filter((o) => o.seleccionada);
  const contieneReferencia = inciso.solucion_referencia != null || inciso.solucion_numerica != null ||
    inciso.opciones.some((o) => o.correcta);

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

        <div className="grid gap-4 sm:grid-cols-[minmax(130px,145px)_1fr]">
          <div>
            <label htmlFor={`nota-${preguntaId}-${inciso.letra}`} className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Puntaje asignado</label>
            <div className="flex items-center gap-1.5">
              <input
                id={`nota-${preguntaId}-${inciso.letra}`} type="number" inputMode="decimal"
                step="0.01" min="0" max={inciso.puntaje_max} value={puntaje}
                onChange={(e) => onCambiar({ ...borrador, puntaje: e.target.value })}
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
              onChange={(e) => onCambiar({ ...borrador, retroalimentacion: e.target.value })}
              placeholder="Observaciones sobre la respuesta…"
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
            />
          </div>
          {onSiguiente && (
            <div className="flex justify-end border-t border-slate-100 pt-3 sm:col-span-2 dark:border-slate-800">
              <button type="button" onClick={onSiguiente} disabled={bloqueado || guardando} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200">
                Ir al siguiente inciso →
              </button>
            </div>
          )}
          {errorValidacion && <p role="alert" className="text-xs text-red-700 dark:text-red-300 sm:col-span-2">{errorValidacion}</p>}
          {bloqueado && <p className="text-xs text-slate-500 sm:col-span-2">La calificación no se puede editar: la rendición está en curso o la revisión ya fue confirmada/publicada.</p>}
        </div>
      </div>
    </article>
  );
}
