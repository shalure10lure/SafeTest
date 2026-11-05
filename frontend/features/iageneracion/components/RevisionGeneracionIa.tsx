'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Loader2,
    RefreshCw,
    XCircle,
} from 'lucide-react';

import { Badge, Card, type Tono } from '@/components/ui/Card';
import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';
import { mensajeErrorGeneracionIa } from '@/features/iageneracion/errores';
import { ETIQUETAS_DIFICULTAD } from '@/features/iageneracion/etiquetas';
import VistaPreviaRespuesta from '@/features/preguntas/components/VistaPreviaRespuesta';
import { infoTipoPreguntaFormulario } from '@/features/preguntas/tipos';
import type { TipoRespuestaPregunta } from '@/features/preguntas/types';

import PropuestaIaEditor from './PropuestaIaEditor';
import { iageneracionService } from '../services/iageneracion.service';
import type {
    ActualizarPropuestaIaDto,
    EstadoPropuestaIa,
    GeneracionIaDetalle,
    PropuestaGeneracionIa,
} from '../types';

const ETIQUETAS_ESTADO: Record<EstadoPropuestaIa, string> = {
    pendiente: 'Pendiente',
    aceptada: 'Aceptada',
    descartada: 'Descartada',
};

const TONOS_ESTADO: Record<EstadoPropuestaIa, Tono> = {
    pendiente: 'amber',
    aceptada: 'emerald',
    descartada: 'slate',
};

const ICONOS_ESTADO = {
    pendiente: Clock3,
    aceptada: CheckCircle2,
    descartada: XCircle,
};

