'use client';

import Link from 'next/link';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    FileText,
    Loader2,
    Trash2,
} from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/Card';
import { ROUTES } from '@/constants/routes';

import {
    explicacionExtraccion,
    formatearFecha,
    formatearTamano,
    formatoDeArchivo,
} from '../formato';
import type { AccionMaterial } from '../hooks/useMaterialDetalle';
import type {
    EstadoExtraccionDetalle,
    Material,
} from '../types';
import AutorizacionMaterial from './AutorizacionMaterial';
import {
    BadgeAutorizacion,
    BadgeEstado,
    BadgeExtraccion,
} from './EstadoMaterial';

interface DetalleMaterialProps {
    material: Material;
    extraccion: EstadoExtraccionDetalle | null;
    accion: AccionMaterial;
    errorAccion: string | null;
    codigoErrorAccion: number | null;
    origenErrorAccion: 'autorizacion' | 'eliminacion' | null;
    mensaje: string | null;
    onLimpiarMensajes: () => void;
    onAutorizar: () => void;
    onRevocar: () => void;
    onEliminar: () => void;
}

export default function DetalleMaterial({
    material,
    extraccion,
    accion,
    errorAccion,
    codigoErrorAccion,
    origenErrorAccion,
    mensaje,
    onLimpiarMensajes,
    onAutorizar,
    onRevocar,
    onEliminar,
}: DetalleMaterialProps) {
    const formato = formatoDeArchivo(
        material.nombre_archivo,
        material.mime_type,
    );
    const cargandoAutorizacion =
        accion === 'autorizando' || accion === 'revocando';
    const eliminando = accion === 'eliminando';
    const estadoExtraccion =
        extraccion?.estado ?? material.estado_extraccion.estado;
    const caracteres =
        extraccion?.caracteres ?? material.estado_extraccion.caracteres;
    const errorConflicto =
        origenErrorAccion === 'eliminacion' && codigoErrorAccion === 409;

    return (
        <div className="space-y-4">
            <Link
                href={ROUTES.docente.materiales}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-violet-700"
            >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Volver a materiales
            </Link>

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold break-words text-slate-900">
                        {material.titulo}
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        {material.materia ?? 'Materia no disponible'}
                        {material.tema ? ` · ${material.tema}` : ''}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <BadgeExtraccion estado={estadoExtraccion} />
                        <BadgeAutorizacion
                            autorizado={material.autorizado_ia}
                        />
                        <BadgeEstado activo={material.activo} />
                    </div>
                </div>
            </div>

            {mensaje && (
                <div
                    role="status"
                    className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                    <p className="flex items-start gap-2">
                        <CheckCircle2
                            className="mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                        />
                        {mensaje}
                    </p>

                    <button
                        type="button"
                        onClick={onLimpiarMensajes}
                        className="shrink-0 font-medium underline hover:text-emerald-950"
                    >
                        Cerrar
                    </button>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="p-5 lg:col-span-2">
                    <CardHeader
                        titulo="Información del archivo"
                        descripcion="Datos del documento y resultado del procesamiento."
                    />

                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                        <div className="min-w-0">
                            <dt className="text-slate-500">Archivo</dt>
                            <dd
                                className="mt-0.5 truncate font-medium text-slate-800"
                                title={material.nombre_archivo}
                            >
                                {material.nombre_archivo}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">Formato</dt>
                            <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-800">
                                <FileText
                                    className="size-4 text-slate-400"
                                    aria-hidden="true"
                                />
                                {formato ?? 'Desconocido'}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">Tamaño</dt>
                            <dd className="mt-0.5 font-medium text-slate-800">
                                {formatearTamano(material.tamano_bytes)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">
                                Fecha de subida
                            </dt>
                            <dd className="mt-0.5 font-medium text-slate-800">
                                {formatearFecha(material.fecha_subida)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">Materia</dt>
                            <dd className="mt-0.5 font-medium text-slate-800">
                                {material.materia ?? 'No disponible'}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">Tema</dt>
                            <dd className="mt-0.5 font-medium text-slate-800">
                                {material.tema ?? 'Sin tema específico'}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">
                                Texto extraído
                            </dt>
                            <dd className="mt-0.5 font-medium text-slate-800">
                                {caracteres.toLocaleString('es-EC')} caracteres
                            </dd>
                        </div>

                        <div>
                            <dt className="text-slate-500">
                                Identificador
                            </dt>
                            <dd className="mt-0.5 font-medium text-slate-800">
                                #{material.material_id}
                            </dd>
                        </div>
                    </dl>

                    <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                        {explicacionExtraccion(estadoExtraccion)}
                    </p>
                </Card>

                <AutorizacionMaterial
                    material={material}
                    extraccion={extraccion}
                    cargando={cargandoAutorizacion}
                    error={
                        origenErrorAccion === 'autorizacion'
                            ? errorAccion
                            : null
                    }
                    onAutorizar={onAutorizar}
                    onRevocar={onRevocar}
                />

                <Card className="border-red-200 p-5 lg:col-span-3">
                    <CardHeader
                        titulo="Eliminar material"
                        descripcion="Solo puedes eliminar materiales que nunca se hayan usado para generar preguntas."
                    />

                    {origenErrorAccion === 'eliminacion' &&
                        errorAccion &&
                        (errorConflicto ? (
                            <div
                                role="alert"
                                className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                            >
                                <AlertTriangle
                                    className="mt-0.5 size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="font-medium">
                                        No se puede eliminar este material
                                    </p>
                                    <p className="mt-1">{errorAccion}</p>
                                    <p className="mt-1 text-xs">
                                        Si ya no deseas usarlo, revoca su
                                        autorización para IA. El material se
                                        conserva como parte del historial.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p
                                role="alert"
                                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                            >
                                {errorAccion}
                            </p>
                        ))}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <p className="max-w-xl text-xs text-slate-500">
                            Esta acción no se puede deshacer. Si el material ya
                            se usó en una generación de IA, el sistema impedirá
                            eliminarlo para no romper el historial.
                        </p>

                        <button
                            type="button"
                            onClick={onEliminar}
                            disabled={accion !== null}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {eliminando ? (
                                <>
                                    <Loader2
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                    Eliminando...
                                </>
                            ) : (
                                <>
                                    <Trash2
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Eliminar material
                                </>
                            )}
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
