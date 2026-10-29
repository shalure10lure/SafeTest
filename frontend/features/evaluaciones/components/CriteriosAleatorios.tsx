import { Minus, Plus, X } from 'lucide-react';

import type { TemaBanco } from '../types';

export interface FilaCriterio {
    /** Identificador local de la fila (solo para React). */
    clave: number;
    tema_id: number | null;
    cantidad: number;
}

interface CriteriosAleatoriosProps {
    filas: FilaCriterio[];
    temas: TemaBanco[];
    materiaNombre: string;
    /** Preguntas de la materia en el banco. */
    totalMateria: number;
    cargando: boolean;
    error: string;
    onCambiarTema: (clave: number, temaId: number | null) => void;
    onCambiarCantidad: (clave: number, cantidad: number) => void;
    onAgregar: () => void;
    onQuitar: (clave: number) => void;
}

const COLUMNAS = 'grid grid-cols-[1.5rem_minmax(0,1fr)_7rem_1.5rem] items-center gap-3';

export default function CriteriosAleatorios({
    filas,
    temas,
    materiaNombre,
    totalMateria,
    cargando,
    error,
    onCambiarTema,
    onCambiarCantidad,
    onAgregar,
    onQuitar,
}: CriteriosAleatoriosProps) {
    const total = filas.reduce(
        (suma, fila) => suma + (fila.tema_id === null ? 0 : fila.cantidad),
        0,
    );

    const temasConPreguntas = temas.filter((tema) => tema.disponibles > 0);
    const puedeAgregar = filas.length < temasConPreguntas.length;

    return (
        <section
            aria-label="Criterios por tema"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                    Criterios por tema
                </h3>
                <p className="text-[11px] text-slate-400">
                    {totalMateria} {totalMateria === 1 ? 'pregunta' : 'preguntas'} de{' '}
                    {materiaNombre} en tu banco
                </p>
            </div>

            {cargando ? (
                <p className="mt-4 text-sm text-slate-500">Cargando temas...</p>
            ) : error ? (
                <p className="mt-4 text-sm text-red-600" role="alert">
                    {error}
                </p>
            ) : temasConPreguntas.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    Esta materia aún no tiene temas con preguntas en tu banco.
                </p>
            ) : (
                <>
                    <div className="mt-4 space-y-2">
                        <div className={COLUMNAS} aria-hidden="true">
                            <span />
                            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                Tema
                            </span>
                            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                Cantidad
                            </span>
                            <span />
                        </div>

                        {filas.map((fila, indice) => {
                            const tema = temas.find((item) => item.tema_id === fila.tema_id);
                            const maximo = tema ? tema.disponibles : 99;

                            return (
                                <div key={fila.clave} className={COLUMNAS}>
                                    <span className="flex size-6 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700 tabular-nums">
                                        {indice + 1}
                                    </span>

                                    <select
                                        value={fila.tema_id ?? ''}
                                        onChange={(e) =>
                                            onCambiarTema(fila.clave, Number(e.target.value) || null)
                                        }
                                        aria-label={`Tema del criterio ${indice + 1}`}
                                        className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600"
                                    >
                                        <option value="">Selecciona un tema</option>
                                        {temas.map((opcion) => {
                                            const usadoEnOtra = filas.some(
                                                (otra) =>
                                                    otra.clave !== fila.clave &&
                                                    otra.tema_id === opcion.tema_id,
                                            );

                                            return (
                                                <option
                                                    key={opcion.tema_id}
                                                    value={opcion.tema_id}
                                                    disabled={usadoEnOtra || opcion.disponibles === 0}
                                                >
                                                    {opcion.nombre_tema} ({opcion.disponibles}{' '}
                                                    {opcion.disponibles === 1
                                                        ? 'disponible'
                                                        : 'disponibles'}
                                                    )
                                                </option>
                                            );
                                        })}
                                    </select>

                                    <div
                                        role="group"
                                        aria-label={`Cantidad del criterio ${indice + 1}`}
                                        className="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-white"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onCambiarCantidad(fila.clave, fila.cantidad - 1)
                                            }
                                            disabled={fila.cantidad <= 1}
                                            aria-label="Disminuir cantidad"
                                            className="flex h-full w-8 items-center justify-center rounded-l-lg text-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Minus className="size-3.5" aria-hidden="true" />
                                        </button>

                                        <span
                                            className="text-sm text-slate-900 tabular-nums"
                                            aria-live="polite"
                                        >
                                            {fila.cantidad}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                onCambiarCantidad(fila.clave, fila.cantidad + 1)
                                            }
                                            disabled={fila.cantidad >= maximo}
                                            aria-label="Aumentar cantidad"
                                            className="flex h-full w-8 items-center justify-center rounded-r-lg text-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Plus className="size-3.5" aria-hidden="true" />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onQuitar(fila.clave)}
                                        disabled={filas.length === 1}
                                        aria-label={`Quitar el criterio ${indice + 1}`}
                                        className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                        <X className="size-4" aria-hidden="true" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={onAgregar}
                        disabled={!puedeAgregar}
                        className="mt-3 text-xs font-medium text-violet-700 hover:text-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        + Agregar otro tema
                    </button>

                    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
                        <p className="text-xs text-violet-800">
                            SafeTest seleccionará preguntas disponibles según estos
                            criterios.
                        </p>
                        <p
                            className="shrink-0 text-sm font-semibold text-violet-700 tabular-nums"
                            aria-live="polite"
                        >
                            {total} {total === 1 ? 'pregunta' : 'preguntas'}
                        </p>
                    </div>
                </>
            )}
        </section>
    );
}