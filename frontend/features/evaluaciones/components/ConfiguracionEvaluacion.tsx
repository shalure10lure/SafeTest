'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, List, Shuffle, Zap } from 'lucide-react';

import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

import {
    aInputLocal,
    aIso,
    DURACIONES_RAPIDAS,
    formatearDuracion,
    minutosEntre,
} from '../configuracion';
import { useEvaluacion } from '../hooks/useEvaluacion';
import { mensajeDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type {
    EvaluacionDetalle,
    ModoEntregaNota,
    OrdenPreguntas,
} from '../types';
import OpcionesRadio, { type OpcionRadio } from './OpcionesRadio';
import SeccionConfiguracion from './SeccionConfiguracion';

const OPCIONES_ORDEN: readonly OpcionRadio<OrdenPreguntas>[] = [
    {
        valor: 'definido',
        titulo: 'Definido',
        descripcion: 'Las preguntas aparecen en el orden establecido.',
        icono: List,
    },
    {
        valor: 'aleatorio',
        titulo: 'Aleatorio',
        descripcion: 'Las preguntas se mezclan para cada estudiante.',
        icono: Shuffle,
    },
];

const OPCIONES_ENTREGA: readonly OpcionRadio<ModoEntregaNota>[] = [
    {
        valor: 'al_publicar',
        titulo: 'Después de revisión docente',
        descripcion: 'Los estudiantes ven su nota cuando revises y publiques.',
        icono: Eye,
    },
    {
        valor: 'inmediata',
        titulo: 'Automática cuando corresponda',
        descripcion:
            'Se publican al cerrar, si todas las preguntas son autocalificables.',
        icono: Zap,
    },
];

const DURACION_POR_DEFECTO = 90;

const ENTRADA =
    'h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600';

function FormularioConfiguracion({ evaluacion }: { evaluacion: EvaluacionDetalle }) {
    const router = useRouter();

    const duracionInicial = evaluacion.duracion_min ?? DURACION_POR_DEFECTO;

    const [orden, setOrden] = useState<OrdenPreguntas>(evaluacion.orden_preguntas);
    const [horas, setHoras] = useState(String(Math.floor(duracionInicial / 60)));
    const [minutos, setMinutos] = useState(String(duracionInicial % 60));
    const [desde, setDesde] = useState(aInputLocal(evaluacion.disponible_desde));
    const [hasta, setHasta] = useState(aInputLocal(evaluacion.disponible_hasta));
    const [entrega, setEntrega] = useState<ModoEntregaNota>(
        evaluacion.modo_entrega_nota,
    );

    const [intento, setIntento] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errorGuardar, setErrorGuardar] = useState('');

    // ----- Duración -----
    const h = Number(horas);
    const m = Number(minutos);
    const duracionValida =
        Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h <= 12 && m >= 0 && m <= 59;
    const duracionTotal = duracionValida ? h * 60 + m : 0;
    const errorDuracion =
        duracionTotal < 5 || duracionTotal > 720
            ? 'La duración debe ser de entre 5 minutos y 12 horas.'
            : '';

    function fijarDuracion(total: number) {
        setHoras(String(Math.floor(total / 60)));
        setMinutos(String(total % 60));
    }

    // ----- Disponibilidad -----
    const ventana = minutosEntre(desde, hasta);

    let errorDesde = '';
    let errorHasta = '';

    if (!desde) {
        errorDesde = 'Indica la fecha y hora de inicio.';
    }

    if (!hasta) {
        errorHasta = 'Indica la fecha y hora de finalización.';
    } else if (ventana !== null && ventana <= 0) {
        errorHasta = 'La finalización debe ser posterior al inicio.';
    } else if (ventana !== null && duracionTotal > 0 && ventana < duracionTotal) {
        errorHasta = `La ventana (${formatearDuracion(ventana)}) es menor que la duración (${formatearDuracion(duracionTotal)}).`;
    }

    const verErrorDesde = intento && errorDesde !== '';
    const verErrorHasta =
        errorHasta !== '' && (intento || (desde !== '' && hasta !== ''));

    const hayErrores = errorDuracion !== '' || errorDesde !== '' || errorHasta !== '';

    // Al elegir el inicio, se propone un fin acorde con la duración.
    function cambiarDesde(valor: string) {
        setDesde(valor);

        if (valor && !hasta && duracionTotal > 0) {
            const fin = new Date(new Date(valor).getTime() + duracionTotal * 60000);
            setHasta(aInputLocal(fin.toISOString()));
        }
    }

    async function siguiente() {
        setIntento(true);
        setErrorGuardar('');

        if (hayErrores) return;

        if (new Date(hasta).getTime() <= Date.now()) {
            setErrorGuardar('La fecha de finalización debe ser futura.');
            return;
        }

        setGuardando(true);

        try {
            await evaluacionesService.guardarConfiguracion(evaluacion.examen_id, {
                orden_preguntas: orden,
                duracion_min: duracionTotal,
                disponible_desde: aIso(desde),
                disponible_hasta: aIso(hasta),
                modo_entrega_nota: entrega,
            });

            // TODO(paso 4): ir a /docente/evaluaciones/[id]/asignacion
            router.push(ROUTES.docente.evaluaciones);
        } catch (e) {
            setErrorGuardar(
                mensajeDeError(
                    e,
                    'No se pudo guardar la configuración. Inténtalo de nuevo.',
                ),
            );
            setGuardando(false);
        }
    }

    return (
        <section className="max-w-2xl space-y-4">
            <header>
                <h2 className="text-base font-semibold text-slate-900">Configuración</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Ajusta el comportamiento, la disponibilidad y la publicación de
                    resultados.
                </p>
            </header>

            <SeccionConfiguracion numero={1} titulo="Orden de preguntas">
                <OpcionesRadio
                    nombre="orden-preguntas"
                    etiqueta="Orden de preguntas"
                    valor={orden}
                    opciones={OPCIONES_ORDEN}
                    onCambiar={setOrden}
                />
            </SeccionConfiguracion>

            <SeccionConfiguracion
                numero={2}
                titulo="Duración"
                descripcion="Tiempo máximo que tendrá cada estudiante una vez iniciada la evaluación."
            >
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label
                            htmlFor="cfg-horas"
                            className="mb-1 block text-xs font-medium text-slate-600"
                        >
                            Horas
                        </label>
                        <input
                            id="cfg-horas"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={12}
                            value={horas}
                            onChange={(e) => setHoras(e.target.value)}
                            className={cn(
                                ENTRADA,
                                'w-20 text-center',
                                errorDuracion ? 'border-red-400' : 'border-slate-200',
                            )}
                        />
                    </div>

                    <span aria-hidden="true" className="pb-2 text-slate-400">
                        :
                    </span>

                    <div>
                        <label
                            htmlFor="cfg-minutos"
                            className="mb-1 block text-xs font-medium text-slate-600"
                        >
                            Minutos
                        </label>
                        <input
                            id="cfg-minutos"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={59}
                            value={minutos}
                            onChange={(e) => setMinutos(e.target.value)}
                            className={cn(
                                ENTRADA,
                                'w-20 text-center',
                                errorDuracion ? 'border-red-400' : 'border-slate-200',
                            )}
                        />
                    </div>

                    <p className="pb-2 text-sm font-medium text-slate-900">
                        = {formatearDuracion(duracionTotal)}
                    </p>
                </div>

                <div
                    role="group"
                    aria-label="Duraciones rápidas"
                    className="mt-3 flex flex-wrap gap-2"
                >
                    {DURACIONES_RAPIDAS.map((minutosRapidos) => {
                        const activo = duracionTotal === minutosRapidos;

                        return (
                            <button
                                key={minutosRapidos}
                                type="button"
                                aria-pressed={activo}
                                onClick={() => fijarDuracion(minutosRapidos)}
                                className={cn(
                                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-violet-600',
                                    activo
                                        ? 'bg-violet-600 text-white'
                                        : 'bg-slate-100 text-slate-500 hover:text-slate-800',
                                )}
                            >
                                {formatearDuracion(minutosRapidos)}
                            </button>
                        );
                    })}
                </div>

                {intento && errorDuracion && (
                    <p className="mt-2 text-xs text-red-600" role="alert">
                        {errorDuracion}
                    </p>
                )}
            </SeccionConfiguracion>

            <SeccionConfiguracion
                numero={3}
                titulo="Disponibilidad"
                descripcion="Ventana en la que los estudiantes asignados podrán iniciar la evaluación."
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="cfg-desde"
                            className="mb-1 block text-sm font-medium text-slate-900"
                        >
                            Fecha y hora de inicio
                        </label>
                        <input
                            id="cfg-desde"
                            type="datetime-local"
                            value={desde}
                            onChange={(e) => cambiarDesde(e.target.value)}
                            aria-invalid={verErrorDesde}
                            className={cn(
                                ENTRADA,
                                'w-full',
                                verErrorDesde ? 'border-red-400' : 'border-slate-200',
                            )}
                        />
                        {verErrorDesde && (
                            <p className="mt-1 text-xs text-red-600" role="alert">
                                {errorDesde}
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor="cfg-hasta"
                            className="mb-1 block text-sm font-medium text-slate-900"
                        >
                            Fecha y hora de finalización
                        </label>
                        <input
                            id="cfg-hasta"
                            type="datetime-local"
                            value={hasta}
                            min={desde || undefined}
                            onChange={(e) => setHasta(e.target.value)}
                            aria-invalid={verErrorHasta}
                            className={cn(
                                ENTRADA,
                                'w-full',
                                verErrorHasta ? 'border-red-400' : 'border-slate-200',
                            )}
                        />
                        {verErrorHasta && (
                            <p className="mt-1 text-xs text-red-600" role="alert">
                                {errorHasta}
                            </p>
                        )}
                    </div>
                </div>

                {ventana !== null && ventana > 0 && (
                    <p className="mt-3 text-xs text-slate-500">
                        Abierta durante{' '}
                        <strong className="text-slate-900">
                            {formatearDuracion(ventana)}
                        </strong>
                        .
                    </p>
                )}
            </SeccionConfiguracion>

            <SeccionConfiguracion numero={4} titulo="Publicación de resultados">
                <OpcionesRadio
                    nombre="publicacion-resultados"
                    etiqueta="Publicación de resultados"
                    valor={entrega}
                    opciones={OPCIONES_ENTREGA}
                    onCambiar={setEntrega}
                />
            </SeccionConfiguracion>

            {errorGuardar && (
                <p className="text-sm text-red-600" role="alert">
                    {errorGuardar}
                </p>
            )}

            <div className="flex items-center justify-between pt-1">
                <LinkButton href={ROUTES.docente.evaluacionPreguntas(evaluacion.examen_id)}>
                    ← Anterior
                </LinkButton>

                <button
                    type="button"
                    onClick={siguiente}
                    disabled={guardando}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {guardando ? 'Guardando...' : 'Siguiente →'}
                </button>
            </div>
        </section>
    );
}

export default function ConfiguracionEvaluacion({ examenId }: { examenId: number }) {
    const { evaluacion, cargando, error } = useEvaluacion(examenId);

    if (cargando) {
        return (
            <p className="text-sm text-slate-500" aria-live="polite">
                Cargando evaluación...
            </p>
        );
    }

    if (error || !evaluacion) {
        return (
            <p className="text-sm text-red-600" role="alert">
                {error || 'No se pudo cargar la evaluación.'}
            </p>
        );
    }

    if (evaluacion.estado !== 'borrador') {
        return (
            <p className="text-sm text-slate-600">
                Solo puedes configurar una evaluación en borrador.
            </p>
        );
    }

    return <FormularioConfiguracion evaluacion={evaluacion} />;
}