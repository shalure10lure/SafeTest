'use client';

import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';

import { materiasService } from '@/features/materias/services/materias.service';
import type { Materia } from '@/features/materias/types';

import { periodosService } from '../services/periodos.service';
import type { Periodo } from '../types';

interface Props {
    periodoEditar?: Periodo | null;
    onGuardado: () => void;
    onCancelar: () => void;
}

export function PeriodoForm({
    periodoEditar = null,
    onGuardado,
    onCancelar,
}: Props) {
    const [gestion, setGestion] = useState(periodoEditar?.gestion ?? '');
    const [nroPruebas, setNroPruebas] = useState(
        String(periodoEditar?.nro_pruebas ?? 1),
    );
    const [fechaInicio, setFechaInicio] = useState(
        periodoEditar?.fecha_inicio ?? '',
    );
    const [fechaFin, setFechaFin] = useState(periodoEditar?.fecha_fin ?? '');
    const [activo, setActivo] = useState(periodoEditar?.activo ?? true);
    const [materiaIds, setMateriaIds] = useState<number[]>(
        periodoEditar?.materias.map((m) => m.materia_id) ?? [],
    );

    const [materias, setMaterias] = useState<Materia[]>([]);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [mensaje, setMensaje] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        materiasService.getAll().then(setMaterias).catch(() => {
            setMensaje('No se pudieron cargar tus materias');
        });
    }, []);

    function toggleMateria(id: number) {
        setMateriaIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    async function guardar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMensaje('');

        const nuevos: Record<string, string> = {};
        if (!gestion.trim()) nuevos.gestion = 'La gestión es obligatoria';
        if (!Number.isInteger(Number(nroPruebas)) || Number(nroPruebas) < 1) {
            nuevos.nroPruebas = 'Debe ser un entero mayor o igual a 1';
        }
        if (!fechaInicio) nuevos.fechaInicio = 'La fecha de inicio es obligatoria';
        if (!fechaFin) nuevos.fechaFin = 'La fecha de fin es obligatoria';
        if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
            nuevos.fechaFin = 'La fecha de fin no puede ser anterior al inicio';
        }
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) return;

        try {
            setGuardando(true);

            if (periodoEditar) {
                await periodosService.update(periodoEditar.semestre_id, {
                    gestion,
                    nro_pruebas: Number(nroPruebas),
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin,
                    activo,
                    materiaIds,
                });
            } else {
                await periodosService.create({
                    gestion,
                    nro_pruebas: Number(nroPruebas),
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin,
                    materiaIds,
                });
            }

            onGuardado();
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const m = err.response?.data?.message;
                setMensaje(Array.isArray(m) ? m.join(', ') : (m ?? 'Error al guardar'));
            } else {
                setMensaje('Error al guardar');
            }
        } finally {
            setGuardando(false);
        }
    }

    const input =
        'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500';
    const error = 'mt-1 text-xs text-red-600';

    return (
        <form
            onSubmit={guardar}
            className="max-w-xl space-y-4 rounded-lg border bg-white p-6"
        >
            <div>
                <h2 className="font-semibold">Datos del periodo</h2>
                <p className="text-sm text-slate-500">
                    El periodo quedará asociado únicamente a tu cuenta.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium">Gestión</label>
                    <input
                        className={input}
                        placeholder="2026-II"
                        value={gestion}
                        onChange={(e) => setGestion(e.target.value)}
                    />
                    {errores.gestion && <p className={error}>{errores.gestion}</p>}
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">N.° pruebas</label>
                    <input
                        type="number"
                        min={1}
                        className={input}
                        value={nroPruebas}
                        onChange={(e) => setNroPruebas(e.target.value)}
                    />
                    {errores.nroPruebas && <p className={error}>{errores.nroPruebas}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="mb-1 block text-sm font-medium">Inicio</label>
                    <input
                        type="date"
                        className={input}
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                    />
                    {errores.fechaInicio && <p className={error}>{errores.fechaInicio}</p>}
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">Fin</label>
                    <input
                        type="date"
                        className={input}
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                    />
                    {errores.fechaFin && <p className={error}>{errores.fechaFin}</p>}
                </div>
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium">
                    Materias del periodo{' '}
                    <span className="text-slate-400">(opcional)</span>
                </label>

                {materias.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        No tienes materias registradas todavía.
                    </p>
                ) : (
                    <div className="space-y-1 rounded-md border p-3">
                        {materias.map((m) => (
                            <label key={m.materia_id} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={materiaIds.includes(m.materia_id)}
                                    onChange={() => toggleMateria(m.materia_id)}
                                />
                                {m.nombre}{' '}
                                <span className="font-mono text-xs text-slate-500">
                                    ({m.codigo})
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {periodoEditar && (
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={activo}
                        onChange={(e) => setActivo(e.target.checked)}
                    />
                    Periodo activo
                </label>
            )}

            {mensaje && <p className="text-sm text-red-600">{mensaje}</p>}

            <div className="flex justify-end gap-2 border-t pt-4">
                <button
                    type="button"
                    onClick={onCancelar}
                    className="rounded-md border px-4 py-2 text-sm"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={guardando}
                    className="rounded-md bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </form>
    );
}