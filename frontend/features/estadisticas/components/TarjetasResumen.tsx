import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { formatoNumero } from '../formato';
import type { PanelEstadisticas } from '../types';

function Tarjeta({
    etiqueta,
    valor,
    sufijo,
    color,
}: {
    etiqueta: string;
    valor: string;
    sufijo?: string;
    color: string;
}) {
    return (
        <Card className="p-4">
            <p className="text-xs font-medium text-slate-500">{etiqueta}</p>
            <p className={cn('mt-1 text-3xl font-bold tabular-nums', color)}>
                {valor}
                {sufijo && (
                    <span className="text-base font-normal text-slate-400">
                        {sufijo}
                    </span>
                )}
            </p>
        </Card>
    );
}

/** Promedio, nota máxima, nota mínima y cantidad de estudiantes. */
export default function TarjetasResumen({
    resumen,
}: {
    resumen: PanelEstadisticas['resumen'];
}) {
    const hayNotas = resumen.total_rendiciones > 0;

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tarjeta
                etiqueta="Promedio"
                valor={formatoNumero(resumen.promedio)}
                sufijo={hayNotas ? '/100' : undefined}
                color="text-violet-600"
            />
            <Tarjeta
                etiqueta="Nota máxima"
                valor={formatoNumero(resumen.nota_maxima)}
                sufijo={hayNotas ? '/100' : undefined}
                color="text-emerald-600"
            />
            <Tarjeta
                etiqueta="Nota mínima"
                valor={formatoNumero(resumen.nota_minima)}
                sufijo={hayNotas ? '/100' : undefined}
                color="text-red-600"
            />
            <Tarjeta
                etiqueta="Cantidad de estudiantes"
                valor={String(resumen.total_estudiantes)}
                color="text-blue-600"
            />
        </div>
    );
}
