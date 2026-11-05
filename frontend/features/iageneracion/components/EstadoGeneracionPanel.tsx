'use client';

import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Loader2,
    RefreshCw,
    Sparkles,
} from 'lucide-react';

import { Badge, type Tono } from '@/components/ui/Card';
import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

import {
    ETIQUETAS_DIFICULTAD,
    etiquetaTipo,
} from '../etiquetas';
import type {
    CreacionGeneracionIa,
    EstadoGeneracionIa,
    GeneracionIaDetalle,
} from '../types';

interface EstadoGeneracionPanelProps {
    creacion: CreacionGeneracionIa | null;
    generacion: GeneracionIaDetalle | null;
    consultando: boolean;
    siguiendo: boolean;
    limiteAlcanzado: boolean;
    errorEnvio: string;
    errorSeguimiento: string;
    onRefrescar: () => void;
    onReiniciar: () => void;
}

const ETIQUETAS_ESTADO: Record<EstadoGeneracionIa, string> = {
    pendiente: 'En cola',
    procesando: 'Generando',
    completada: 'Completada',
    error: 'Con error',
};

const TONOS_ESTADO: Record<EstadoGeneracionIa, Tono> = {
    pendiente: 'amber',
    procesando: 'blue',
    completada: 'emerald',
    error: 'slate',
};

function IconoEstado({ estado }: { estado: EstadoGeneracionIa }) {
    if (estado === 'procesando') {
        return (
            <Loader2
                className="size-4 animate-spin"
                aria-hidden="true"
            />
        );
    }

    if (estado === 'completada') {
        return <CheckCircle2 className="size-4" aria-hidden="true" />;
    }

    if (estado === 'error') {
        return <AlertTriangle className="size-4" aria-hidden="true" />;
    }

    return <Clock className="size-4" aria-hidden="true" />;
}

function descripcionEstado(
    estado: EstadoGeneracionIa,
    generacion: GeneracionIaDetalle | null,
): string {
    if (estado === 'pendiente') {
        return 'Solicitud recibida. La generación está en cola y el servidor la procesará en segundo plano.';
    }

    if (estado === 'procesando') {
        return 'La IA está generando las preguntas con la configuración enviada. Puedes seguir usando SafeTest.';
    }

    if (estado === 'completada') {
        const generadas = generacion?.cantidad_generada ?? 0;
        const solicitadas = generacion?.cantidad ?? generadas;

        if (generadas === 0) {
            return 'La generación terminó, pero no se obtuvieron propuestas válidas. Prueba con otros materiales o ajusta la configuración.';
        }

        return `Se generaron ${generadas} de ${solicitadas} propuestas válidas. Quedaron guardadas en esta generación.`;
    }

    return (
        generacion?.error_mensaje ??
        'El servidor no pudo completar la generación. Revisa la configuración e inténtalo de nuevo.'
    );
}

export default function EstadoGeneracionPanel({
    creacion,
    generacion,
    consultando,
    siguiendo,
    limiteAlcanzado,
    errorEnvio,
    errorSeguimiento,
    onRefrescar,
    onReiniciar,
}: EstadoGeneracionPanelProps) {
    if (!creacion && !generacion && !errorEnvio) return null;

    if (errorEnvio && !creacion && !generacion) {
        return (
            <section
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle
                        className="mt-0.5 size-5 shrink-0"
                        aria-hidden="true"
                    />
                    <div>
                        <h2 className="font-semibold">
                            No se pudo enviar la solicitud
                        </h2>
                        <p className="mt-1">{errorEnvio}</p>
                    </div>
                </div>
            </section>
        );
    }

    const estado: EstadoGeneracionIa =
        generacion?.estado ?? creacion?.estado ?? 'pendiente';
    const generacionId = generacion?.generacion_id ?? creacion?.generacion_id;
    const enCurso = estado === 'pendiente' || estado === 'procesando';

    return (
        <section
            aria-labelledby="estado-generacion"
            aria-live="polite"
            className={cn(
                'rounded-xl border p-5 shadow-sm sm:p-6',
                estado === 'completada'
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : estado === 'error'
                      ? 'border-red-200 bg-red-50/40'
                      : 'border-slate-200 bg-white',
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600"
                        aria-hidden="true"
                    >
                        <Sparkles className="size-4" />
                    </span>

                    <div>
                        <h2
                            id="estado-generacion"
                            className="text-sm font-semibold text-slate-900"
                        >
                            Estado de la generación
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {generacionId
                                ? `Generación #${generacionId}`
                                : 'Solicitud de generación'}
                        </p>
                    </div>
                </div>

                <Badge tono={TONOS_ESTADO[estado]}>
                    <span className="inline-flex items-center gap-1">
                        <IconoEstado estado={estado} />
                        {ETIQUETAS_ESTADO[estado]}
                    </span>
                </Badge>
            </div>

            <p className="mt-4 text-sm text-slate-700">
                {descripcionEstado(estado, generacion)}
            </p>

            {generacion && (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-4">
                    <div className="min-w-0">
                        <dt className="text-slate-500">Materia</dt>
                        <dd
                            className="truncate font-medium text-slate-800"
                            title={generacion.materia ?? undefined}
                        >
                            {generacion.materia ?? 'No disponible'}
                        </dd>
                    </div>
                    <div className="min-w-0">
                        <dt className="text-slate-500">Tema</dt>
                        <dd
                            className="truncate font-medium text-slate-800"
                            title={generacion.tema ?? undefined}
                        >
                            {generacion.tema ?? 'No disponible'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-slate-500">Tipo</dt>
                        <dd className="font-medium text-slate-800">
                            {etiquetaTipo(generacion.tipo_respuesta)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-slate-500">Dificultad</dt>
                        <dd className="font-medium text-slate-800">
                            {generacion.dificultad
                                ? ETIQUETAS_DIFICULTAD[
                                      generacion.dificultad
                                  ]
                                : 'No disponible'}
                        </dd>
                    </div>
                </dl>
            )}

            {consultando && (
                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Loader2
                        className="size-3.5 animate-spin"
                        aria-hidden="true"
                    />
                    Consultando el estado...
                </p>
            )}

            {limiteAlcanzado && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    La consulta automática se detuvo después de varios minutos.
                    Puedes actualizar el estado manualmente.
                </p>
            )}

            {errorSeguimiento && (
                <p
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                >
                    {errorSeguimiento}
                </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
                {!siguiendo && enCurso && (
                    <button
                        type="button"
                        onClick={onRefrescar}
                        disabled={consultando}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            className="size-4"
                            aria-hidden="true"
                        />
                        Actualizar estado
                    </button>
                )}

                {(estado === 'completada' ||
                    estado === 'error' ||
                    limiteAlcanzado ||
                    (errorSeguimiento && !siguiendo)) && (
                    <button
                        type="button"
                        onClick={onReiniciar}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                        <Sparkles className="size-4" aria-hidden="true" />
                        Nueva generación
                    </button>
                )}
                {estado === 'completada' &&
                    (generacion?.propuestas.length ?? 0) > 0 &&
                    generacionId && (
                        <LinkButton
                            href={ROUTES.docente.preguntaIAGeneracion(
                                generacionId,
                            )}
                            variante="primaria"
                        >
                            Revisar propuestas
                        </LinkButton>
                    )}
            </div>
        </section>
    );
}
