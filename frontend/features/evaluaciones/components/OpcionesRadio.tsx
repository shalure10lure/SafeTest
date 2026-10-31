import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface OpcionRadio<T extends string> {
    valor: T;
    titulo: string;
    descripcion: string;
    icono: LucideIcon;
}

interface OpcionesRadioProps<T extends string> {
    nombre: string;
    etiqueta: string;
    valor: T;
    opciones: readonly OpcionRadio<T>[];
    onCambiar: (valor: T) => void;
}

export default function OpcionesRadio<T extends string>({
    nombre,
    etiqueta,
    valor,
    opciones,
    onCambiar,
}: OpcionesRadioProps<T>) {
    return (
        <div role="radiogroup" aria-label={etiqueta} className="grid gap-3 sm:grid-cols-2">
            {opciones.map((opcion) => {
                const Icono = opcion.icono;
                const activo = valor === opcion.valor;

                return (
                    <label
                        key={opcion.valor}
                        className={cn(
                            'flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition-colors',
                            'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet-600',
                            activo
                                ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                                : 'border-slate-200 hover:border-slate-300',
                        )}
                    >
                        <input
                            type="radio"
                            name={nombre}
                            value={opcion.valor}
                            checked={activo}
                            onChange={() => onCambiar(opcion.valor)}
                            className="sr-only"
                        />

                        <span
                            aria-hidden="true"
                            className={cn(
                                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                activo
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-slate-100 text-slate-400',
                            )}
                        >
                            <Icono className="size-4" />
                        </span>

                        <span className="min-w-0 flex-1">
                            <span
                                className={cn(
                                    'block text-sm font-semibold',
                                    activo ? 'text-violet-700' : 'text-slate-900',
                                )}
                            >
                                {opcion.titulo}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                                {opcion.descripcion}
                            </span>
                        </span>

                        <span
                            aria-hidden="true"
                            className={cn(
                                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                                activo ? 'border-violet-600' : 'border-slate-300',
                            )}
                        >
                            {activo && <span className="size-2 rounded-full bg-violet-600" />}
                        </span>
                    </label>
                );
            })}
        </div>
    );
}