'use client';

import { useParams } from 'next/navigation';

import ParaleloForm from '@/features/paralelos/components/ParalelosForm';

export default function EditarParaleloPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  if (!Number.isInteger(id) || id < 1) {
    return (
      <p className="p-6 text-sm text-red-600">
        El identificador del paralelo no es válido.
      </p>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Editar paralelo
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Modifica el nombre, la materia o el periodo académico.
        </p>
      </div>

      <ParaleloForm id={id} />
    </main>
  );
}