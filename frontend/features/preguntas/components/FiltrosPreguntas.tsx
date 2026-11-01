'use client';

import { useMemo } from 'react';
import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { Materia } from '@/features/materias/types';
import type { Tema } from '@/features/temas/types';

import { TIPOS_FILTRO_PREGUNTA } from '../tipos';

interface FiltrosPreguntasProps {
    buscar: string;
    onBuscar: (valor: string) => void;
    materiaId: string;
    onMateria: (valor: string) => void;
    materias: Materia[];
    temaId: string;
    onTema: (valor: string) => void;
    temas: Tema[];
    tipo: string;
    onTipo: (valor: string) => void;
    hayFiltros: boolean;
    onLimpiar: () => void;
    cargandoDatos?: boolean;
}

const CONTROL =
    'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export default function FiltrosPreguntas({
    buscar,
    onBuscar,
    materiaId,
    onMateria,
    materias,
    temaId,
    onTema,
    temas,
    tipo,
    onTipo,
    hayFiltros,
    onLimpiar,
    cargandoDatos = false,
}: FiltrosPreguntasProps) {
    const temasDeMateria = useMemo(
        () =>
            materiaId
                ? temas.filter(
                      (tema) =>
                          String(tema.materia_id) === materiaId,
                  )
                : [],
        [temas, materiaId],
    );

    const gruposDeTemas = useMemo(() => {
        const grupos = new Map<
            number,
            { nombre: string; temas: Tema[] }
        >();

        for (const tema of temas) {
            const materia = materias.find(
                (item) => item.materia_id === tema.materia_id,
            );

            const grupo = grupos.get(tema.materia_id) ?? {
                nombre:
                    materia?.nombre ??
                    tema.materia?.nombre ??
                    `Materia ${tema.materia_id}`,
                temas: [],
            };

            grupo.temas.push(tema);
            grupos.set(tema.materia_id, grupo);
        }

        return [...grupos.values()];
    }, [temas, materias]);

    return (
        <section
            aria-label="Filtros del banco de preguntas"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative">
                    <label htmlFor="filtro-buscar" className="sr-only">
                        Buscar preguntas
                    </label>

                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                    />

                    <input
                        id="filtro-buscar"
                        type="search"
                        value={buscar}
                        onChange={(evento) =>
                            onBuscar(evento.target.value)
                        }
                        placeholder="Buscar preguntas..."
                        maxLength={150}
                        className={cn(CONTROL, 'pl-9')}
                    />
                </div>

                <div>
                    <label htmlFor="filtro-materia" className="sr-only">
                        Materia
                    </label>

                    <select
                        id="filtro-materia"
                        value={materiaId}
                        onChange={(evento) =>
                            onMateria(evento.target.value)
                        }
                        disabled={cargandoDatos}
                        className={CONTROL}
                    >
                        <option value="">
                            {cargandoDatos
                                ? 'Cargando materias...'
                                : 'Materia'}
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
                    <label htmlFor="filtro-tema" className="sr-only">
                        Tema
                    </label>

                    <select
                        id="filtro-tema"
                        value={temaId}
                        onChange={(evento) =>
                            onTema(evento.target.value)
                        }
                        disabled={cargandoDatos || temas.length === 0}
                        className={CONTROL}
                    >
                        <option value="">
                            {temas.length === 0
                                ? 'Sin temas'
                                : 'Tema'}
                        </option>

                        {materiaId
                            ? temasDeMateria.map((tema) => (
                                  <option
                                      key={tema.tema_id}
                                      value={tema.tema_id}
                                  >
                                      {tema.nombre_tema}
                                  </option>
                              ))
                            : gruposDeTemas.map((grupo) => (
                                  <optgroup
                                      key={grupo.nombre}
                                      label={grupo.nombre}
                                  >
                                      {grupo.temas.map((tema) => (
                                          <option
                                              key={tema.tema_id}
                                              value={tema.tema_id}
                                          >
                                              {tema.nombre_tema}
                                          </option>
                                      ))}
                                  </optgroup>
                              ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="filtro-tipo" className="sr-only">
                        Tipo de pregunta
                    </label>

                    <select
                        id="filtro-tipo"
                        value={tipo}
                        onChange={(evento) =>
                            onTipo(evento.target.value)
                        }
                        className={CONTROL}
                    >
                        <option value="">Tipo</option>

                        {TIPOS_FILTRO_PREGUNTA.map((info) => (
                            <option key={info.valor} value={info.valor}>
                                {info.label}
                            </option>
                        ))}
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
