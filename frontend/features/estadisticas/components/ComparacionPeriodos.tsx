
'use client';

import { useState } from 'react';

import type { Periodo } from '@/features/periodos/types';
import type {
    ComparacionPeriodos as ComparacionPeriodosType,
} from '../types';

interface ComparacionPeriodosProps {
    materiaId: number | null;
    periodos: Periodo[];
    comparacion: ComparacionPeriodosType | null;
    isLoading: boolean;
    error: string | null;
    onComparar: (materiaId: number, periodoIds: number[]) => void;
    onLimpiar: () => void;
}

export function ComparacionPeriodos({
    materiaId,
    periodos,
    comparacion,
    isLoading,
    error,
    onComparar,
    onLimpiar,
}: ComparacionPeriodosProps) {
    const [periodosSeleccionados, setPeriodosSeleccionados] = useState<number[]>([]);

    function cambiarSeleccion(periodoId: number) {
        setPeriodosSeleccionados((actuales) => {
            if (actuales.includes(periodoId)) {
                return actuales.filter((id) => id !== periodoId);
            }

            if (actuales.length >= 6) {
                return actuales;
            }

            return [...actuales, periodoId];
        });
    }

    function comparar() {
        if (materiaId === null || periodosSeleccionados.length < 2) {
            return;
        }

        onComparar(materiaId, periodosSeleccionados);
    }
    function limpiar() {
        setPeriodosSeleccionados([]);
        onLimpiar();
    }

    function formatoNota(valor: number | null) {
        return valor === null ? 'Sin datos' : valor.toFixed(2);
    }

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-lg font-semibold text-slate-900">
                    Comparación entre periodos
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Compara el rendimiento de una misma materia en distintos
                    periodos académicos.
                </p>
            </header>

            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-900">
                            Seleccionar periodos
                        </h3>
                        <p className="text-sm text-slate-500">
                            Selecciona entre 2 y 6 periodos.
                        </p>
                    </div>

                    <span className="text-sm text-slate-500">
                        {periodosSeleccionados.length} de 6 seleccionados
                    </span>
                </div>

                {periodos.length === 0 ? (
                    <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                        No hay periodos activos asociados a esta materia.
                    </p>
                ) : (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {periodos.map((periodo) => {
                            const seleccionado = periodosSeleccionados.includes(
                                periodo.semestre_id,
                            );

                            return (
                                <label
                                    key={periodo.semestre_id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                                        seleccionado
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={seleccionado}
                                        onChange={() =>
                                            cambiarSeleccion(periodo.semestre_id)
                                        }
                                        disabled={
                                            !seleccionado &&
                                            periodosSeleccionados.length >= 6
                                        }
                                        className="h-4 w-4 accent-blue-600"
                                    />

                                    <span className="font-medium text-slate-700">
                                        {periodo.gestion}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                )}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                        type="button"
                        onClick={comparar}
                        disabled={
                            materiaId === null ||
                            periodosSeleccionados.length < 2 ||
                            isLoading
                        }
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {isLoading ? 'Comparando...' : 'Comparar periodos'}
                    </button>

                    <button
                        type="button"
                        onClick={limpiar}
                        disabled={
                            (periodosSeleccionados.length === 0 && !comparacion && !error) ||
                            isLoading
                        }
                        className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Limpiar selección
                    </button>
                </div>

                {periodosSeleccionados.length < 2 && (
                    <p className="mt-3 text-sm text-amber-700">
                        Selecciona al menos 2 periodos para realizar la comparación.
                    </p>
                )}

                {error && (
                    <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </p>
                )}
            </article>

            {comparacion && (
                <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                        <h3 className="font-semibold text-slate-900">
                            Resultados de la comparación
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Materia: {comparacion.materia.nombre} (
                            {comparacion.materia.codigo})
                        </p>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[650px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="px-3 py-3 font-medium">Periodo</th>
                                    <th className="px-3 py-3 font-medium text-center">
                                        Evaluaciones
                                    </th>
                                    <th className="px-3 py-3 font-medium text-center">
                                        Rendiciones
                                    </th>
                                    <th className="px-3 py-3 font-medium text-center">
                                        Promedio
                                    </th>
                                    <th className="px-3 py-3 font-medium text-center">
                                        Diferencia
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {comparacion.comparaciones.map((fila, indice) => (
                                    <tr
                                        key={fila.semestre_id}
                                        className="border-b border-slate-100 last:border-0"
                                    >
                                        <td className="px-3 py-4 font-medium text-slate-800">
                                            {fila.periodo}
                                        </td>
                                        <td className="px-3 py-4 text-center text-slate-600">
                                            {fila.total_evaluaciones}
                                        </td>
                                        <td className="px-3 py-4 text-center text-slate-600">
                                            {fila.total_rendiciones}
                                        </td>
                                        <td className="px-3 py-4 text-center font-semibold text-slate-800">
                                            {formatoNota(fila.promedio)}
                                        </td>
                                        <td className="px-3 py-4 text-center">
                                            {indice === 0 ? (
                                                <span className="text-slate-400">—</span>
                                            ) : fila.diferencia_anterior === null ? (
                                                <span className="text-slate-500">
                                                    No disponible
                                                </span>
                                            ) : (
                                                <span
                                                    className={
                                                        fila.diferencia_anterior > 0
                                                            ? 'font-medium text-green-700'
                                                            : fila.diferencia_anterior < 0
                                                              ? 'font-medium text-red-700'
                                                              : 'font-medium text-slate-600'
                                                    }
                                                >
                                                    {fila.diferencia_anterior > 0 ? '+' : ''}
                                                    {fila.diferencia_anterior.toFixed(2)}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                        La diferencia corresponde al promedio del periodo
                        actual menos el promedio del periodo seleccionado
                        inmediatamente anterior.
                    </p>
                </article>
            )}
        </section>
    );
}
