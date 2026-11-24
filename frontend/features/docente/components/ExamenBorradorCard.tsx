import { Check } from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/Card';
import LinkButton from '@/components/ui/LinkButton';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import type { ExamenBorrador } from '../types';

/** Pasos del asistente "Crear evaluación". */
const PASOS = ['Información', 'Preguntas', 'Config.', 'Asignación', 'Resumen'];

/** Ruta del asistente para cada paso, para "Continuar editando". */
function rutaDelPaso(id: number, paso: ExamenBorrador['pasoActual']): string {
    switch (paso) {
        case 1:
            return ROUTES.docente.evaluacionEditar(id);
        case 2:
            return ROUTES.docente.evaluacionPreguntas(id);
        case 3:
            return ROUTES.docente.evaluacionConfiguracion(id);
        case 4:
            return ROUTES.docente.evaluacionAsignacion(id);
        default:
            return ROUTES.docente.evaluacionResumen(id);
    }
}

/** Muestra la evaluación en borrador más reciente y en qué paso quedó. */
export default function ExamenBorradorCard({
    borrador,
}: {
    borrador: ExamenBorrador;
}) {
    return (
        <Card className="p-5">
            <CardHeader titulo="Examen en borrador" descripcion={borrador.titulo} />

            <ol
                className="mt-4 grid grid-cols-5 gap-1"
                aria-label="Progreso de la evaluación"
            >
                {PASOS.map((nombre, indice) => {
                    const numero = indice + 1;
                    const completado = numero < borrador.pasoActual;
                    const actual = numero === borrador.pasoActual;

                    return (
                        <li
                            key={nombre}
                            aria-current={actual ? 'step' : undefined}
                            className="flex min-w-0 flex-col items-center gap-1 text-center"
                        >
                            <span
                                className={cn(
                                    'flex size-7 items-center justify-center rounded-full border text-xs font-semibold',
                                    completado &&
                                        'border-blue-600 bg-blue-600 text-white',
                                    actual &&
                                        'border-blue-600 bg-white text-blue-600',
                                    !completado &&
                                        !actual &&
                                        'border-slate-300 bg-white text-slate-400',
                                )}
                            >
                                {completado ? (
                                    <Check className="size-4" aria-hidden="true" />
                                ) : (
                                    numero
                                )}
                            </span>
                            <span
                                className={cn(
                                    'w-full truncate text-[10px]',
                                    actual
                                        ? 'font-medium text-slate-800'
                                        : 'text-slate-400',
                                )}
                                title={nombre}
                            >
                                {nombre}
                            </span>
                        </li>
                    );
                })}
            </ol>

            <p className="mt-4 text-xs text-slate-500">
                Paso actual: {borrador.descripcionPaso}
            </p>

            <LinkButton
                href={rutaDelPaso(borrador.id, borrador.pasoActual)}
                variante="primaria"
                className="mt-3 w-full"
            >
                Continuar editando
            </LinkButton>
        </Card>
    );
}
