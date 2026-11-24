import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export type TonoAlerta = 'info' | 'exito' | 'aviso' | 'error';

/**
 * Colores e ícono de cada tipo de mensaje.
 * Un solo lugar para que TODOS los mensajes de SafeTest se vean igual.
 */
const ESTILOS: Record<
    TonoAlerta,
    { caja: string; icono: string; titulo: string; Icono: typeof Info }
> = {
    info: {
        caja: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30',
        icono: 'text-blue-600',
        titulo: 'text-blue-900 dark:text-blue-100',
        Icono: Info,
    },
    exito: {
        caja: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
        icono: 'text-emerald-600',
        titulo: 'text-emerald-900 dark:text-emerald-100',
        Icono: CircleCheck,
    },
    aviso: {
        caja: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
        icono: 'text-amber-600',
        titulo: 'text-amber-900 dark:text-amber-100',
        Icono: TriangleAlert,
    },
    error: {
        caja: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
        icono: 'text-red-600',
        titulo: 'text-red-900 dark:text-red-100',
        Icono: CircleAlert,
    },
};

interface AlertaProps {
    tono: TonoAlerta;
    /** Qué pasó, en una frase corta. */
    titulo?: string;
    /** Por qué pasó y qué puede hacer el docente (opcional). */
    children?: ReactNode;
    /** Botón o enlace de acción, por ejemplo "Reintentar". */
    accion?: ReactNode;
    /** Si se pasa, aparece una X para cerrar el mensaje. */
    onCerrar?: () => void;
    className?: string;
}

/**
 * Mensaje en línea (dentro de la página).
 *
 * Reglas de uso:
 *  - `error`  -> algo falló y el docente debe saberlo (role="alert").
 *  - `aviso`  -> hay algo pendiente antes de continuar.
 *  - `info`   -> explicación útil, sin urgencia.
 *  - `exito`  -> estado correcto que se mantiene visible.
 * Para confirmaciones que desaparecen solas usa `useToast()`.
 */
export default function Alerta({
    tono,
    titulo,
    children,
    accion,
    onCerrar,
    className,
}: AlertaProps) {
    const estilo = ESTILOS[tono];
    const Icono = estilo.Icono;

    return (
        <div
            role={tono === 'error' ? 'alert' : 'status'}
            className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-sm sm:p-4',
                estilo.caja,
                className,
            )}
        >
            <Icono
                className={cn('mt-0.5 size-5 shrink-0', estilo.icono)}
                aria-hidden="true"
            />

            <div className="min-w-0 flex-1 space-y-1">
                {titulo && (
                    <p className={cn('font-semibold', estilo.titulo)}>
                        {titulo}
                    </p>
                )}
                {children && (
                    <div className="leading-relaxed text-slate-700 dark:text-slate-300">
                        {children}
                    </div>
                )}
                {accion && <div className="pt-1.5">{accion}</div>}
            </div>

            {onCerrar && (
                <button
                    type="button"
                    onClick={onCerrar}
                    aria-label="Cerrar mensaje"
                    className="-m-1 shrink-0 rounded-md p-1 text-slate-500 hover:bg-black/5 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-violet-600"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
