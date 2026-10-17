'use client';

import Link from 'next/link';

import { useParalelos } from '@/features/paralelos/hooks/useParalelos';
import ParaleloList from '@/features/paralelos/components/ParaleloList';

export default function ParalelosPage() {
  const {
    paralelos,
    cargando,
    error,
  } = useParalelos();

  return (
    <main className="min-h-full space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-slate-500">
            SafeTest / Docente / Gestión académica
          </p>

          <h1 className="text-2xl font-semibold text-slate-900">
            Mis paralelos
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Administra los grupos asociados a tus materias y periodos.
          </p>
        </div>

        <Link
          href="/docente/paralelos/nuevo"
          className="rounded-lg bg-violet-700 px-4 py-3 text-sm font-medium text-white hover:bg-violet-800"
        >
          + Crear paralelo
        </Link>
      </div>

      <ParaleloList
        paralelos={paralelos}
        cargando={cargando}
        error={error}
      />
    </main>
  );
}