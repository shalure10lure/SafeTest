import Link from 'next/link';

import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';

interface Acceso {
    label: string;
    href: string;
    /** `false` = la pantalla todavía no existe (se muestra deshabilitado). */
    disponible: boolean;
}

const ACCESOS: Acceso[] = [
    { label: 'Gestión académica', href: ROUTES.docente.materias, disponible: true },
    { label: 'Crear pregunta', href: ROUTES.docente.preguntaNueva, disponible: false },
    { label: 'Ver banco', href: ROUTES.docente.preguntas, disponible: false },
    { label: 'Crear evaluación', href: ROUTES.docente.evaluacionNueva, disponible: false },
    { label: 'Pendientes de nota', href: ROUTES.docente.correccion, disponible: false },
];

const BASE =
    'block rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800';

export default function AccesoRapido() {
    return (
        <Card className="p-5">
            <CardHeader titulo="Acceso rápido" />

            <ul className="mt-4 space-y-2">
                {ACCESOS.map((acceso) => (
                    <li key={acceso.label}>
                        {acceso.disponible ? (
                            <Link
                                href={acceso.href}
                                className={cn(
                                    BASE,
                                    'transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600',
                                )}
                            >
                                {acceso.label}
                            </Link>
                        ) : (
                            <span
                                aria-disabled="true"
                                title="Próximamente"
                                className={cn(BASE, 'cursor-not-allowed opacity-50')}
                            >
                                {acceso.label}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </Card>
    );
}