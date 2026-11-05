'use client';

import Link from 'next/link';
import { ArrowRight, FileText, RotateCw } from 'lucide-react';

import { clasesTile } from '@/components/ui/Card';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

import {
    formatearFecha,
    formatearTamano,
    formatoDeArchivo,
} from '../formato';
import type { Material } from '../types';
import {
    BadgeAutorizacion,
    BadgeEstado,
    BadgeExtraccion,
    tonoFormato,
} from './EstadoMaterial';

interface MaterialListProps {
    materiales: Material[];
    isLoading: boolean;
    error: string | null;
    hayFiltros: boolean;
    onLimpiarFiltros: () => void;
    onReintentar: () => void;
}

function MaterialCard({ material }: { material: Material }) {
    const formato = formatoDeArchivo(
        material.nombre_archivo,
        material.mime_type,
    );
    const caracteres = material.estado_extraccion.caracteres;

    return (
        <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3">
                <span
                    className={cn(
                        'flex size-11 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-bold',
                        clasesTile(tonoFormato(formato)),
                    )}
                    aria-hidden="true"
                >
                    {formato ?? <FileText className="size-4" />}
                </span>

                <div className="min-w-0 flex-1">
                    <h3
                        className="line-clamp-2 font-semibold text-slate-900"
                        title={material.titulo}
                    >
                        {material.titulo}
                    </h3>

                    <p
                        className="mt-0.5 line-clamp-1 text-xs text-slate-500"
                        title={[
                            material.materia,
                            material.tema,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    >
                        {material.materia ?? 'Materia no disponible'}
                        {material.tema ? ` · ${material.tema}` : ''}
                    </p>
                </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div className="min-w-0">
                    <dt className="text-slate-500">Archivo</dt>
                    <dd
                        className="truncate font-medium text-slate-700"
                        title={material.nombre_archivo}
                    >
                        {material.nombre_archivo}
                    </dd>
                </div>

                <div>
                    <dt className="text-slate-500">Tamaño</dt>
                    <dd className="font-medium text-slate-700">
                        {formatearTamano(material.tamano_bytes)}
                    </dd>
                </div>

                <div>
                    <dt className="text-slate-500">Subido</dt>
                    <dd className="font-medium text-slate-700">
                        {formatearFecha(material.fecha_subida)}
                    </dd>
                </div>

                <div>
                    <dt className="text-slate-500">Texto</dt>
                    <dd className="font-medium text-slate-700">
                        {caracteres.toLocaleString('es-EC')} caracteres
                    </dd>
                </div>
            </dl>

            <div className="mt-3 flex flex-wrap gap-1.5">
                <BadgeExtraccion
                    estado={material.estado_extraccion.estado}
                />
                <BadgeAutorizacion autorizado={material.autorizado_ia} />
                {!material.activo && <BadgeEstado activo={false} />}
            </div>

            <Link
                href={ROUTES.docente.materialDetalle(material.material_id)}
                className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
                Ver detalle
                <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
        </article>
    );
}

export default function MaterialList({
    materiales,
    isLoading,
    error,
    hayFiltros,
    onLimpiarFiltros,
    onReintentar,
}: MaterialListProps) {
    if (isLoading && materiales.length === 0) {
        return (
            <div
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                aria-busy="true"
            >
                <span className="sr-only">Cargando materiales...</span>

                {[0, 1, 2].map((indice) => (
                    <div
                        key={indice}
                        className="h-60 animate-pulse rounded-xl border border-slate-200 bg-white"
                    />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div
                role="alert"
                className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
                <p>{error}</p>

                <button
                    type="button"
                    onClick={onReintentar}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                    <RotateCw className="size-4" aria-hidden="true" />
                    Reintentar
                </button>
            </div>
        );
    }

    if (materiales.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="font-medium text-slate-700">
                    {hayFiltros
                        ? 'Ningún material coincide con los filtros.'
                        : 'Todavía no has subido materiales.'}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                    {hayFiltros
                        ? 'Prueba con otros criterios o limpia los filtros.'
                        : 'Sube un PDF, TXT o DOCX para usarlo en la generación de preguntas.'}
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
                        href={ROUTES.docente.materialNuevo}
                        className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                        Subir material
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'grid gap-3 sm:grid-cols-2 xl:grid-cols-3',
                isLoading && 'opacity-60',
            )}
            aria-busy={isLoading}
        >
            {materiales.map((material) => (
                <MaterialCard
                    key={material.material_id}
                    material={material}
                />
            ))}
        </div>
    );
}
