import { Badge, type Tono } from '@/components/ui/Card';
import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';
import type { EstadoExamen, Evaluacion } from '../types';

const ESTADOS: Record<EstadoExamen, { label: string; tono: Tono }> = {
    publicado: { label: 'Publicada', tono: 'violet' },
    borrador: { label: 'Borrador', tono: 'slate' },
};

const MESES = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** "2026-09-20T12:00:00Z" -> "20 sep 2026, 08:00" (hora local del navegador). */
function formatearFecha(iso: string | null): string {
    if (!iso) return '—';

    const fecha = new Date(iso);
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');

    return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}, ${hora}:${minutos}`;
}

const ENCABEZADOS = [
    { texto: 'Evaluación', centrado: false },
    { texto: 'Materia', centrado: false },
    { texto: 'Paralelo', centrado: false },
    { texto: 'Estado', centrado: false },
    { texto: 'Fecha', centrado: false },
    { texto: 'Preguntas', centrado: true },
    { texto: 'Inscritos', centrado: true },
    { texto: 'Acciones', centrado: false },
];

export default function EvaluacionesTabla({
    evaluaciones,
}: {
    evaluaciones: Evaluacion[];
}) {
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-215 text-left text-sm">
                <thead>
                    <tr>
                        {ENCABEZADOS.map((columna) => (
                            <th
                                key={columna.texto}
                                scope="col"
                                className={`px-4 py-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase ${columna.centrado ? 'text-center' : ''
                                    }`}
                            >
                                {columna.texto}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {evaluaciones.map((evaluacion) => {
                        const estado = ESTADOS[evaluacion.estado];

                        return (
                            <tr key={evaluacion.examen_id} className="border-t border-slate-100">
                                <td className="px-4 py-3.5 font-medium text-slate-900">
                                    {evaluacion.titulo ?? 'Sin título'}
                                </td>

                                <td className="px-4 py-3.5 text-xs text-slate-500">
                                    {evaluacion.materia?.nombre ?? '—'}
                                </td>

                                <td className="px-4 py-3.5">
                                    <div className="flex gap-1">
                                        {evaluacion.paralelos.map((paralelo) => (
                                            <span
                                                key={paralelo.paralelo_id}
                                                className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700"
                                            >
                                                {paralelo.nombre_paralelo}
                                            </span>
                                        ))}
                                    </div>
                                </td>

                                <td className="px-4 py-3.5">
                                    <Badge tono={estado.tono}>{estado.label}</Badge>
                                </td>

                                <td className="px-4 py-3.5 text-xs whitespace-nowrap text-slate-500">
                                    {formatearFecha(evaluacion.fecha)}
                                </td>

                                <td className="px-4 py-3.5 text-center text-slate-600 tabular-nums">
                                    {evaluacion.total_preguntas}
                                </td>

                                <td className="px-4 py-3.5 text-center text-slate-600 tabular-nums">
                                    {evaluacion.total_inscritos > 0
                                        ? evaluacion.total_inscritos
                                        : '—'}
                                </td>

                                <td className="px-4 py-3.5">
                                    <div className="flex gap-2">
                                        <LinkButton
                                            href={ROUTES.docente.evaluacionEditar(
                                                evaluacion.examen_id,
                                            )}
                                            variante="suave"
                                            disponible={evaluacion.estado === 'borrador'}
                                            className="h-8 px-3 text-xs"
                                        >
                                            Editar
                                        </LinkButton>

                                        {evaluacion.estado === 'borrador' && (
                                            <LinkButton
                                                href={ROUTES.docente.evaluaciones}
                                                variante="primaria"
                                                disponible={false}
                                                className="h-8 px-3 text-xs"
                                            >
                                                Publicar
                                            </LinkButton>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}