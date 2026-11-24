import Link from 'next/link';
import { Lock } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/constants/routes';

/**
 * Pantalla de error 403: el docente intentó abrir algo que pertenece
 * al ámbito académico de otro docente.
 */
export default function AccesoNoAutorizado({
    detalle = 'El recurso solicitado pertenece al ámbito académico de otro docente (materia, paralelo o resultados).',
}: {
    detalle?: string;
}) {
    return (
        <main className="mx-auto flex w-full max-w-5xl justify-center p-4 sm:p-8">
            <Card className="w-full max-w-md p-6 text-center sm:p-8">
                <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <Lock className="size-5" aria-hidden="true" />
                </span>

                <p className="mt-4 text-[10px] font-semibold tracking-widest text-red-600">
                    ERROR 403
                </p>
                <h1 className="mt-1 text-xl font-bold text-slate-900">
                    Acceso no autorizado
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                    No tienes permisos para acceder a este recurso.
                </p>

                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    {detalle}
                </p>

                <Link
                    href={ROUTES.docente.inicio}
                    className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                >
                    Volver al inicio
                </Link>

                <p className="mt-3 text-[11px] text-slate-400">
                    El intento quedó registrado en la sesión.
                </p>
            </Card>
        </main>
    );
}
