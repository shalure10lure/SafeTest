'use client';

import Link from 'next/link';

import RoleGuard from '@/features/auth/components/RoleGuard';
import { MateriaList } from '@/features/materias/components/MateriaList';
import { useMaterias } from '@/features/materias/hooks/useMaterias';

export default function MisMateriasPage() {
    const { materias, isLoading, error } = useMaterias();

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto max-w-4xl space-y-4 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Mis materias</h1>
                        <p className="text-sm text-slate-500">
                            Estas materias solo son visibles para ti.
                        </p>
                    </div>
                    <Link
                        href="/docente/materias/nueva"
                        className="rounded-md bg-violet-600 px-4 py-2 text-sm text-white"
                    >
                        + Nueva materia
                    </Link>
                </div>

                {isLoading && <p className="text-sm">Cargando materias...</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}
                {!isLoading && !error && <MateriaList materias={materias} />}
            </main>
        </RoleGuard>
    );
}