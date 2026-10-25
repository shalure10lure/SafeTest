import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface LinkButtonProps {
    href: string;
    children: ReactNode;
    variante?: 'primaria' | 'secundaria';
    icono?: LucideIcon;
    /** `false` = la pantalla destino aún no existe (se muestra deshabilitado). */
    disponible?: boolean;
    className?: string;
}

const BASE =
    'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-colors';

const VARIANTES = {
    primaria: 'bg-violet-600 text-white hover:bg-violet-700',
    secundaria: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
} as const;

export default function LinkButton({
    href,
    children,
    variante = 'secundaria',
    icono: Icono,
    disponible = true,
    className,
}: LinkButtonProps) {
    const contenido = (
        <>
            {Icono && <Icono className="size-4" aria-hidden="true" />}
            {children}
        </>
    );

    if (!disponible) {
        return (
            <span
                aria-disabled="true"
                title="Próximamente"
                className={cn(
                    BASE,
                    VARIANTES[variante],
                    'cursor-not-allowed opacity-50',
                    variante === 'primaria' && 'hover:bg-violet-600',
                    variante === 'secundaria' && 'hover:bg-white',
                    className,
                )}
            >
                {contenido}
            </span>
        );
    }

    return (
        <Link
            href={href}
            className={cn(
                BASE,
                VARIANTES[variante],
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600',
                className,
            )}
        >
            {contenido}
        </Link>
    );
}