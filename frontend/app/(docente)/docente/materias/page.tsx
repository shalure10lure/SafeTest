'use client';

import Link from 'next/link';

import Alerta from '@/components/ui/Alerta';
import RoleGuard from '@/features/auth/components/RoleGuard';
import { MateriaList } from '@/features/materias/components/MateriaList';
import { useMaterias } from '@/features/materias/hooks/useMaterias';

export default function MisMateriasPage() {
    const { materias, isLoading, error, refetch } = useMaterias();

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
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

                {isLoading && <p className="text-sm text-slate-500">Cargando materias...</p>}
                {error && (
                    <Alerta
                        tono="error"
                        titulo="No se pudieron cargar las materias"
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
                    <MateriaList materias={materias} onCambio={() => void refetch()} />
                )}
            </main>
        </RoleGuard>
    );
}
