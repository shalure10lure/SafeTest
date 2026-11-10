'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

import {
    claveIncisoRendicion,
    usePreguntasRendicion,
} from '../hooks/usePreguntasRendicion';
import { mensajeDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type {
    IncisoRendicionEstudiante,
    PreguntaRendicionEstudiante,
    RespuestaRendicion,
} from '../types';
import { infoTipoPregunta } from '../tipos-pregunta';
import RecursosRendicion from './RecursosRendicion';

function EstadoCarga() {
    return (
        <main
            aria-busy="true"
            aria-label="Cargando rendición"
            className="space-y-4 p-4 sm:p-6"
        >
            <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="h-80 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
            </div>
        </main>
    );
}

function EstadoError({
    error,
    recargar,
    examenId,
}: {
    error: string;
    recargar: () => Promise<void>;
    examenId: number;
}) {
    return (
        <main className="p-4 sm:p-6">
            <Card className="mx-auto max-w-2xl p-6 text-center">
                <div
                    className="mx-auto flex size-11 items-center justify-center rounded-full bg-amber-100 text-amber-700"
                    aria-hidden="true"
                >
                    <ShieldCheck className="size-5" />
                </div>
                <h1 className="mt-4 text-base font-semibold text-slate-900">
                    No se pudo cargar la rendición
                </h1>
                <p role="alert" className="mt-2 text-sm text-slate-600">
                    {error}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Button
                        type="button"
                        onClick={() => void recargar()}
                        className="bg-blue-700 text-white hover:bg-blue-800"
                    >
                        Reintentar
                    </Button>
                    <Link
                        href={ROUTES.estudiante.instruccionesEvaluacion(
                            examenId,
                        )}
                        className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Volver a instrucciones
                    </Link>
                </div>
            </Card>
        </main>
    );
}

function EstadoVacio({ examenId }: { examenId: number }) {
    return (
        <main className="p-4 sm:p-6">
            <Card className="mx-auto max-w-2xl p-6 text-center">
                <h1 className="text-base font-semibold text-slate-900">
                    No hay preguntas disponibles
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                    No se encontraron preguntas asignadas a esta rendición.
                </p>
                <Link
                    href={ROUTES.estudiante.instruccionesEvaluacion(examenId)}
                    className="mt-5 inline-flex min-h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    Volver a instrucciones
                </Link>
            </Card>
        </main>
    );
}

type EstadoGuardado = 'guardado' | 'guardando' | 'sin_guardar';

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
    const texto =
        estado === 'guardando'
            ? 'Guardando respuestas…'
            : estado === 'sin_guardar'
              ? 'Hay respuestas sin guardar. Usa «Reintentar guardado».'
              : 'Todas tus respuestas están guardadas.';
    const color =
        estado === 'sin_guardar'
            ? 'text-red-700'
            : estado === 'guardando'
              ? 'text-slate-500'
              : 'text-emerald-700';

    return (
        <p role="status" aria-live="polite" className={`text-xs ${color}`}>
            {texto}
        </p>
    );
}

function CabeceraRendicion({
    preguntaActual,
    indiceActual,
    total,
    respondidas,
    estadoGuardado,
}: {
    preguntaActual: PreguntaRendicionEstudiante;
    indiceActual: number;
    total: number;
    respondidas: number;
    estadoGuardado: EstadoGuardado;
}) {
    const progreso = total === 0 ? 0 : Math.round((respondidas / total) * 100);

    return (
        <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#203D89] text-white"
                >
                    <ShieldCheck className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                        Evaluación en curso
                    </p>
                    <p className="text-xs text-slate-500">
                        Pregunta {indiceActual + 1} de {total}
                    </p>
                    <IndicadorGuardado estado={estadoGuardado} />
                </div>
                <Badge tono="blue" className="hidden sm:inline-flex">
                    <span
                        aria-hidden="true"
                        className="mr-1.5 size-1.5 rounded-full bg-current"
                    />
                    Rendición activa
                </Badge>
            </div>
            <div className="w-full sm:max-w-xs">
                <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                    <span>Progreso</span>
                    <span>{progreso}%</span>
                </div>
                <div
                    role="progressbar"
                    aria-label="Progreso de preguntas respondidas"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progreso}
                    className="h-2 overflow-hidden rounded-full bg-slate-200"
                >
                    <div
                        className="h-full rounded-full bg-blue-600 transition-[width]"
                        style={{ width: `${progreso}%` }}
                    />
                </div>
            </div>
            <span className="sr-only">
                Pregunta {preguntaActual.orden} seleccionada.
            </span>
        </header>
    );
}

