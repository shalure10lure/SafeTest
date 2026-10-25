import { Card, CardHeader, clasesTile, type Tono } from '@/components/ui/Card';
import LinkButton from '@/components/ui/LinkButton';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import type { TipoPregunta } from '../types';

const TIPOS: { clave: TipoPregunta; label: string; tono: Tono }[] = [
    { clave: 'seleccion_multiple', label: 'Selección múltiple', tono: 'blue' },
    { clave: 'verdadero_falso', label: 'Verdadero / Falso', tono: 'violet' },
    { clave: 'respuesta_abierta', label: 'Respuesta abierta', tono: 'emerald' },
    { clave: 'respuesta_numerica', label: 'Respuesta numérica', tono: 'amber' },
];

export default function BancoPreguntasResumen({
    preguntasPorTipo,
}: {
    preguntasPorTipo: Record<TipoPregunta, number>;
}) {
    return (
        <Card className="p-5">
            <CardHeader
                titulo="Banco de preguntas"
                descripcion="Resumen por tipo"
                accion={
                    <LinkButton
                        href={ROUTES.docente.preguntas}
                        disponible={false}
                        className="h-8 px-3 text-xs"
                    >
                        Ver banco
                    </LinkButton>
                }
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {TIPOS.map((tipo) => (
                    <div
                        key={tipo.clave}
                        className={cn(
                            'flex items-center justify-between rounded-lg px-4 py-3',
                            clasesTile(tipo.tono),
                        )}
                    >
                        <span className="text-xs font-medium">{tipo.label}</span>
                        <span className="text-lg font-bold tabular-nums">
                            {preguntasPorTipo[tipo.clave]}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
                <LinkButton
                    href={ROUTES.docente.preguntas}
                    disponible={false}
                    className="h-8 w-full text-xs"
                >
                    Ver todas
                </LinkButton>
                <LinkButton
                    href={ROUTES.docente.preguntaNueva}
                    variante="primaria"
                    disponible={false}
                    className="h-8 w-full text-xs"
                >
                    + Agregar
                </LinkButton>
            </div>
        </Card>
    );
}