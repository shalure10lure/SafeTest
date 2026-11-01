
'use client';

import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/Card';
import { ROUTES } from '@/constants/routes';
import { infoTipoPregunta } from '@/features/evaluaciones/tipos-pregunta';
import { cn } from '@/lib/utils';

import { formatearFecha, formatearPuntos } from '../formato';
import type { Pregunta } from '../types';

interface PreguntaListProps {
    preguntas: Pregunta[];
    isLoading: boolean;
    isDeleting?: boolean;
    error: string | null;
    hayFiltros: boolean;
    onLimpiarFiltros: () => void;
    onEliminar: (id: number) => void;
}

export default function PreguntaList({
    preguntas,
    isLoading,
    isDeleting = false,
    error,
    hayFiltros,
    onLimpiarFiltros,
    onEliminar,
}: PreguntaListProps) {
    if (isLoading && preguntas.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Cargando preguntas...
            </div>
        );
    }

    if (error) {
        return (
            <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
            >
                {error}
            </div>
        );
    }

    if (preguntas.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
                <p className="font-medium text-gray-700">
                    {hayFiltros
                        ? 'Ninguna pregunta coincide con los filtros.'
                        : 'Todavía no tienes preguntas.'}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                    {hayFiltros
                        ? 'Prueba con otros criterios o limpia los filtros.'
                        : 'Crea una pregunta para comenzar tu banco de preguntas.'}
                </p>

                {hayFiltros ? (
                    <button
                        type="button"
                        onClick={onLimpiarFiltros}
                        className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                        Limpiar filtros
                    </button>
                ) : (
                    <Link
                        href={ROUTES.docente.preguntaNueva}
                        className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                        Crear pregunta
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table
                    className={cn(
                        'w-full min-w-[880px] text-left text-sm',
                        isLoading && 'opacity-60',
                    )}
                    aria-busy={isLoading || isDeleting}
                >
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase">
                        <tr>
                            <th scope="col" className="px-4 py-3 font-semibold">
                                Pregunta
                            </th>
                            <th scope="col" className="px-4 py-3 font-semibold">
                                Materia
                            </th>
                            <th scope="col" className="px-4 py-3 font-semibold">
                                Tema
                            </th>
                            <th scope="col" className="px-4 py-3 font-semibold">
                                Tipo
                            </th>
                            <th scope="col" className="px-4 py-3 font-semibold">
                                Fecha
                            </th>
                            <th scope="col" className="px-4 py-3 font-semibold">
                                Acciones
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {preguntas.map((pregunta) => {
                            const tipo = infoTipoPregunta(
                                pregunta.tipo_respuesta,
                            );

                            return (
                                <tr
                                    key={pregunta.pregunta_id}
                                    className="transition-colors hover:bg-slate-50/70"
                                >
                                    <td className="max-w-[320px] px-4 py-3 align-top">
                                        <p
                                            className="line-clamp-2 font-medium text-slate-900"
                                            title={pregunta.enunciado}
                                        >
                                            {pregunta.enunciado}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {formatearPuntos(pregunta.puntos)}{' '}
                                            pts
                                        </p>
                                    </td>

                                    <td className="px-4 py-3 align-top text-slate-600">
                                        {pregunta.materia?.nombre ?? '—'}
                                    </td>

                                    <td className="px-4 py-3 align-top text-slate-600">
                                        {pregunta.tema?.nombre_tema ?? '—'}
                                    </td>

                                    <td className="px-4 py-3 align-top">
                                        <Badge
                                            tono={tipo.tono}
                                            className="whitespace-nowrap"
                                        >
                                            {tipo.label}
                                        </Badge>
                                    </td>

                                    <td className="px-4 py-3 align-top whitespace-nowrap text-slate-600">
                                        {formatearFecha(pregunta.creado_en)}
                                    </td>

                                    <td className="px-4 py-3 align-top">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link
                                                href={ROUTES.docente.preguntaEditar(
                                                    pregunta.pregunta_id,
                                                )}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                                            >
                                                <Pencil
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                Editar
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onEliminar(
                                                        pregunta.pregunta_id,
                                                    )
                                                }
                                                disabled={isDeleting}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Trash2
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
