'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RotateCw } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import RoleGuard from '@/features/auth/components/RoleGuard';
import DetalleMaterial from '@/features/materiales/components/DetalleMaterial';
import { useMaterialDetalle } from '@/features/materiales/hooks/useMaterialDetalle';

const BOTON_SECUNDARIO =
    'inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600';

export default function DetalleMaterialPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const id = Number(params.id);
    const idValido = Number.isSafeInteger(id) && id > 0;

    const {
        material,
        extraccion,
        isLoading,
        error,
        accion,
        errorAccion,
        codigoErrorAccion,
        origenErrorAccion,
        mensaje,
        cargar,
        autorizar,
        revocar,
        eliminar,
        limpiarMensajes,
    } = useMaterialDetalle(idValido ? id : null);

    async function eliminarMaterial() {
        const eliminado = await eliminar();

        if (eliminado) router.push(ROUTES.docente.materiales);
    }

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
                {!idValido ? (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
                    >
                        <p>El identificador del material no es válido.</p>

                        <Link
                            href={ROUTES.docente.materiales}
                            className={`${BOTON_SECUNDARIO} mt-3`}
                        >
                            Volver a materiales
                        </Link>
                    </div>
                ) : isLoading && !material ? (
                    <div className="space-y-4" aria-busy="true">
                        <span className="sr-only">Cargando material...</span>

                        <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />

                        <div className="grid gap-4 lg:grid-cols-3">
                            <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-2" />
                            <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
                        </div>
                    </div>
                ) : error ? (
                    <div
                        role="alert"
                        className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
                    >
                        <p>{error}</p>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => void cargar()}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                            >
                                <RotateCw
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Reintentar
                            </button>

                            <Link
                                href={ROUTES.docente.materiales}
                                className={BOTON_SECUNDARIO}
                            >
                                Volver a materiales
                            </Link>
                        </div>
                    </div>
                ) : !material ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                        <p className="font-medium text-slate-700">
                            No encontramos este material.
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Puede que se haya eliminado o que no pertenezca a tu
                            cuenta.
                        </p>

                        <Link
                            href={ROUTES.docente.materiales}
                            className={`${BOTON_SECUNDARIO} mt-4`}
                        >
                            Volver a materiales
                        </Link>
                    </div>
                ) : (
                    <DetalleMaterial
                        material={material}
                        extraccion={extraccion}
                        accion={accion}
                        errorAccion={errorAccion}
                        codigoErrorAccion={codigoErrorAccion}
                        origenErrorAccion={origenErrorAccion}
                        mensaje={mensaje}
                        onLimpiarMensajes={limpiarMensajes}
                        onAutorizar={autorizar}
                        onRevocar={revocar}
                        onEliminar={() => void eliminarMaterial()}
                    />
                )}
            </main>
        </RoleGuard>
    );
}
