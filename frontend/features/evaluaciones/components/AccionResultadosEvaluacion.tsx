'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { calificacionesService } from '../services/calificaciones.service';

interface Props {
  examenId: number;
  estado: string;
}

/**
 * Se integra en la columna ACCIONES de "Mis evaluaciones".
 * El estado 'publicado' indica que el examen se habilitó para rendir.
 * Solo mostramos "Ver resultados" si ya existe alguna entrega.
 */
export default function AccionResultadosEvaluacion({ examenId, estado }: Props) {
  const [entregas, setEntregas] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (estado !== 'publicado') return;
    let activo = true;
    calificacionesService.resumen(examenId)
      .then((resumen) => {
        if (activo) {
          setEntregas(resumen.estudiantes.filter((e) => e.estado === 'enviada' || e.estado === 'corregida').length);
        }
      })
      .catch(() => { if (activo) setError(true); });
    return () => { activo = false; };
  }, [examenId, estado]);

  if (estado !== 'publicado') return null;
  if (entregas === null && !error) {
    return <span className="inline-block text-xs text-slate-400">Consultando entregas…</span>;
  }
  if (entregas === 0) {
    return <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500">Sin entregas aún</span>;
  }
  return (
    <Link
      href={`/docente/evaluaciones/${examenId}/calificaciones`}
      className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-200"
      title={entregas === null ? 'Consultar las calificaciones' : `${entregas} entregas para revisar`}
    >
      Ver resultados <span aria-hidden="true">↗</span>{entregas !== null && <span>({entregas})</span>}
    </Link>
  );
}
