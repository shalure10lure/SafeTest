'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { generarNombresParalelos } from '../utils';

/** Una materia que participa en el periodo, existente o nueva. */
export interface MateriaDelAsistente {
    /** "e-<id>" (existente) o "n-<clave>" (nueva): llave para guardar sus paralelos. */
    clave: string;
    nombre: string;
    codigo: string;
    esNueva: boolean;
}

interface PasoParalelosProps {
    materias: MateriaDelAsistente[];
    paralelos: Record<string, string[]>;
    /** Reemplaza los paralelos de las materias indicadas. */
    onCambiar: (cambios: Record<string, string[]>) => void;
}

const BOTON_SECUNDARIO =
    'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-600';

/** Paso 3: agregar varios paralelos a cada materia sin salir del asistente. */
export default function PasoParalelos({ materias, paralelos, onCambiar }: PasoParalelosProps) {
    // Texto que se está escribiendo en cada materia
    const [borradores, setBorradores] = useState<Record<string, string>>({});
    const [cantidadTodas, setCantidadTodas] = useState('2');

    function agregarNombre(clave: string) {
        const nombre = (borradores[clave] ?? '').trim();
        if (!nombre) return;

        const actuales = paralelos[clave] ?? [];
        // No se permiten dos paralelos con el mismo nombre en una materia
        if (!actuales.some((n) => n.toLowerCase() === nombre.toLowerCase())) {
            onCambiar({ [clave]: [...actuales, nombre] });
        }
        setBorradores((prev) => ({ ...prev, [clave]: '' }));
    }

    function quitarNombre(clave: string, nombre: string) {
        onCambiar({ [clave]: (paralelos[clave] ?? []).filter((n) => n !== nombre) });
    }

    /** Agrega "Paralelo A", "Paralelo B"... a TODAS las materias hasta llegar a N. */
    function aplicarATodas() {
        const cantidad = Math.min(20, Math.max(1, Number(cantidadTodas) || 1));
        const cambios: Record<string, string[]> = {};

        for (const materia of materias) {
            const actuales = paralelos[materia.clave] ?? [];
            const faltan = Math.max(0, cantidad - actuales.length);
            cambios[materia.clave] = [
                ...actuales,
                ...generarNombresParalelos(faltan, actuales),
            ];
        }

        onCambiar(cambios);
    }

    if (materias.length === 0) {
        return (
            <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Primero elige al menos una materia en el paso anterior.
            </p>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-base font-semibold text-slate-900">Paralelos de cada materia</h2>
                <p className="text-sm text-slate-500">
                    Es opcional: también puedes crear los paralelos más tarde desde «Mis
                    paralelos».
                </p>
            </div>

            {/* Atajo para el caso más común: mismos paralelos en todas las materias */}
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-violet-200 bg-violet-50/60 p-3">
                <div>
                    <label
                        htmlFor="cantidad-todas"
                        className="mb-1 block text-xs font-medium text-slate-700"
                    >
                        Paralelos por materia
                    </label>
                    <input
                        id="cantidad-todas"
                        type="number"
                        min={1}
                        max={20}
                        value={cantidadTodas}
                        onChange={(e) => setCantidadTodas(e.target.value)}
                        className="w-20 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-500"
                    />
                </div>
                <button
                    type="button"
                    onClick={aplicarATodas}
                    className="rounded-md bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
                >
                    Crear en todas las materias
                </button>
                <p className="basis-full text-xs text-slate-500 sm:basis-auto">
                    Genera «Paralelo A», «Paralelo B»… en cada materia. Luego puedes ajustar
                    cada una.
                </p>
            </div>

            <ul className="space-y-3">
                {materias.map((materia) => {
                    const lista = paralelos[materia.clave] ?? [];

                    return (
                        <li
                            key={materia.clave}
                            className="rounded-lg border border-slate-200 bg-white p-4"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-slate-900">
                                    {materia.nombre}{' '}
                                    <span className="font-mono text-xs font-normal text-slate-500">
                                        {materia.codigo}
                                    </span>
                                    {materia.esNueva && (
                                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                            Nueva
                                        </span>
                                    )}
                                </p>
                                <span className="text-xs text-slate-500">
                                    {lista.length} {lista.length === 1 ? 'paralelo' : 'paralelos'}
                                </span>
                            </div>

                            {lista.length > 0 && (
                                <ul className="mt-3 flex flex-wrap gap-2">
                                    {lista.map((nombre) => (
                                        <li
                                            key={nombre}
                                            className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 py-1 pr-1 pl-3 text-xs font-medium text-violet-800"
                                        >
                                            {nombre}
                                            <button
                                                type="button"
                                                onClick={() => quitarNombre(materia.clave, nombre)}
                                                aria-label={`Quitar ${nombre} de ${materia.nombre}`}
                                                className="rounded-full p-0.5 hover:bg-violet-200"
                                            >
                                                <X className="size-3.5" aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                                <input
                                    aria-label={`Nuevo paralelo de ${materia.nombre}`}
                                    placeholder="Ej. Paralelo C"
                                    value={borradores[materia.clave] ?? ''}
                                    onChange={(e) =>
                                        setBorradores((prev) => ({
                                            ...prev,
                                            [materia.clave]: e.target.value,
                                        }))
                                    }
                                    onKeyDown={(e) => {
                                        // Enter agrega el paralelo sin enviar el asistente
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            agregarNombre(materia.clave);
                                        }
                                    }}
                                    className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => agregarNombre(materia.clave)}
                                    className={BOTON_SECUNDARIO}
                                >
                                    <Plus className="size-3.5" aria-hidden="true" />
                                    Agregar
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onCambiar({
                                            [materia.clave]: [
                                                ...lista,
                                                ...generarNombresParalelos(1, lista),
                                            ],
                                        })
                                    }
                                    className={BOTON_SECUNDARIO}
                                    title="Agrega el siguiente nombre libre: Paralelo A, B, C…"
                                >
                                    + Siguiente letra
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