function ControlRespuestaInciso({
    preguntaId,
    inciso,
    respuesta,
    guardando,
    guardada,
    error,
    cambiarRespuesta,
    reintentar,
}: {
    preguntaId: number;
    inciso: IncisoRendicionEstudiante;
    respuesta?: RespuestaRendicion;
    guardando: boolean;
    guardada: boolean;
    error?: string;
    cambiarRespuesta: (
        preguntaId: number,
        letra: string,
        respuesta: RespuestaRendicion,
    ) => void;
    reintentar: () => void;
}) {
    const tipo = inciso.tipo_respuesta;
    const opcionesSeleccionadas =
        respuesta && 'opciones' in respuesta ? respuesta.opciones : [];
    const textoRespuesta =
        respuesta && 'respuesta_texto' in respuesta
            ? respuesta.respuesta_texto
            : '';
    const esSeleccionMultiple = tipo === 'opcion_multiple';
    const esSeleccionUnica =
        tipo === 'opcion_unica' || tipo === 'verdadero_falso';

    const cambiarOpciones = (nroOpcion: number, seleccionada: boolean) => {
        const siguientes = new Set(opcionesSeleccionadas);
        if (seleccionada) {
            siguientes.add(nroOpcion);
        } else {
            siguientes.delete(nroOpcion);
        }
        cambiarRespuesta(preguntaId, inciso.letra, {
            opciones: inciso.opciones
                .filter((opcion) => siguientes.has(opcion.nro_opcion))
                .map((opcion) => opcion.nro_opcion),
        });
    };

    return (
        <div className="space-y-3">
            {esSeleccionUnica || esSeleccionMultiple ? (
                inciso.opciones.length > 0 ? (
                    <fieldset className="space-y-2">
                        <legend className="mb-2 text-xs font-medium text-slate-600">
                            {esSeleccionMultiple
                                ? 'Selecciona una o más opciones'
                                : 'Selecciona una opción'}
                        </legend>
                        {inciso.opciones.map((opcion, indiceOpcion) => {
                            const id = `respuesta-${preguntaId}-${inciso.letra}-${opcion.nro_opcion}`;

                            return (
                                <label
                                    key={opcion.nro_opcion}
                                    htmlFor={id}
                                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/40 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-500"
                                    >
                                        {String.fromCharCode(65 + indiceOpcion)}
                                    </span>
                                    <input
                                        id={id}
                                        type={
                                            esSeleccionMultiple
                                                ? 'checkbox'
                                                : 'radio'
                                        }
                                        name={`respuesta-${preguntaId}-${inciso.letra}`}
                                        value={opcion.nro_opcion}
                                        checked={opcionesSeleccionadas.includes(
                                            opcion.nro_opcion,
                                        )}
                                        onChange={(evento) =>
                                            cambiarOpciones(
                                                opcion.nro_opcion,
                                                evento.target.checked,
                                            )
                                        }
                                        className="mt-1 size-4 shrink-0 accent-blue-700"
                                    />
                                    <span>{opcion.texto_opcion}</span>
                                </label>
                            );
                        })}
                    </fieldset>
                ) : (
                    <p className="text-sm text-amber-700" role="status">
                        Este inciso no tiene opciones disponibles.
                    </p>
                )
            ) : tipo === 'desarrollo' ? (
                <label className="block space-y-2">
                    <span className="text-xs font-medium text-slate-600">
                        Escribe tu respuesta
                    </span>
                    <textarea
                        aria-label={`Respuesta del inciso ${inciso.letra}`}
                        value={textoRespuesta}
                        onChange={(evento) =>
                            cambiarRespuesta(preguntaId, inciso.letra, {
                                respuesta_texto: evento.target.value,
                            })
                        }
                        rows={5}
                        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                    />
                </label>
            ) : tipo === 'numerica' ? (
                <label className="block max-w-sm space-y-2">
                    <span className="text-xs font-medium text-slate-600">
                        Ingresa tu respuesta numérica
                    </span>
                    <input
                        aria-label={`Respuesta numérica del inciso ${inciso.letra}`}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={textoRespuesta}
                        onChange={(evento) =>
                            cambiarRespuesta(preguntaId, inciso.letra, {
                                respuesta_texto: evento.target.value,
                            })
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
                    />
                </label>
            ) : (
                <p className="text-sm text-amber-700" role="status">
                    Este tipo de respuesta no está disponible.
                </p>
            )}

            {guardando ? (
                <p role="status" className="text-xs text-slate-500">
                    Guardando respuesta…
                </p>
            ) : error ? (
                <div className="flex flex-wrap items-center gap-3">
                    <p role="alert" className="text-xs text-red-700">
                        No se pudo guardar la respuesta: {error}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={reintentar}
                        className="min-h-8 border-red-200 px-2.5 text-xs text-red-700 hover:bg-red-50"
                    >
                        Reintentar guardado
                    </Button>
                </div>
            ) : guardada ? (
                <p role="status" className="text-xs text-emerald-700">
                    Respuesta guardada.
                </p>
            ) : null}
        </div>
    );
}

function PreguntaActiva({
    examenId,
    pregunta,
    indice,
    total,
    respuestasLocales,
    respuestasBorrador,
    incisosGuardando,
    erroresGuardado,
    cambiarRespuesta,
}: {
    examenId: number;
    pregunta: PreguntaRendicionEstudiante;
    indice: number;
    total: number;
    respuestasLocales: Record<string, RespuestaRendicion>;
    respuestasBorrador: Record<string, RespuestaRendicion>;
    incisosGuardando: string[];
    erroresGuardado: Record<string, string>;
    cambiarRespuesta: (
        preguntaId: number,
        letra: string,
        respuesta: RespuestaRendicion,
    ) => void;
}) {
    const tipo = infoTipoPregunta(pregunta.tipo_respuesta);

    return (
        <Card className="min-h-[24rem] p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
                <Badge tono="blue">
                    Pregunta {indice + 1} de {total}
                </Badge>
                <Badge tono={tipo.tono}>{tipo.label}</Badge>
            </div>
            <h1 className="mt-5 whitespace-pre-wrap text-lg font-semibold leading-7 text-slate-900">
                {pregunta.enunciado}
            </h1>
            <RecursosRendicion
                examenId={examenId}
                preguntaId={pregunta.pregunta_id}
            />
            {pregunta.incisos.length > 0 && (
                <div className="mt-5 space-y-4">
                    {pregunta.incisos.map((inciso) => {
                        const clave = claveIncisoRendicion(
                            pregunta.pregunta_id,
                            inciso.letra,
                        );
                        const respuestaActual =
                            respuestasBorrador[clave] ??
                            respuestasLocales[clave];

                        return (
                            <section
                                key={inciso.letra}
                                aria-label={`Inciso ${inciso.letra}`}
                                className="space-y-3"
                            >
                                {pregunta.incisos.length > 1 && (
                                    <h2 className="text-sm font-medium text-slate-800">
                                        Inciso {inciso.letra}
                                    </h2>
                                )}
                                {inciso.enunciado_inciso && (
                                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                        {inciso.enunciado_inciso}
                                    </p>
                                )}
                                <ControlRespuestaInciso
                                    preguntaId={pregunta.pregunta_id}
                                    inciso={inciso}
                                    respuesta={respuestaActual}
                                    guardando={incisosGuardando.includes(clave)}
                                    guardada={
                                        respuestasLocales[clave] !== undefined
                                    }
                                    error={erroresGuardado[clave]}
                                    cambiarRespuesta={cambiarRespuesta}
                                    reintentar={() =>
                                        respuestaActual !== undefined &&
                                        cambiarRespuesta(
                                            pregunta.pregunta_id,
                                            inciso.letra,
                                            respuestaActual,
                                        )
                                    }
                                />
                            </section>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}

function NavegadorPreguntas({
    preguntas,
    indiceActual,
    seleccionar,
}: {
    preguntas: PreguntaRendicionEstudiante[];
    indiceActual: number;
    seleccionar: (indice: number) => void;
}) {
    const respondidas = preguntas.filter(
        (pregunta) => pregunta.estado_respuesta === 'respondida',
    ).length;
    const pendientes = preguntas.length - respondidas;

    return (
        <Card className="overflow-hidden">
            <section aria-labelledby="navegador-titulo" className="p-4">
                <h2
                    id="navegador-titulo"
                    className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase"
                >
                    Navegador
                </h2>
                <nav
                    aria-label="Navegación de preguntas"
                    className="mt-3 grid grid-cols-5 gap-2"
                >
                    {preguntas.map((pregunta, indice) => {
                        const actual = indice === indiceActual;
                        const respondida =
                            pregunta.estado_respuesta === 'respondida';

                        return (
                            <button
                                key={pregunta.pregunta_id}
                                type="button"
                                aria-label={`Pregunta ${indice + 1}, ${respondida ? 'respondida' : 'pendiente'}${actual ? ', actual' : ''}`}
                                aria-current={actual ? 'step' : undefined}
                                onClick={() => seleccionar(indice)}
                                className={[
                                    'flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
                                    actual
                                        ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-200'
                                        : respondida
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
                                ].join(' ')}
                            >
                                {indice + 1}
                            </button>
                        );
                    })}
                </nav>
                <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <li className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-full bg-blue-600" />
                        Actual
                    </li>
                    <li className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-full bg-emerald-600" />
                        Respondida
                    </li>
                    <li className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-full bg-slate-300" />
                        Pendiente
                    </li>
                </ul>
            </section>
            <section
                aria-label="Resumen de respuestas"
                className="space-y-2 border-t border-slate-200 px-4 py-3 text-xs"
            >
                <p className="flex justify-between text-slate-600">
                    Respondidas
                    <span className="font-semibold text-emerald-700">
                        {respondidas}/{preguntas.length}
                    </span>
                </p>
                <p className="flex justify-between text-slate-600">
                    Pendientes
                    <span className="font-semibold text-amber-700">
                        {pendientes}
                    </span>
                </p>
            </section>
        </Card>
    );
}

function DialogoFinalizacion({
    finalizando,
    error,
    onCancelar,
    onConfirmar,
}: {
    finalizando: boolean;
    error: string;
    onCancelar: () => void;
    onConfirmar: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="finalizar-evaluacion-titulo"
                aria-describedby="finalizar-evaluacion-descripcion"
                className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            >
                <div className="flex items-start gap-3">
                    <span
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                    >
                        <CheckCircle2 className="size-5" />
                    </span>
                    <div>
                        <h2
                            id="finalizar-evaluacion-titulo"
                            className="text-base font-semibold text-slate-900"
                        >
                            ¿Finalizar evaluación?
                        </h2>
                        <p
                            id="finalizar-evaluacion-descripcion"
                            className="mt-2 text-sm text-slate-600"
                        >
                            Se guardarán tus respuestas pendientes y ya no
                            podrás modificarlas. ¿Deseas continuar?
                        </p>
                    </div>
                </div>

                {error && (
                    <p
                        role="alert"
                        className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                        {error}
                    </p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancelar}
                        disabled={finalizando}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirmar}
                        disabled={finalizando}
                        className="bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                        {finalizando
                            ? 'Finalizando…'
                            : error
                              ? 'Reintentar'
                              : 'Sí, finalizar'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function RendicionEvaluacion({
    examenId,
}: {
    examenId: number;
}) {
    const {
        preguntas,
        cargando,
        error,
        recargar,
        respuestasLocales,
        incisosGuardando,
        erroresGuardado,
        guardarRespuesta,
        esperarGuardadosPendientes,
    } = usePreguntasRendicion(examenId);
    const router = useRouter();
    const [indiceActual, setIndiceActual] = useState(0);
    const [respuestasBorrador, setRespuestasBorrador] = useState<
        Record<string, RespuestaRendicion>
    >({});
    const [confirmandoFinalizacion, setConfirmandoFinalizacion] =
        useState(false);
    const [finalizando, setFinalizando] = useState(false);
    const [errorFinalizacion, setErrorFinalizacion] = useState('');

    const estadoGuardado: EstadoGuardado =
        Object.keys(erroresGuardado).length > 0
            ? 'sin_guardar'
            : incisosGuardando.length > 0
              ? 'guardando'
              : 'guardado';

    // Avisa antes de cerrar o recargar la pestaña si algo aún no se guardó.
    useEffect(() => {
        if (estadoGuardado === 'guardado') return;

        const avisar = (evento: BeforeUnloadEvent) => {
            evento.preventDefault();
            evento.returnValue = '';
        };
        window.addEventListener('beforeunload', avisar);
        return () => window.removeEventListener('beforeunload', avisar);
    }, [estadoGuardado]);

    if (cargando) return <EstadoCarga />;
    if (error) {
        return (
            <EstadoError
                error={error}
                recargar={recargar}
                examenId={examenId}
            />
        );
    }
    if (preguntas.length === 0) return <EstadoVacio examenId={examenId} />;

    const cambiarRespuesta = (
        preguntaId: number,
        letra: string,
        respuesta: RespuestaRendicion,
    ) => {
        const clave = claveIncisoRendicion(preguntaId, letra);
        setRespuestasBorrador((actuales) => ({
            ...actuales,
            [clave]: respuesta,
        }));
        void guardarRespuesta(preguntaId, letra, respuesta);
    };

    const abrirConfirmacion = () => {
        setErrorFinalizacion('');
        setConfirmandoFinalizacion(true);
    };

    const cancelarFinalizacion = () => {
        if (finalizando) return;
        setConfirmandoFinalizacion(false);
        setErrorFinalizacion('');
    };

    const confirmarFinalizacion = async () => {
        if (finalizando) return;

        setFinalizando(true);
        setErrorFinalizacion('');

        try {
            const { fallidos } = await esperarGuardadosPendientes();

            if (fallidos.length > 0) {
                setErrorFinalizacion(
                    'Hay respuestas que no se pudieron guardar. Cancela, usa «Reintentar guardado» y vuelve a finalizar.',
                );
                return;
            }

            await evaluacionesService.finalizarRendicion(examenId);

            // Solo se abandona la rendición cuando el backend confirmó.
            setConfirmandoFinalizacion(false);
            router.replace(ROUTES.estudiante.evaluaciones);
        } catch (errorFinalizar) {
            setErrorFinalizacion(
                mensajeDeError(
                    errorFinalizar,
                    'No se pudo finalizar la evaluación. Inténtalo nuevamente.',
                ),
            );
        } finally {
            setFinalizando(false);
        }
    };

    const indiceSeguro = Math.min(indiceActual, preguntas.length - 1);
    const preguntaActual = preguntas[indiceSeguro];

    return (
        <main className="min-h-full bg-slate-50">
            <CabeceraRendicion
                preguntaActual={preguntaActual}
                indiceActual={indiceSeguro}
                total={preguntas.length}
                estadoGuardado={estadoGuardado}
                respondidas={
                    preguntas.filter(
                        (pregunta) =>
                            pregunta.estado_respuesta === 'respondida',
                    ).length
                }
            />
            <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <section className="min-w-0">
                    <PreguntaActiva
                        examenId={examenId}
                        pregunta={preguntaActual}
                        indice={indiceSeguro}
                        total={preguntas.length}
                        respuestasLocales={respuestasLocales}
                        respuestasBorrador={respuestasBorrador}
                        incisosGuardando={incisosGuardando}
                        erroresGuardado={erroresGuardado}
                        cambiarRespuesta={cambiarRespuesta}
                    />
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={indiceSeguro === 0}
                            onClick={() =>
                                setIndiceActual((actual) =>
                                    Math.max(0, actual - 1),
                                )
                            }
                            className="min-h-9"
                        >
                            <ArrowLeft aria-hidden="true" />
                            Anterior
                        </Button>
                        <span
                            aria-live="polite"
                            className="text-xs text-slate-500"
                        >
                            {indiceSeguro + 1} de {preguntas.length}
                        </span>
                        <Button
                            type="button"
                            disabled={indiceSeguro === preguntas.length - 1}
                            onClick={() =>
                                setIndiceActual((actual) =>
                                    Math.min(preguntas.length - 1, actual + 1),
                                )
                            }
                            className="min-h-9 bg-emerald-700 text-white hover:bg-emerald-800"
                        >
                            Siguiente
                            <ArrowRight aria-hidden="true" />
                        </Button>
                    </div>
                </section>

                <aside className="space-y-4">
                    <NavegadorPreguntas
                        preguntas={preguntas}
                        indiceActual={indiceSeguro}
                        seleccionar={setIndiceActual}
                    />
                    <Card className="p-4">
                        <p className="text-sm font-semibold text-slate-900">
                            ¿Terminaste?
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Revisa tus respuestas antes de finalizar: después
                            no podrás modificarlas.
                        </p>
                        <Button
                            type="button"
                            onClick={abrirConfirmacion}
                            className="mt-3 min-h-10 w-full bg-[#203D89] text-white hover:bg-[#1a3270]"
                        >
                            <CheckCircle2 aria-hidden="true" />
                            Finalizar evaluación
                        </Button>
                    </Card>
                    <Link
                        href={ROUTES.estudiante.instruccionesEvaluacion(
                            examenId,
                        )}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Volver a instrucciones
                    </Link>
                </aside>
            </div>

            {confirmandoFinalizacion && (
                <DialogoFinalizacion
                    finalizando={finalizando}
                    error={errorFinalizacion}
                    onCancelar={cancelarFinalizacion}
                    onConfirmar={() => void confirmarFinalizacion()}
                />
            )}
        </main>
    );
}
