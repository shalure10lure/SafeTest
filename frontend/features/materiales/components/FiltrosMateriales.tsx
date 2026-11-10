'use client';

import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { Materia } from '@/features/materias/types';

interface FiltrosMaterialesProps {
    buscar: string;
    onBuscar: (valor: string) => void;
    materiaId: string;
    onMateria: (valor: string) => void;
    materias: Materia[];
    autorizado: string;
    onAutorizado: (valor: string) => void;
    hayFiltros: boolean;
    onLimpiar: () => void;
    cargandoDatos?: boolean;
}

const CONTROL =
    'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export default function FiltrosMateriales({
    buscar,
    onBuscar,
    materiaId,
    onMateria,
    materias,
    autorizado,
    onAutorizado,
    hayFiltros,
    onLimpiar,
    cargandoDatos = false,
}: FiltrosMaterialesProps) {
    return (
        <section
            aria-label="Filtros de materiales académicos"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="relative">
                    <label htmlFor="filtro-material-buscar" className="sr-only">
                        Buscar materiales
                    </label>

                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                    />

                    <input
                        id="filtro-material-buscar"
                        type="search"
                        value={buscar}
                        onChange={(evento) => onBuscar(evento.target.value)}
                        placeholder="Buscar por título, archivo o tema..."
                        maxLength={150}
                        className={cn(CONTROL, 'pl-9')}
                    />
                </div>

                <div>
                    <label htmlFor="filtro-material-materia" className="sr-only">
                        Materia
                    </label>

                    <select
                        id="filtro-material-materia"
                        value={materiaId}
                        onChange={(evento) => onMateria(evento.target.value)}
                        disabled={cargandoDatos}
                        className={CONTROL}
                    >
                        <option value="">
                            {cargandoDatos ? 'Cargando materias...' : 'Materia'}
                        </option>

                        {materias.map((materia) => (
                            <option
                                key={materia.materia_id}
                                value={materia.materia_id}
                            >
                                {materia.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="filtro-material-ia" className="sr-only">
                        Autorización para IA
                    </label>

                    <select
                        id="filtro-material-ia"
                        value={autorizado}
                        onChange={(evento) =>
                            onAutorizado(evento.target.value)
                        }
                        className={CONTROL}
                    >
                        <option value="">Autorización IA</option>
                        <option value="true">Autorizado para IA</option>
                        <option value="false">No autorizado para IA</option>
                    </select>
                </div>
            </div>

            {hayFiltros && (
                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        onClick={onLimpiar}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                        <X className="size-3.5" aria-hidden="true" />
                        Limpiar filtros
                    </button>
                </div>
            )}
        </section>
    );
}
