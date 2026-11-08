'use client';

import {
    CalendarClock,
    ClipboardList,
    Clock3,
    RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/Card';
import { ROUTES } from '@/constants/routes';
import { useEvaluacionesAsignadas } from '../hooks/useEvaluacionesAsignadas';
import type {
    EstadoDisponibilidadEvaluacion,
    EvaluacionAsignada,
} from '../types';

const ESTADOS: Record<
    EstadoDisponibilidadEvaluacion,
    { etiqueta: string; tono: 'blue' | 'emerald' | 'slate' }
> = {
    proxima: { etiqueta: 'Próxima', tono: 'blue' },
    disponible: { etiqueta: 'Disponible', tono: 'emerald' },
    finalizada: { etiqueta: 'Finalizada', tono: 'slate' },
};

const FORMATO_FECHA = new Intl.DateTimeFormat('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/La_Paz',
});

const FORMATO_DIA = new Intl.DateTimeFormat('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/La_Paz',
});

const FORMATO_HORA = new Intl.DateTimeFormat('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/La_Paz',
});

function mostrarVentana(evaluacion: EvaluacionAsignada): string {
    const { disponible_desde: inicio, disponible_hasta: fin } = evaluacion;

    if (!inicio) {
        return fin
            ? `Hasta ${FORMATO_FECHA.format(new Date(fin))}`
            : 'Fechas por confirmar';
    }
    if (!fin) return `Desde ${FORMATO_FECHA.format(new Date(inicio))}`;

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    const mismoDia =
        FORMATO_DIA.format(fechaInicio) === FORMATO_DIA.format(fechaFin);

    return mismoDia
        ? `${FORMATO_FECHA.format(fechaInicio)} – ${FORMATO_HORA.format(fechaFin)}`
        : `${FORMATO_FECHA.format(fechaInicio)} – ${FORMATO_FECHA.format(fechaFin)}`;
}

function TarjetaEvaluacion({
    evaluacion,
}: {
    evaluacion: EvaluacionAsignada;
}) {
    const estado = evaluacion.estado_disponibilidad
        ? ESTADOS[evaluacion.estado_disponibilidad]
        : null;

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900">
                            {evaluacion.titulo ?? 'Evaluación sin título'}
                        </h2>
                        {estado ? (
                            <Badge tono={estado.tono}>
                                <span
                                    aria-hidden="true"
                                    className="mr-1.5 size-1.5 rounded-full bg-current"
                                />
                                {estado.etiqueta}
                            </Badge>
                        ) : (
                            <Badge tono="slate">
                                Disponibilidad no determinada
                            </Badge>
                        )}
                    </div>

                    <p className="mt-1 text-xs text-slate-600">
                        {evaluacion.materia ?? 'Materia no disponible'}
                        <span aria-hidden="true"> · </span>
                        Docente: {evaluacion.docente ?? 'No disponible'}
                    </p>

                    <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <div className="inline-flex items-center gap-1.5">
                            <CalendarClock
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            <dt className="sr-only">Disponibilidad</dt>
                            <dd>{mostrarVentana(evaluacion)}</dd>
                        </div>
                        <div className="inline-flex items-center gap-1.5">
                            <Clock3 className="size-3.5" aria-hidden="true" />
                            <dt className="sr-only">Duración</dt>
                            <dd>
                                {evaluacion.duracion_min === null
                                    ? 'Duración no indicada'
                                    : `${evaluacion.duracion_min} min`}
                            </dd>
                        </div>
                        <div className="inline-flex items-center gap-1.5">
                            <ClipboardList
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            <dt className="sr-only">Preguntas</dt>
                            <dd>
                                {evaluacion.total_preguntas}{' '}
                                {evaluacion.total_preguntas === 1
                                    ? 'pregunta'
                                    : 'preguntas'}
                            </dd>
                        </div>
                    </dl>
                </div>
                <Link
                    href={ROUTES.estudiante.instruccionesEvaluacion(
                        evaluacion.examen_id,
                    )}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                    Ver instrucciones
                </Link>
            </div>
        </article>
    );
}

function CargandoEvaluaciones() {
    return (
        <section
            aria-label="Cargando evaluaciones"
            aria-busy="true"
            className="space-y-3"
        >
            <p role="status" className="text-sm text-slate-500">
                Cargando tus evaluaciones...
            </p>
            {[0, 1, 2].map((item) => (
                <div
                    key={item}
                    aria-hidden="true"
                    className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
                />
            ))}
        </section>
    );
}

export default function MisEvaluaciones() {
    const { evaluaciones, cargando, estaVacio, error, recargar } =
        useEvaluacionesAsignadas();

    return (
        <main className="min-h-full space-y-5 p-4 sm:p-6">
            {cargando ? (
                <CargandoEvaluaciones />
            ) : error ? (
                <section
                    role="alert"
                    className="rounded-xl border border-amber-200 bg-amber-50 p-5"
                >
                    <h2 className="text-sm font-semibold text-amber-900">
                        No se pudieron cargar tus evaluaciones
                    </h2>
                    <p className="mt-1 text-sm text-amber-800">{error}</p>
                    <button
                        type="button"
                        onClick={() => void recargar()}
                        disabled={cargando}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw className="size-4" aria-hidden="true" />
                        Intentar de nuevo
                    </button>
                </section>
            ) : estaVacio ? (
                <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <ClipboardList
                        className="mx-auto size-9 text-slate-400"
                        aria-hidden="true"
                    />
                    <h2 className="mt-3 text-sm font-semibold text-slate-800">
                        Todavía no tienes evaluaciones asignadas
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Las evaluaciones que te asignen aparecerán aquí.
                    </p>
                </section>
            ) : (
                <section
                    aria-label="Evaluaciones asignadas"
                    className="space-y-3"
                >
                    {evaluaciones.map((evaluacion) => (
                        <TarjetaEvaluacion
                            key={evaluacion.examen_id}
                            evaluacion={evaluacion}
                        />
                    ))}
                </section>
            )}
        </main>
    );
}
