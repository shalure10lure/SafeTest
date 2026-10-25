import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { Evaluacion } from '../types';

function Contador({
    etiqueta,
    valor,
    color,
}: {
    etiqueta: string;
    valor: number;
    color: string;
}) {
    return (
        <Card className="p-4">
            <p className="text-xs text-slate-500">{etiqueta}</p>
            <p className={cn('mt-1 text-3xl font-bold tabular-nums', color)}>
                {valor}
            </p>
        </Card>
    );
}

export default function ResumenEvaluaciones({
    evaluaciones,
}: {
    evaluaciones: Evaluacion[];
}) {
    const publicadas = evaluaciones.filter((e) => e.estado === 'publicado').length;
    const borradores = evaluaciones.filter((e) => e.estado === 'borrador').length;

    // Completadas y Pendientes se agregan cuando exista el flujo de publicar.
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Contador etiqueta="Publicadas" valor={publicadas} color="text-violet-600" />
            <Contador etiqueta="Borradores" valor={borradores} color="text-slate-500" />
        </div>
    );
}