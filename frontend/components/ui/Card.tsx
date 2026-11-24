import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type Tono = 'violet' | 'blue' | 'indigo' | 'amber' | 'emerald' | 'slate';

const TONOS: Record<
    Tono,
    { valor: string; icono: string; badge: string; tile: string }
> = {
    violet: {
        valor: 'text-brand',
        icono: 'bg-secondary text-brand',
        badge: 'border-border bg-secondary text-secondary-foreground',
        tile: 'bg-secondary text-brand',
    },
    blue: {
        valor: 'text-blue-600',
        icono: 'bg-blue-100 text-blue-600',
        badge: 'border-blue-200 bg-blue-50 text-blue-700',
        tile: 'bg-blue-100 text-blue-700',
    },
    indigo: {
        valor: 'text-sky-700',
        icono: 'bg-sky-100 text-sky-700',
        badge: 'border-sky-200 bg-sky-50 text-sky-700',
        tile: 'bg-sky-100 text-sky-700',
    },
    amber: {
        valor: 'text-warning',
        icono: 'bg-warning-background text-warning',
        badge: 'border-warning/20 bg-warning-background text-warning',
        tile: 'bg-warning-background text-warning',
    },
    emerald: {
        valor: 'text-success',
        icono: 'bg-success-background text-success',
        badge: 'border-success/20 bg-success-background text-success',
        tile: 'bg-success-background text-success',
    },
    slate: {
        valor: 'text-slate-600',
        icono: 'bg-slate-100 text-slate-600',
        badge: 'border-slate-200 bg-slate-50 text-slate-600',
        tile: 'bg-slate-100 text-slate-700',
    },
};

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-sm', className)}
            {...props}
        />
    );
}

interface CardHeaderProps {
    titulo: string;
    descripcion?: string;
    accion?: ReactNode;
}

export function CardHeader({ titulo, descripcion, accion }: CardHeaderProps) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <h2 className="text-sm font-semibold text-card-foreground">{titulo}</h2>
                {descripcion && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>
                )}
            </div>
            {accion}
        </div>
    );
}

interface StatCardProps {
    etiqueta: string;
    valor: number | string;
    icono: LucideIcon;
    tono: Tono;
}

export function StatCard({ etiqueta, valor, icono: Icono, tono }: StatCardProps) {
    const estilos = TONOS[tono];

    return (
        <Card className="flex items-start justify-between gap-3 p-5">
            <div>
                <p className="text-xs font-medium text-muted-foreground">{etiqueta}</p>
                <p className={cn('mt-1 text-3xl font-semibold tracking-tight tabular-nums', estilos.valor)}>
                    {valor}
                </p>
            </div>

            <span
                className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', estilos.icono)}
                aria-hidden="true"
            >
                <Icono className="size-4" />
            </span>
        </Card>
    );
}

interface BadgeProps {
    tono: Tono;
    children: ReactNode;
    className?: string;
}

export function Badge({ tono, children, className }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                TONOS[tono].badge,
                className,
            )}
        >
            {children}
        </span>
    );
}

/** Fondo + texto del tono, para mosaicos de resumen. */
export function clasesTile(tono: Tono): string {
    return TONOS[tono].tile;
}
