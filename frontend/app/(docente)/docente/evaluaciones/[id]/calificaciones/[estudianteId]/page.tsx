'use client';

import { useParams } from 'next/navigation';
import RevisionEstudiante from '@/features/evaluaciones/components/RevisionEstudiante';

export default function RevisionResultadoEstudiantePage() {
  const params = useParams<{ id: string; estudianteId: string }>();
  const examenId = Number(params.id);
  const estudianteId = Number(params.estudianteId);

  if (!Number.isSafeInteger(examenId) || examenId <= 0 ||
      !Number.isSafeInteger(estudianteId) || estudianteId <= 0) {
    return <p role="alert" className="p-6 text-sm text-red-700">El identificador de la evaluación o del estudiante es inválido.</p>;
  }
  return <RevisionEstudiante examenId={examenId} estudianteId={estudianteId} />;
}
