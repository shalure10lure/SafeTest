'use client';

import { FormEvent, useState } from 'react';
import axios from 'axios';

import { materiasService } from '../services/materias.service';
import type { Materia } from '../types';

interface Props {
    materiaEditar?: Materia | null;
    onGuardado: () => void;
    onCancelar: () => void;
}

export function MateriaForm({
    materiaEditar = null,
    onGuardado,
    onCancelar,
}: Props) {
    const [nombre, setNombre] = useState(materiaEditar?.nombre ?? '');
    const [codigo, setCodigo] = useState(materiaEditar?.codigo ?? '');
    const [descripcion, setDescripcion] = useState(
        materiaEditar?.descripcion ?? '',
    );
    const [activo, setActivo] = useState(materiaEditar?.activo ?? true);
    const [errores, setErrores] = useState<{ nombre?: string; codigo?: string }>({});
    const [mensaje, setMensaje] = useState('');
    const [guardando, setGuardando] = useState(false);

    async function guardar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMensaje('');

        const nuevos: typeof errores = {};
        if (!nombre.trim()) nuevos.nombre = 'El nombre es obligatorio';
        if (!codigo.trim()) nuevos.codigo = 'El código es obligatorio';
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) return;

        try {
            setGuardando(true);

            if (materiaEditar) {
                await materiasService.update(materiaEditar.materia_id, {
                    nombre,
                    codigo,
                    descripcion,
                    activo,
                });
            } else {
                await materiasService.create({ nombre, codigo, descripcion });
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

    return (
        <form
            onSubmit={guardar}
            className="max-w-xl space-y-4 rounded-lg border bg-white p-6"
        >
            <div>
                <h2 className="font-semibold">Datos de la materia</h2>
                <p className="text-sm text-slate-500">
                    La materia quedará asociada únicamente a tu cuenta.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium">Nombre</label>
                    <input
                        className={input}
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                    />
                    {errores.nombre && (
                        <p className="mt-1 text-xs text-red-600">{errores.nombre}</p>
                    )}
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">Código</label>
                    <input
                        className={input}
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                    />
                    {errores.codigo && (
                        <p className="mt-1 text-xs text-red-600">{errores.codigo}</p>
                    )}
                </div>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    Descripción <span className="text-slate-400">(opcional)</span>
                </label>
                <textarea
                    rows={3}
                    className={input}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                />
            </div>

            {materiaEditar && (
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={activo}
                        onChange={(e) => setActivo(e.target.checked)}
                    />
                    Materia activa
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
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
        </form>
    );
}