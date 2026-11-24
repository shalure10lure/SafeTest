'use client';

import { useCallback, useState } from 'react';

import { useToast } from '@/components/ui/ToastProvider';
import { describirError } from '@/lib/mensajes';

interface Opciones<T> {
    /** Llama al servidor para eliminar el elemento. */
    eliminar: (item: T) => Promise<unknown>;
    /** Se ejecuta cuando se eliminó bien (normalmente: volver a cargar la lista). */
    onEliminado: () => void;
    /** Texto del aviso de éxito, ej. "Materia «Cálculo I» eliminada". */
    mensajeExito: (item: T) => string;
    /** Título del error si falla, ej. "No se pudo eliminar la materia". */
    mensajeFallo: (item: T) => string;
}

/**
 * Lógica compartida para "Eliminar" con ventana de confirmación:
 *   pedir(item) -> se abre el diálogo -> confirmar() -> aviso de éxito o error.
 * Si el servidor responde 409 (tiene datos asociados), el error explica el motivo.
 */
export function useEliminar<T>({
    eliminar,
    onEliminado,
    mensajeExito,
    mensajeFallo,
}: Opciones<T>) {
    const toast = useToast();
    const [pendiente, setPendiente] = useState<T | null>(null);
    const [eliminando, setEliminando] = useState(false);
    const [error, setError] = useState<{ titulo: string; detalle: string } | null>(null);

    const pedir = useCallback((item: T) => {
        setError(null);
        setPendiente(item);
    }, []);

    const cancelar = useCallback(() => setPendiente(null), []);

    const confirmar = useCallback(async () => {
        if (pendiente === null) return;

        setEliminando(true);
        try {
            await eliminar(pendiente);
            toast.exito(mensajeExito(pendiente));
            onEliminado();
        } catch (fallo) {
            setError(describirError(fallo, mensajeFallo(pendiente)));
        } finally {
            setEliminando(false);
            setPendiente(null);
        }
    }, [pendiente, eliminar, onEliminado, mensajeExito, mensajeFallo, toast]);

    return {
        pendiente,
        eliminando,
        error,
        limpiarError: () => setError(null),
        pedir,
        cancelar,
        confirmar,
    };
}
