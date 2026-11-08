'use client';

import Link from 'next/link';
import {
    ArrowLeft,
    BookOpenText,
    CalendarClock,
    ClipboardList,
    Clock3,
    RefreshCw,
} from 'lucide-react';

import { Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useInstruccionesEvaluacion } from '../hooks/useInstruccionesEvaluacion';
import type { InstruccionesEvaluacionEstudiante } from '../types';

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-BO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/La_Paz',
});

function fechaVisible(fecha: string | null): string {
    if (!fecha) return 'No disponible';

    const fechaParseada = new Date(fecha);
    if (Number.isNaN(fechaParseada.getTime())) return 'No disponible';

    return FORMATO_FECHA_HORA.format(fechaParseada);
}

function PanelCarga() {
    return (
        <main
            aria-busy="true"
            aria-label="Cargando instrucciones"
            className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6"
        >
            <p role="status" className="text-sm text-slate-500">
                Cargando las instrucciones de la evaluación...
            </p>
            <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
            <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
        </main>
    );
}

function PanelError({
    error,
    noDisponible,
    recargar,
}: {
    error: string;
    noDisponible: boolean;
    recargar: () => Promise<void>;
}) {
    return (
        <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
            <section
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 p-5"
            >
                <h1 className="text-base font-semibold text-amber-950">
                    {noDisponible
                        ? 'Instrucciones no disponibles'
                        : 'No se pudieron cargar las instrucciones'}
                </h1>
                <p className="mt-2 text-sm text-amber-900">
                    {noDisponible
                        ? 'No es posible acceder a estas instrucciones. La evaluación podría no estar asignada a tu cuenta o estar fuera de su periodo de disponibilidad.'
                        : error}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void recargar()}
                    >
                        <RefreshCw aria-hidden="true" />
                        Reintentar
                    </Button>
                    <Link
                        href={ROUTES.estudiante.evaluaciones}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Volver a mis evaluaciones
                    </Link>
                </div>
            </section>
        </main>
    );
}

function ResumenEvaluacion({
    instrucciones,
}: {
    instrucciones: InstruccionesEvaluacionEstudiante;
}) {
    return (
        <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                    <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"
                        aria-hidden="true"
                    >
                        <BookOpenText className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg font-semibold text-slate-900">
                                {instrucciones.titulo ?? 'Evaluación'}
                            </h1>
                            <Badge tono="emerald">
                                <span
                                    aria-hidden="true"
                                    className="mr-1.5 size-1.5 rounded-full bg-current"
                                />
                                Disponible
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                            {instrucciones.docente ?? 'Docente no disponible'}
                            <span aria-hidden="true"> · </span>
                            {instrucciones.materia ?? 'Materia no disponible'}
                        </p>
                    </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 sm:grid-cols-4">
                    <div className="border-b border-r border-slate-200 p-3 sm:border-b-0">
                        <dt className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                            Duración
                        </dt>
                        <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                            <Clock3
                                className="size-3.5 text-slate-500 sm:hidden"
                                aria-hidden="true"
                            />
                            {instrucciones.duracion_min === null
                                ? 'No indicada'
                                : `${instrucciones.duracion_min} minutos`}
                        </dd>
                    </div>
                    <div className="border-b border-slate-200 p-3 sm:border-r">
                        <dt className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                            Hora de inicio
                        </dt>
                        <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                            <CalendarClock
                                className="size-3.5 text-slate-500 sm:hidden"
                                aria-hidden="true"
                            />
                            {fechaVisible(instrucciones.disponible_desde)}
                        </dd>
                    </div>
                    <div className="border-r border-slate-200 p-3">
                        <dt className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                            Hora límite
                        </dt>
                        <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                            <CalendarClock
                                className="size-3.5 text-slate-500 sm:hidden"
                                aria-hidden="true"
                            />
                            {fechaVisible(instrucciones.disponible_hasta)}
                        </dd>
                    </div>
                    <div className="p-3">
                        <dt className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                            Cantidad de preguntas
                        </dt>
                        <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                            <ClipboardList
                                className="size-3.5 text-slate-500 sm:hidden"
                                aria-hidden="true"
                            />
                            {instrucciones.total_preguntas}
                        </dd>
                    </div>
                </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-sm font-semibold text-slate-900">
                    Instrucciones generales
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {instrucciones.instrucciones?.trim() ||
                        'El docente no agregó instrucciones para esta evaluación.'}
                </p>
            </section>
        </>
    );
}

export default function InstruccionesEvaluacion({
    examenId,
}: {
    examenId: number;
}) {
    const {
        instrucciones,
        cargando,
        error,
        noDisponible,
        recargar,
    } = useInstruccionesEvaluacion(examenId);

    if (cargando) return <PanelCarga />;

    if (error || !instrucciones) {
        return (
            <PanelError
                error={error}
                noDisponible={noDisponible}
                recargar={recargar}
            />
        );
    }

    return (
        <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
            <ResumenEvaluacion instrucciones={instrucciones} />

            <section className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                    <h2 className="text-sm font-semibold text-blue-950">
                        ¿Listo para comenzar?
                    </h2>
                    <p className="mt-1 text-sm text-blue-800">
                        El inicio de la rendición aún no está habilitado.
                    </p>
                </div>
                <Button
                    type="button"
                    disabled
                    title="La rendición estará disponible cuando se implemente HU-40"
                    className="bg-emerald-700 text-white"
                >
                    Iniciar evaluación (próximamente)
                </Button>
            </section>

            <Link
                href={ROUTES.estudiante.evaluaciones}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Volver a mis evaluaciones
            </Link>
        </main>
    );
}
