'use client';

import Link from 'next/link';

import RoleGuard from '@/features/auth/components/RoleGuard';
import { PeriodoList } from '@/features/periodos/components/PeriodoList';
import { usePeriodos } from '@/features/periodos/hooks/usePeriodos';

export default function MisPeriodosPage() {
    const { periodos, isLoading, error } = usePeriodos();

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto max-w-5xl space-y-4 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Mis periodos</h1>
                        <p className="text-sm text-slate-500">
                            Estos periodos académicos solo son visibles para ti.
                        </p>
                    </div>
                    <Link
                        href="/docente/periodos/nuevo"
                        className="rounded-md bg-violet-600 px-4 py-2 text-sm text-white"
                    >
                        + Nuevo periodo
                    </Link>
                </div>

                {isLoading && <p className="text-sm">Cargando periodos...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                {!isLoading && !error && <PeriodoList periodos={periodos} />}
            </main>
        </RoleGuard>
    );
}