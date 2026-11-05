'use client';

import { FileText, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/Card';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

import {
    BadgeEstado,
    BadgeExtraccion,
} from '../../materiales/components/EstadoMaterial';
import type { Material } from '../../materiales/types';
import { esMaterialSeleccionableParaIa } from '../elegibilidad';
import { MAX_MATERIALES_CONTEXTO } from '../validacion';

interface SelectorMaterialesIaProps {
    materiales: Material[];
    isLoading: boolean;
    error: string | null;
    seleccionados: number[];
    deshabilitado: boolean;
    errorValidacion?: string;
    onCambiar: (ids: number[]) => void;
    onReintentar: () => void;
}

function MotivoNoSeleccionable({ material }: { material: Material }) {
    if (!material.activo) {
        return <span>El material está inactivo.</span>;
    }

    if (!material.autorizado_ia) {
        return (
            <span>
                Autorízalo para IA desde Materiales académicos para poder
                usarlo como contexto.
            </span>
        );
    }

    return (
        <span>
            Todavía no tiene texto extraído. Espera a que termine la
            extracción.
        </span>
    );
}

export default function SelectorMaterialesIa({
    materiales,
    isLoading,
    error,
    seleccionados,
    deshabilitado,
    errorValidacion,
    onCambiar,
    onReintentar,
}: SelectorMaterialesIaProps) {
    const limiteAlcanzado =
        seleccionados.length >= MAX_MATERIALES_CONTEXTO;

    function alternar(materialId: number) {
        if (seleccionados.includes(materialId)) {
            onCambiar(seleccionados.filter((id) => id !== materialId));
            return;
        }

        if (limiteAlcanzado) return;

        onCambiar([...seleccionados, materialId]);
    }

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                        Documentos fuente
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Selecciona al menos un material autorizado y con
                        extracción completada. La IA basará las preguntas en
                        el contenido de estos documentos.
                    </p>
                </div>

                <span
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                    aria-live="polite"
                >
                    {seleccionados.length} de {MAX_MATERIALES_CONTEXTO}
                </span>
            </div>

            {errorValidacion && (
                <p
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700"
                >
                    {errorValidacion}
                </p>
            )}

            {error && (
                <div
                    role="alert"
                    className="mt-4 flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    <p>{error}</p>
                    <p className="text-xs">
                        Cuando la carga vuelva a estar disponible, selecciona
                        un material autorizado para continuar.
                    </p>
                    <button
                        type="button"
                        onClick={onReintentar}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        Reintentar
                    </button>
                </div>
            )}

            {isLoading && materiales.length === 0 ? (
                <div className="mt-4 space-y-2" aria-busy="true">
                    <span className="sr-only">Cargando materiales...</span>
                    {[0, 1].map((indice) => (
                        <div
                            key={indice}
                            className="h-16 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
                        />
                    ))}
                </div>
            ) : materiales.length === 0 ? (
                error ? null : (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <FileText
                        className="mx-auto size-6 text-slate-400"
                        aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                        Todavía no tienes materiales académicos.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Para generar preguntas basadas en documentos, primero
                        sube un material y espera a que termine la extracción
                        del texto.
                    </p>
                    <Link
                        href={ROUTES.docente.materialNuevo}
                        className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                        Subir material
                    </Link>
                </div>
                )
            ) : (
                <ul className="mt-4 space-y-2">
                    {materiales.map((material) => {
                        const seleccionable =
                            esMaterialSeleccionableParaIa(material);
                        const seleccionado = seleccionados.includes(
                            material.material_id,
                        );
                        const checkboxDeshabilitado =
                            deshabilitado ||
                            !seleccionable ||
                            (!seleccionado && limiteAlcanzado);

                        return (
                            <li key={material.material_id}>
                                <label
                                    className={cn(
                                        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                                        seleccionado
                                            ? 'border-violet-300 bg-violet-50/60'
                                            : 'border-slate-200 bg-white',
                                        seleccionable
                                            ? 'cursor-pointer hover:bg-slate-50'
                                            : 'cursor-not-allowed bg-slate-50',
                                        seleccionado && 'hover:bg-violet-50',
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={seleccionado}
                                        disabled={checkboxDeshabilitado}
                                        onChange={() =>
                                            alternar(material.material_id)
                                        }
                                        className="mt-0.5 size-4 shrink-0 accent-violet-600 disabled:cursor-not-allowed"
                                    />

                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-1.5">
                                            <span
                                                className="truncate text-sm font-medium text-slate-900"
                                                title={material.titulo}
                                            >
                                                {material.titulo}
                                            </span>
                                            <BadgeExtraccion
                                                estado={
                                                    material.estado_extraccion
                                                        .estado
                                                }
                                            />
                                            {material.autorizado_ia ? (
                                                <Badge tono="violet">
                                                    Autorizado para IA
                                                </Badge>
                                            ) : (
                                                <Badge tono="slate">
                                                    No autorizado para IA
                                                </Badge>
                                            )}
                                            {!material.activo && (
                                                <BadgeEstado activo={false} />
                                            )}
                                        </span>

                                        <span className="mt-0.5 block text-xs text-slate-500">
                                            {material.materia ??
                                                'Materia no disponible'}
                                            {material.tema
                                                ? ` · ${material.tema}`
                                                : ''}
                                            {' · '}
                                            {material.estado_extraccion.caracteres.toLocaleString(
                                                'es-EC',
                                            )}{' '}
                                            caracteres
                                        </span>

                                        {!seleccionable && (
                                            <span className="mt-1 block text-xs text-amber-700">
                                                <MotivoNoSeleccionable
                                                    material={material}
                                                />
                                            </span>
                                        )}

                                        {!seleccionado &&
                                            seleccionable &&
                                            limiteAlcanzado && (
                                                <span className="mt-1 block text-xs text-slate-500">
                                                    Quita un material para
                                                    seleccionar otro.
                                                </span>
                                            )}
                                    </span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            )}

            {materiales.length > 0 &&
                !materiales.some(esMaterialSeleccionableParaIa) && (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                        Ningún material está disponible para IA todavía. Puedes
                        autorizar un material y esperar a que
                        termine su extracción de texto.
                    </p>
                )}

            {materiales.some(
                (material) => material.activo && !material.autorizado_ia,
            ) && (
                <p className="mt-3 text-xs text-slate-500">
                    Para usar un material no autorizado, actívalo primero en{' '}
                    <Link
                        href={ROUTES.docente.materiales}
                        className="font-medium text-violet-700 underline"
                    >
                        Materiales académicos
                    </Link>
                    .
                </p>
            )}
        </section>
    );
}
