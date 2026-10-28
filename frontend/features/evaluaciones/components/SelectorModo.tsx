import { Check, Square } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ModoSeleccion } from '../types';

const OPCIONES = [
    {
        valor: 'manual',
        titulo: 'Manual',
        descripcion: 'Eliges una por una las preguntas del banco.',
        icono: Check,
    },
    {
        valor: 'aleatorio',
        titulo: 'Aleatorio',
        descripcion: 'Defines temas y cantidades; SafeTest arma la evaluación.',
        icono: Square,
    },
] as const;

interface SelectorModoProps {
    modo: ModoSeleccion;
    onCambiar: (modo: ModoSeleccion) => void;
    /** `false` = el modo aleatorio todavía no está implementado. */
    aleatorioDisponible?: boolean;
}

export default function SelectorModo({
    modo,
    onCambiar,
    aleatorioDisponible = false,
}: SelectorModoProps) {
    return (
        <div>
            <p id="modo-seleccion" className="mb-2 text-sm font-medium text-slate-900">
                Modo de selección
            </p>

            <div
                role="radiogroup"
                aria-labelledby="modo-seleccion"
                className="grid gap-3 sm:grid-cols-2"
            >
                {OPCIONES.map((opcion) => {
                    const Icono = opcion.icono;
                    const activo = modo === opcion.valor;
                    const bloqueado =
                        opcion.valor === 'aleatorio' && !aleatorioDisponible;

                    return (
                        <label
                            key={opcion.valor}
                            className={cn(
                                'flex gap-3 rounded-xl border bg-white p-4 transition-colors',
                                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet-600',
                                activo
                                    ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                                    : 'border-slate-200',
                                bloqueado
                                    ? 'cursor-not-allowed opacity-60'
                                    : 'cursor-pointer hover:border-slate-300',
                            )}
                        >
                            <input
                                type="radio"
                                name="modo-seleccion"
                                value={opcion.valor}
                                checked={activo}
                                disabled={bloqueado}
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
                                    {bloqueado && (
                                        <span className="ml-2 text-[10px] font-medium text-slate-400">
                                            Próximamente
                                        </span>
                                    )}
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
        </div>
    );
}