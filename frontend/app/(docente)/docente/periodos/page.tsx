'use client';

import Link from 'next/link';

import Alerta from '@/components/ui/Alerta';
import { ROUTES } from '@/constants/routes';
import RoleGuard from '@/features/auth/components/RoleGuard';
import { PeriodoList } from '@/features/periodos/components/PeriodoList';
import { usePeriodos } from '@/features/periodos/hooks/usePeriodos';

export default function MisPeriodosPage() {
    const { periodos, isLoading, error, refetch } = usePeriodos();

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Mis periodos</h1>
                        <p className="text-sm text-slate-500">
                            Estos periodos académicos solo son visibles para ti.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/docente/periodos/nuevo"
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                            + Periodo simple
                        </Link>
                        <Link
                            href={ROUTES.docente.configurarPeriodo}
                            className="rounded-md bg-violet-600 px-4 py-2 text-sm text-white"
                            title="Crea el periodo, sus materias y paralelos en 3 pasos"
                        >
                            Configurar periodo completo
                        </Link>
                    </div>
                </div>

                {isLoading && <p className="text-sm text-slate-500">Cargando periodos...</p>}
                {error && (
                    <Alerta
                        tono="error"
                        titulo="No se pudieron cargar los periodos"
                        accion={
                            <button
                                type="button"
                                onClick={() => void refetch()}
                                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                                Reintentar
                            </button>
                        }
                    >
                        Revisa tu conexión e inténtalo de nuevo.
                    </Alerta>
                )}
                {!isLoading && !error && (
                    <PeriodoList periodos={periodos} onCambio={() => void refetch()} />
                )}
            </main>
        </RoleGuard>
    );
}
