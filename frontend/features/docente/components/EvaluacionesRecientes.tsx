import { Badge, Card, CardHeader, type Tono } from '@/components/ui/Card';
import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';
import type { EstadoEvaluacion, EvaluacionResumen } from '../types';

const ESTADOS: Record<EstadoEvaluacion, { label: string; tono: Tono }> = {
    disponible: { label: 'Disponible', tono: 'blue' },
    borrador: { label: 'Borrador', tono: 'slate' },
    pendiente: { label: 'Pendiente', tono: 'amber' },
};

const MESES = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** "2026-09-20" -> "20 sep" (sin pasar por Date para evitar desfases de zona horaria). */
function formatearFecha(iso: string): string {
    const [, mes, dia] = iso.split('-').map(Number);
    return `${dia} ${MESES[mes - 1] ?? ''}`.trim();
}

export default function EvaluacionesRecientes({
    evaluaciones,
}: {
    evaluaciones: EvaluacionResumen[];
}) {
    return (
        <Card className="p-5">
            <CardHeader
                titulo="Mis evaluaciones"
                descripcion="Evaluaciones activas y en preparación"
                accion={
                    <LinkButton
                        href={ROUTES.docente.evaluaciones}
                        disponible={false}
                        className="h-8 px-3 text-xs"
                    >
                        Ver todas
                    </LinkButton>
                }
            />

            {evaluaciones.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                    Aún no tienes evaluaciones. Crea la primera para empezar.
                </p>
            ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                    {evaluaciones.map((evaluacion) => {
                        const estado = ESTADOS[evaluacion.estado];

                        return (
                            <li
                                key={evaluacion.id}
                                className="flex items-center justify-between gap-4 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                        {evaluacion.titulo}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {formatearFecha(evaluacion.fecha)} ·{' '}
                                        {evaluacion.estudiantes} estudiantes
                                    </p>
                                </div>

                                <Badge tono={estado.tono}>{estado.label}</Badge>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}