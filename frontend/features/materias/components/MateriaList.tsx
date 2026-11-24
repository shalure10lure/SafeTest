'use client';

import { useState } from 'react';
import Link from 'next/link';

import Alerta from '@/components/ui/Alerta';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { describirError } from '@/lib/mensajes';
import { useEliminar } from '@/lib/useEliminar';

import { materiasService } from '../services/materias.service';
import type { Materia } from '../types';

interface Props {
    materias: Materia[];
    /** Se llama después de eliminar o activar/desactivar, para recargar la lista. */
    onCambio: () => void;
}

const ACCION = 'text-sm font-medium hover:underline disabled:opacity-50';

function Estado({ activo }: { activo: boolean }) {
    return (
        <span
            className={`rounded-full border px-2 py-0.5 text-xs ${
                activo
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-slate-300 bg-slate-100 text-slate-600'
            }`}
        >
            {activo ? 'Activa' : 'Inactiva'}
        </span>
    );
}

export function MateriaList({ materias, onCambio }: Props) {
    const toast = useToast();
    // Id de la materia que se está activando/desactivando (para bloquear su botón)
    const [cambiando, setCambiando] = useState<number | null>(null);
    const [errorEstado, setErrorEstado] = useState<{ titulo: string; detalle: string } | null>(null);

    const eliminacion = useEliminar<Materia>({
        eliminar: (m) => materiasService.remove(m.materia_id),
        onEliminado: onCambio,
        mensajeExito: (m) => `Materia «${m.nombre}» eliminada`,
        mensajeFallo: (m) => `No se pudo eliminar «${m.nombre}»`,
    });

    async function alternarEstado(materia: Materia) {
        setCambiando(materia.materia_id);
        setErrorEstado(null);
        try {
            await materiasService.update(materia.materia_id, { activo: !materia.activo });
            toast.exito(
                materia.activo
                    ? `«${materia.nombre}» desactivada`
                    : `«${materia.nombre}» activada`,
                materia.activo
                    ? 'Ya no aparecerá al armar nuevos periodos, pero conserva su historial.'
                    : 'Ya puedes usarla en nuevos periodos.',
            );
            onCambio();
        } catch (fallo) {
            setErrorEstado(describirError(fallo, `No se pudo cambiar el estado de «${materia.nombre}»`));
        } finally {
            setCambiando(null);
        }
    }

    if (materias.length === 0) {
        return (
            <p className="rounded-lg border bg-white p-6 text-sm text-slate-500">
                Aún no tienes materias registradas. Usa «+ Nueva materia» para crear varias
                de una vez.
            </p>
        );
    }

    const error = eliminacion.error ?? errorEstado;

    return (
        <div className="space-y-3">
            {error && (
                <Alerta
                    tono="error"
                    titulo={error.titulo}
                    onCerrar={() => {
                        eliminacion.limpiarError();
                        setErrorEstado(null);
                    }}
                >
                    {error.detalle}
                </Alerta>
            )}

            {/* Pantallas medianas y grandes: tabla */}
            <div className="hidden overflow-hidden rounded-lg border bg-white md:block">
                <table className="w-full text-left text-sm">
                    <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Nombre</th>
                            <th className="px-4 py-3">Código</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materias.map((m) => (
                            <tr key={m.materia_id} className="border-b last:border-0">
                                <td className="px-4 py-3 font-medium">{m.nombre}</td>
                                <td className="px-4 py-3 font-mono text-xs">{m.codigo}</td>
                                <td className="px-4 py-3"><Estado activo={m.activo} /></td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        <Link href={`/docente/materias/${m.materia_id}/editar`} className={`${ACCION} text-violet-600`}>
                                            Editar
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => void alternarEstado(m)}
                                            disabled={cambiando === m.materia_id}
                                            className={`${ACCION} text-slate-600`}
                                        >
                                            {m.activo ? 'Desactivar' : 'Activar'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => eliminacion.pedir(m)}
                                            className={`${ACCION} text-red-600`}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Celulares: una tarjeta por materia */}
            <ul className="space-y-3 md:hidden">
                {materias.map((m) => (
                    <li key={m.materia_id} className="rounded-lg border bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="truncate font-medium">{m.nombre}</p>
                                <p className="font-mono text-xs text-slate-500">{m.codigo}</p>
                            </div>
                            <Estado activo={m.activo} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3">
                            <Link href={`/docente/materias/${m.materia_id}/editar`} className={`${ACCION} text-violet-600`}>
                                Editar
                            </Link>
                            <button
                                type="button"
                                onClick={() => void alternarEstado(m)}
                                disabled={cambiando === m.materia_id}
                                className={`${ACCION} text-slate-600`}
                            >
                                {m.activo ? 'Desactivar' : 'Activar'}
                            </button>
                            <button type="button" onClick={() => eliminacion.pedir(m)} className={`${ACCION} text-red-600`}>
                                Eliminar
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            <ConfirmDialog
                abierto={eliminacion.pendiente !== null}
                titulo={`¿Eliminar la materia «${eliminacion.pendiente?.nombre ?? ''}»?`}
                textoConfirmar="Sí, eliminar"
                varianteConfirmar="destructiva"
                procesando={eliminacion.eliminando}
                onCancelar={eliminacion.cancelar}
                onConfirmar={() => void eliminacion.confirmar()}
            >
                <p>Esta acción no se puede deshacer.</p>
                <p>
                    Solo se puede eliminar si no tiene paralelos, evaluaciones, temas ni
                    materiales. Si ya la usaste, es mejor <strong>desactivarla</strong>: deja de
                    ofrecerse en nuevos periodos y conserva su historial.
                </p>
            </ConfirmDialog>
        </div>
    );
}