function RespuestaCorrecta({
    propuesta,
}: {
    propuesta: PropuestaGeneracionIa;
}) {
    const { tipo_respuesta: tipo, contenido } = propuesta;

    if (
        tipo === 'opcion_unica' ||
        tipo === 'opcion_multiple' ||
        tipo === 'verdadero_falso'
    ) {
        return (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {contenido.opciones.map((opcion, indice) => (
                    <li
                        key={`${indice}-${opcion.texto_opcion}`}
                        className="flex items-start gap-2"
                    >
                        <span className="w-5 shrink-0 font-semibold text-slate-400">
                            {tipo === 'verdadero_falso'
                                ? ''
                                : `${String.fromCharCode(65 + indice)}.`}
                        </span>
                        <span>{opcion.texto_opcion}</span>
                        {opcion.es_correcta && (
                            <span className="font-medium text-emerald-700">
                                Respuesta correcta
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        );
    }

    if (tipo === 'numerica') {
        return (
            <p className="mt-2 text-sm text-slate-700">
                Valor correcto: <strong>{contenido.valor_correcto}</strong>
                {' · '}Tolerancia: <strong>{contenido.tolerancia ?? 0}</strong>
            </p>
        );
    }

    return (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {contenido.solucion_referencia || 'Sin solución de referencia.'}
        </p>
    );
}

interface PropuestaCardProps {
    generacionId: number;
    propuesta: PropuestaGeneracionIa;
    guardando: boolean;
    editando: boolean;
    onEditar: () => void;
    onCancelarEdicion: () => void;
    onGuardar: (dto: ActualizarPropuestaIaDto) => void;
    onAceptar: () => void;
    onDescartar: () => void;
    onInsertar: () => void;
}

function PropuestaCard({
    generacionId,
    propuesta,
    guardando,
    editando,
    onEditar,
    onCancelarEdicion,
    onGuardar,
    onAceptar,
    onDescartar,
    onInsertar,
}: PropuestaCardProps) {
    const IconoEstado = ICONOS_ESTADO[propuesta.estado];
    const contenido = propuesta.contenido;
    const tipo: TipoRespuestaPregunta = propuesta.tipo_respuesta;
    const opcionesVista =
        propuesta.tipo_respuesta === 'opcion_unica' ||
        propuesta.tipo_respuesta === 'opcion_multiple' ||
        propuesta.tipo_respuesta === 'verdadero_falso'
            ? propuesta.contenido.opciones.map(
                  (opcion) => opcion.texto_opcion,
              )
            : [];

    return (
        <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-slate-500">
                        Propuesta #{propuesta.propuesta_id}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">
                        {infoTipoPreguntaFormulario(tipo).label}
                        <span className="ml-2 font-normal text-slate-500">
                            · {ETIQUETAS_DIFICULTAD[contenido.dificultad]} ·{' '}
                            {contenido.puntaje_max} puntos
                        </span>
                    </h3>
                </div>
                <Badge tono={TONOS_ESTADO[propuesta.estado]}>
                    <span className="inline-flex items-center gap-1">
                        <IconoEstado className="size-3.5" aria-hidden="true" />
                        {ETIQUETAS_ESTADO[propuesta.estado]}
                    </span>
                </Badge>
            </div>

            {editando ? (
                <PropuestaIaEditor
                    key={propuesta.propuesta_id}
                    propuesta={propuesta}
                    guardando={guardando}
                    onGuardar={onGuardar}
                    onCancelar={onCancelarEdicion}
                />
            ) : (
                <>
                    <VistaPreviaRespuesta
                        tipo={tipo}
                        enunciado={contenido.enunciado}
                        opciones={opcionesVista}
                    />
                    <section className="rounded-lg bg-slate-50 p-3">
                        <h4 className="text-xs font-semibold text-slate-700">
                            Respuesta de referencia
                        </h4>
                        <RespuestaCorrecta propuesta={propuesta} />
                        {contenido.explicacion && (
                            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                                <strong>Explicación:</strong>{' '}
                                {contenido.explicacion}
                            </p>
                        )}
                    </section>
                </>
            )}

            {propuesta.estado === 'aceptada' && (
                propuesta.pregunta_id === null ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-sm text-emerald-800">
                            Aceptada, todavía no está en el banco.
                        </p>
                        <button
                            type="button"
                            onClick={onInsertar}
                            disabled={guardando}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {guardando ? (
                                <Loader2
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : null}
                            {guardando ? 'Insertando...' : 'Insertar en el banco'}
                        </button>
                    </div>
                ) : (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                        Esta pregunta ya está en el banco. ID de pregunta:{' '}
                        <strong>{propuesta.pregunta_id}</strong>.
                    </p>
                )
            )}
            {propuesta.estado === 'descartada' && (
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    Esta propuesta fue descartada y no se insertará en el
                    banco.
                </p>
            )}

            {!editando && propuesta.estado === 'pendiente' && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                        type="button"
                        onClick={onEditar}
                        disabled={guardando}
                        className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        Editar
                    </button>
                    <button
                        type="button"
                        onClick={onDescartar}
                        disabled={guardando}
                        className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        {guardando ? 'Procesando...' : 'Descartar'}
                    </button>
                    <button
                        type="button"
                        onClick={onAceptar}
                        disabled={guardando}
                        className="h-9 rounded-lg bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                    >
                        {guardando ? 'Procesando...' : 'Aceptar propuesta'}
                    </button>
                </div>
            )}
            <span className="sr-only">
                Revisión de la generación #{generacionId}
            </span>
        </Card>
    );
}

export default function RevisionGeneracionIa({
    generacionId,
}: {
    generacionId: number;
}) {
    const [generacion, setGeneracion] = useState<GeneracionIaDetalle | null>(
        null,
    );
    const [cargando, setCargando] = useState(true);
    const [actualizando, setActualizando] = useState(false);
    const [error, setError] = useState('');
    const [accion, setAccion] = useState<{
        propuestaId: number;
        tipo: 'editar' | 'aceptar' | 'descartar' | 'insertar';
    } | null>(null);
    const [propuestaEditando, setPropuestaEditando] = useState<number | null>(
        null,
    );
    const propuestaInsertandoRef = useRef<number | null>(null);

    const cargar = useCallback(
        async (inicial = false) => {
            if (inicial) setCargando(true);
            else setActualizando(true);
            setError('');

            try {
                const detalle =
                    await iageneracionService.obtener(generacionId);
                setGeneracion(detalle);
            } catch (errorCarga) {
                setError(
                    mensajeErrorGeneracionIa(
                        errorCarga,
                        'No se pudo cargar la generación.',
                    ),
                );
            } finally {
                setCargando(false);
                setActualizando(false);
            }
        },
        [generacionId],
    );

    useEffect(() => {
        let vigente = true;

        iageneracionService
            .obtener(generacionId)
            .then((detalle) => {
                if (!vigente) return;
                setGeneracion(detalle);
                setError('');
            })
            .catch((errorCarga: unknown) => {
                if (!vigente) return;
                setError(
                    mensajeErrorGeneracionIa(
                        errorCarga,
                        'No se pudo cargar la generación.',
                    ),
                );
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });

        return () => {
            vigente = false;
        };
    }, [generacionId]);

    async function guardar(
        propuestaId: number,
        dto: ActualizarPropuestaIaDto,
    ) {
        setAccion({ propuestaId, tipo: 'editar' });
        setError('');

        try {
            await iageneracionService.actualizarPropuesta(
                generacionId,
                propuestaId,
                dto,
            );
            setPropuestaEditando(null);
            await cargar();
        } catch (errorAccion) {
            setError(
                mensajeErrorGeneracionIa(
                    errorAccion,
                    'No se pudo guardar la edición de la propuesta.',
                ),
            );
        } finally {
            propuestaInsertandoRef.current = null;
            setAccion(null);
        }
    }

    async function cambiarEstado(
        propuesta: PropuestaGeneracionIa,
        nuevoEstado: 'aceptar' | 'descartar',
    ) {
        const esAceptacion = nuevoEstado === 'aceptar';
        const confirmacion = esAceptacion
            ? '¿Aceptar esta propuesta? La acción no inserta la pregunta en el banco; esa operación se realizará en T12.'
            : '¿Descartar esta propuesta? No se creará ni modificará ninguna pregunta del banco.';

        if (!window.confirm(confirmacion)) return;

        setAccion({ propuestaId: propuesta.propuesta_id, tipo: nuevoEstado });
        setError('');

        try {
            if (esAceptacion) {
                await iageneracionService.aceptarPropuesta(
                    generacionId,
                    propuesta.propuesta_id,
                );
            } else {
                await iageneracionService.descartarPropuesta(
                    generacionId,
                    propuesta.propuesta_id,
                );
            }

            await cargar();
        } catch (errorAccion) {
            setError(
                mensajeErrorGeneracionIa(
                    errorAccion,
                    `No se pudo ${esAceptacion ? 'aceptar' : 'descartar'} la propuesta.`,
                ),
            );
        } finally {
            setAccion(null);
        }
    }

    async function insertar(propuesta: PropuestaGeneracionIa) {
        if (
            propuesta.estado !== 'aceptada' ||
            propuesta.pregunta_id !== null ||
            propuestaInsertandoRef.current === propuesta.propuesta_id
        ) {
            return;
        }

        if (
            !window.confirm(
                '¿Insertar esta propuesta aceptada en el banco de preguntas?',
            )
        ) {
            return;
        }

        propuestaInsertandoRef.current = propuesta.propuesta_id;
        setAccion({ propuestaId: propuesta.propuesta_id, tipo: 'insertar' });
        setError('');

        try {
            const resultado = await iageneracionService.insertarPropuesta(
                generacionId,
                propuesta.propuesta_id,
            );
            setGeneracion((actual) =>
                actual
                    ? {
                          ...actual,
                          propuestas: actual.propuestas.map((item) =>
                              item.propuesta_id === resultado.propuesta_id
                                  ? {
                                        ...item,
                                        pregunta_id: resultado.pregunta_id,
                                    }
                                  : item,
                          ),
                      }
                    : actual,
            );
            await cargar();
        } catch (errorAccion) {
            setError(
                mensajeErrorGeneracionIa(
                    errorAccion,
                    'No se pudo insertar la propuesta en el banco.',
                ),
            );
        } finally {
            setAccion(null);
        }
    }

    if (cargando) {
        return (
            <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"
            >
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Cargando generación y propuestas...
            </div>
        );
    }

    if (!generacion) {
        return (
            <section
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                    <div className="flex-1">
                        <p>{error || 'No se encontró la generación.'}</p>
                        <button
                            type="button"
                            onClick={() => void cargar(true)}
                            className="mt-3 font-medium underline"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
            <Card className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium text-violet-700">
                            Revisión de propuestas IA
                        </p>
                        <h1 className="mt-1 text-xl font-semibold text-slate-900">
                            Generación #{generacion.generacion_id}
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {generacion.materia ?? 'Materia no disponible'}
                            {generacion.tema
                                ? ` · ${generacion.tema}`
                                : ''}
                            {generacion.tipo_respuesta
                                ? ` · ${infoTipoPreguntaFormulario(generacion.tipo_respuesta).label}`
                                : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void cargar()}
                        disabled={actualizando}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw
                            className={`size-4 ${actualizando ? 'animate-spin' : ''}`}
                            aria-hidden="true"
                        />
                        Actualizar
                    </button>
                </div>

                <dl className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
                    <div>
                        <dt className="text-xs text-slate-500">Estado</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-800">
                            {generacion.estado}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-slate-500">
                            Propuestas generadas
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-slate-800">
                            {generacion.cantidad_generada ?? 0}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-slate-500">Dificultad</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-800">
                            {generacion.dificultad
                                ? ETIQUETAS_DIFICULTAD[
                                      generacion.dificultad
                                  ]
                                : 'No disponible'}
                        </dd>
                    </div>
                </dl>

                <section aria-labelledby="materiales-titulo">
                    <h2
                        id="materiales-titulo"
                        className="text-xs font-semibold text-slate-700"
                    >
                        Materiales utilizados
                    </h2>
                    {generacion.materiales.length === 0 ? (
                        <p className="mt-1 text-sm text-slate-500">
                            Esta generación no utilizó materiales.
                        </p>
                    ) : (
                        <ul className="mt-2 flex flex-wrap gap-2">
                            {generacion.materiales.map((material) => (
                                <li
                                    key={material.material_id}
                                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                                >
                                    {material.titulo}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </Card>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                Aceptar no inserta automáticamente la propuesta. Las propuestas
                aceptadas se agregan al banco únicamente cuando eliges
                «Insertar en el banco».
            </div>

            {error && (
                <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
            )}

            <section aria-labelledby="propuestas-titulo" className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h2
                        id="propuestas-titulo"
                        className="text-base font-semibold text-slate-900"
                    >
                        Propuestas
                    </h2>
                    <span className="text-xs text-slate-500">
                        {generacion.propuestas.length} en total
                    </span>
                </div>

                {generacion.propuestas.length === 0 ? (
                    <Card className="p-5 text-sm text-slate-600">
                        No hay propuestas para revisar. El estado de la
                        generación es {generacion.estado}.
                    </Card>
                ) : (
                    generacion.propuestas.map((propuesta) => (
                        <PropuestaCard
                            key={propuesta.propuesta_id}
                            generacionId={generacion.generacion_id}
                            propuesta={propuesta}
                            guardando={
                                accion?.propuestaId === propuesta.propuesta_id
                            }
                            editando={
                                propuestaEditando === propuesta.propuesta_id
                            }
                            onEditar={() =>
                                setPropuestaEditando(propuesta.propuesta_id)
                            }
                            onCancelarEdicion={() =>
                                setPropuestaEditando(null)
                            }
                            onGuardar={(dto) =>
                                void guardar(propuesta.propuesta_id, dto)
                            }
                            onAceptar={() =>
                                void cambiarEstado(propuesta, 'aceptar')
                            }
                            onDescartar={() =>
                                void cambiarEstado(propuesta, 'descartar')
                            }
                            onInsertar={() => void insertar(propuesta)}
                        />
                    ))
                )}
            </section>

            <div className="flex justify-end">
                <LinkButton href={ROUTES.docente.preguntas} variante="secundaria">
                    Volver al banco de preguntas
                </LinkButton>
            </div>
        </main>
    );
}
