'use client';

import { useState } from 'react';
import Link from 'next/link';

import Alerta from '@/components/ui/Alerta';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { describirError } from '@/lib/mensajes';
import { useEliminar } from '@/lib/useEliminar';

import { periodosService } from '../services/periodos.service';
import type { Periodo } from '../types';

interface Props {
    periodos: Periodo[];
    /** Se llama después de eliminar o activar/desactivar, para recargar la lista. */
    onCambio: () => void;
}

const ACCION = 'text-sm font-medium hover:underline disabled:opacity-50';
/** Cuántos códigos de materia se muestran antes de resumir con "+N". */
const MAX_CODIGOS = 4;

/** "2027-02-01" -> "01/02/2027" (sin usar Date para evitar desfases de zona horaria). */
function formatearFecha(fecha: string | null): string {
    if (!fecha) return '—';
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
}

function Estado({ activo }: { activo: boolean }) {
    return (
        <span
            className={`rounded-full border px-2 py-0.5 text-xs ${
                activo
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-slate-300 bg-slate-100 text-slate-600'
            }`}
        >
            {activo ? 'Activo' : 'Inactivo'}
        </span>
    );
}

/** Códigos de las materias del periodo: "MAT101, IO, FIS1 +2" */
function Materias({ periodo }: { periodo: Periodo }) {
    if (periodo.materias.length === 0) {
        return <span className="text-slate-400">Sin materias</span>;
    }

    const visibles = periodo.materias.slice(0, MAX_CODIGOS).map((m) => m.codigo).join(', ');
    const resto = periodo.materias.length - MAX_CODIGOS;

    return (
        <span title={periodo.materias.map((m) => m.nombre).join(', ')}>
            {visibles}
            {resto > 0 && <span className="text-slate-500"> +{resto}</span>}
        </span>
    );
}

export function PeriodoList({ periodos, onCambio }: Props) {
    const toast = useToast();
    const [cambiando, setCambiando] = useState<number | null>(null);
    const [errorEstado, setErrorEstado] = useState<{ titulo: string; detalle: string } | null>(null);

    const eliminacion = useEliminar<Periodo>({
        eliminar: (p) => periodosService.remove(p.semestre_id),
        onEliminado: onCambio,
        mensajeExito: (p) => `Periodo ${p.gestion} eliminado`,
        mensajeFallo: (p) => `No se pudo eliminar el periodo ${p.gestion}`,
    });

    async function alternarEstado(periodo: Periodo) {
        setCambiando(periodo.semestre_id);
        setErrorEstado(null);
        try {
            await periodosService.update(periodo.semestre_id, { activo: !periodo.activo });
            toast.exito(
                periodo.activo
                    ? `Periodo ${periodo.gestion} desactivado`
                    : `Periodo ${periodo.gestion} activado`,
                periodo.activo
                    ? 'Conserva sus datos, pero ya no se ofrece al comparar ni al crear evaluaciones.'
                    : 'Vuelve a estar disponible.',
            );
            onCambio();
        } catch (fallo) {
            setErrorEstado(describirError(fallo, `No se pudo cambiar el estado del periodo ${periodo.gestion}`));
        } finally {
            setCambiando(null);
        }
    }

    if (periodos.length === 0) {
        return (
            <p className="rounded-lg border bg-white p-6 text-sm text-slate-500">
                Aún no tienes periodos académicos registrados. Usa{' '}
                <strong>Configurar periodo</strong> para crear el periodo, sus materias y
                paralelos en 3 pasos.
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
                            <th className="px-4 py-3">Gestión</th>
                            <th className="px-4 py-3">Fechas</th>
                            <th className="px-4 py-3">Pruebas</th>
                            <th className="px-4 py-3">Materias</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {periodos.map((p) => (
                            <tr key={p.semestre_id} className="border-b last:border-0">
                                <td className="px-4 py-3 font-medium">{p.gestion}</td>
                                <td className="px-4 py-3 text-xs text-slate-600">
                                    {formatearFecha(p.fecha_inicio)} → {formatearFecha(p.fecha_fin)}
                                </td>
                                <td className="px-4 py-3">{p.nro_pruebas}</td>
                                <td className="px-4 py-3 text-xs"><Materias periodo={p} /></td>
                                <td className="px-4 py-3"><Estado activo={p.activo} /></td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        <Link href={`/docente/periodos/${p.semestre_id}/editar`} className={`${ACCION} text-violet-600`}>
                                            Editar
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => void alternarEstado(p)}
                                            disabled={cambiando === p.semestre_id}
                                            className={`${ACCION} text-slate-600`}
                                        >
                                            {p.activo ? 'Desactivar' : 'Activar'}
                                        </button>
                                        <button type="button" onClick={() => eliminacion.pedir(p)} className={`${ACCION} text-red-600`}>
                                            Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Celulares: una tarjeta por periodo */}
            <ul className="space-y-3 md:hidden">
                {periodos.map((p) => (
                    <li key={p.semestre_id} className="rounded-lg border bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold">{p.gestion}</p>
                                <p className="text-xs text-slate-500">
                                    {formatearFecha(p.fecha_inicio)} → {formatearFecha(p.fecha_fin)} · {p.nro_pruebas} pruebas
                                </p>
                            </div>
                            <Estado activo={p.activo} />
                        </div>
                        <p className="mt-2 text-xs text-slate-600">
                            <span className="text-slate-400">Materias: </span>
                            <Materias periodo={p} />
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3">
                            <Link href={`/docente/periodos/${p.semestre_id}/editar`} className={`${ACCION} text-violet-600`}>
                                Editar
                            </Link>
                            <button
                                type="button"
                                onClick={() => void alternarEstado(p)}
                                disabled={cambiando === p.semestre_id}
                                className={`${ACCION} text-slate-600`}
                            >
                                {p.activo ? 'Desactivar' : 'Activar'}
                            </button>
                            <button type="button" onClick={() => eliminacion.pedir(p)} className={`${ACCION} text-red-600`}>
                                Eliminar
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            <ConfirmDialog
                abierto={eliminacion.pendiente !== null}
                titulo={`¿Eliminar el periodo ${eliminacion.pendiente?.gestion ?? ''}?`}
                textoConfirmar="Sí, eliminar"
                varianteConfirmar="destructiva"
                procesando={eliminacion.eliminando}
                onCancelar={eliminacion.cancelar}
                onConfirmar={() => void eliminacion.confirmar()}
            >
                <p>Esta acción no se puede deshacer.</p>
                <p>
                    Solo se puede eliminar si no tiene paralelos ni evaluaciones. Si ya lo
                    usaste, es mejor <strong>desactivarlo</strong>: conserva todo su historial.
                    Tus materias no se borran.
                </p>
            </ConfirmDialog>
        </div>
    );
}
