import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface LinkButtonProps {
    href: string;
    children: ReactNode;
    variante?: 'primaria' | 'secundaria' | 'suave';
    icono?: LucideIcon;
    /** `false` = la pantalla destino aún no existe (se muestra deshabilitado). */
    disponible?: boolean;
    /** Texto del tooltip cuando está deshabilitado. */
    title?: string;
    className?: string;
}

const BASE =
    'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200';

const VARIANTES = {
    primaria: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secundaria: 'border border-border bg-card text-foreground hover:bg-accent',
    suave: 'bg-secondary text-secondary-foreground hover:bg-accent',
} as const;

export default function LinkButton({
    href,
    children,
    variante = 'secundaria',
    icono: Icono,
    disponible = true,
    title = 'Próximamente',
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
                title={title}
                className={cn(
                    BASE,
                    VARIANTES[variante],
                    'cursor-not-allowed opacity-50',
                    variante === 'primaria' && 'hover:bg-primary',
                    variante === 'secundaria' && 'hover:bg-card',
                    variante === 'suave' && 'hover:bg-secondary',
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
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                className,
            )}
        >
            {contenido}
        </Link>
    );
}
