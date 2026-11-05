'use client';

import { ShieldCheck, ShieldOff, Sparkles } from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/Card';

import { formatearFecha } from '../formato';
import { puedeAutorizarParaIa } from '../elegibilidad';
import type {
    EstadoExtraccionDetalle,
    Material,
} from '../types';
import { BadgeAutorizacion } from './EstadoMaterial';

interface AutorizacionMaterialProps {
    material: Material;
    extraccion: EstadoExtraccionDetalle | null;
    cargando: boolean;
    error: string | null;
    onAutorizar: () => void;
    onRevocar: () => void;
}

export default function AutorizacionMaterial({
    material,
    extraccion,
    cargando,
    error,
    onAutorizar,
    onRevocar,
}: AutorizacionMaterialProps) {
    // `disponible_para_ia` exige que el material ya esté autorizado, así que
    // no sirve para decidir si se puede autorizar.
    const puedeAutorizar = puedeAutorizarParaIa(material, extraccion);

    return (
        <Card className="p-5" aria-labelledby="autorizacion-ia">
            <CardHeader
                titulo="Uso del material en IA"
                descripcion="Controla si este documento puede usarse para generar preguntas."
            />

            <dl className="mt-4 space-y-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-slate-600">Estado actual</dt>
                    <dd>
                        <BadgeAutorizacion
                            autorizado={material.autorizado_ia}
                        />
                    </dd>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-slate-600">Autorizado desde</dt>
                    <dd className="font-medium text-slate-800">
                        {material.autorizado_ia
                            ? formatearFecha(material.autorizado_en)
                            : '—'}
                    </dd>
                </div>
            </dl>

            {material.activo && !material.autorizado_ia && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    El material está activo, pero eso no significa que esté
                    autorizado para IA. La autorización es una acción aparte que
                    solo tú puedes realizar.
                </p>
            )}

            {material.autorizado_ia ? (
                <button
                    type="button"
                    onClick={onRevocar}
                    disabled={cargando}
                    className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <ShieldOff className="size-4" aria-hidden="true" />
                    {cargando
                        ? 'Revocando autorización...'
                        : 'Revocar autorización para IA'}
                </button>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={onAutorizar}
                        disabled={cargando || !puedeAutorizar}
                        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <ShieldCheck className="size-4" aria-hidden="true" />
                        {cargando
                            ? 'Autorizando...'
                            : 'Autorizar para IA'}
                    </button>

                    {!puedeAutorizar && (
                        <p className="mt-2 text-xs text-slate-500">
                            {!material.activo
                                ? 'El material está inactivo, por lo que no puede autorizarse.'
                                : 'Este material no tiene texto extraído, así que no puede usarse en IA.'}
                        </p>
                    )}
                </>
            )}

            {error && (
                <p
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
            )}

            <p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <Sparkles
                    className="mt-0.5 size-3.5 shrink-0 text-violet-500"
                    aria-hidden="true"
                />
                Solo los materiales autorizados y con texto extraído se incluyen
                al generar preguntas con IA.
            </p>
        </Card>
    );
}
