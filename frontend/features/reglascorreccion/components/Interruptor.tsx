'use client';

import { cn } from '@/lib/utils';

interface InterruptorProps {
    id: string;
    etiqueta: string;
    descripcion?: string;
    checked: boolean;
    onChange: (valor: boolean) => void;
    disabled?: boolean;
}

/**
 * Interruptor accesible basado en un checkbox nativo.
 * Visualmente imita el switch de la referencia de diseño.
 */
export default function Interruptor({
    id,
    etiqueta,
    descripcion,
    checked,
    onChange,
    disabled = false,
}: InterruptorProps) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <label
                    htmlFor={id}
                    className={cn(
                        'block cursor-pointer text-xs font-medium text-slate-700',
                        disabled && 'text-slate-400',
                    )}
                >
                    {etiqueta}
                </label>
                {descripcion && (
                    <p
                        id={`${id}-descripcion`}
                        className="mt-0.5 text-xs text-slate-500"
                    >
                        {descripcion}
                    </p>
                )}
            </div>

            <span className="relative mt-0.5 inline-flex shrink-0 items-center">
                <input
                    id={id}
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    onChange={(evento) => onChange(evento.target.checked)}
                    aria-describedby={
                        descripcion ? `${id}-descripcion` : undefined
                    }
                    disabled={disabled}
                />
                <span
                    aria-hidden="true"
                    className="h-5 w-9 rounded-full bg-slate-200 transition-colors peer-checked:bg-violet-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-violet-600 peer-disabled:opacity-50"
                />
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0.5 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4"
                />
            </span>
        </div>
    );
}
