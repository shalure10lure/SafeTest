'use client';

import { useParams } from 'next/navigation';
import RevisionCalificaciones from '@/features/evaluaciones/components/RevisionCalificaciones';

export default function ResultadosEvaluacionPage() {
  const params = useParams<{ id: string }>();
  const examenId = Number(params.id);

  if (!Number.isSafeInteger(examenId) || examenId <= 0) {
    return <p role="alert" className="p-6 text-sm text-red-700">La evaluación no tiene un identificador válido.</p>;
  }
  return <RevisionCalificaciones examenId={examenId} />;
}
