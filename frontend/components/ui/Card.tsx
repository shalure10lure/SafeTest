import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export type Tono = 'violet' | 'blue' | 'indigo' | 'amber' | 'emerald' | 'slate';

const TONOS: Record<
    Tono,
    { valor: string; icono: string; badge: string; tile: string }
> = {
    violet: {
        valor: 'text-violet-600',
        icono: 'bg-violet-100 text-violet-600',
        badge: 'border-violet-200 bg-violet-50 text-violet-700',
        tile: 'bg-violet-100 text-violet-700',
    },
    blue: {
        valor: 'text-blue-600',
        icono: 'bg-blue-100 text-blue-600',
        badge: 'border-blue-200 bg-blue-50 text-blue-700',
        tile: 'bg-blue-100 text-blue-700',
    },
    indigo: {
        valor: 'text-indigo-600',
        icono: 'bg-indigo-100 text-indigo-600',
        badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        tile: 'bg-indigo-100 text-indigo-700',
    },
    amber: {
        valor: 'text-amber-600',
        icono: 'bg-amber-100 text-amber-600',
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        tile: 'bg-amber-100 text-amber-700',
    },
    emerald: {
        valor: 'text-emerald-600',
        icono: 'bg-emerald-100 text-emerald-600',
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tile: 'bg-emerald-100 text-emerald-700',
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
            className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}
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
                <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
                {descripcion && (
                    <p className="mt-0.5 text-xs text-slate-500">{descripcion}</p>
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
        <Card className="flex items-start justify-between p-5">
            <div>
                <p className="text-xs font-medium text-slate-500">{etiqueta}</p>
                <p className={cn('mt-1 text-3xl font-bold tabular-nums', estilos.valor)}>
                    {valor}
                </p>
            </div>

            <span
                className={cn('flex size-8 items-center justify-center rounded-lg', estilos.icono)}
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