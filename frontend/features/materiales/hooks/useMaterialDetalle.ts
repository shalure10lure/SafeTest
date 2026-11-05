'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';

import { materialesService } from '../services/materiales.service';
import type {
    EstadoExtraccionDetalle,
    Material,
} from '../types';

export type AccionMaterial =
    | 'autorizando'
    | 'revocando'
    | 'eliminando'
    | null;

/**
 * Detalle de un material propio: datos, estado de extracción y acciones de
 * autorización/eliminación. La autorización solo se refleja cuando el backend
 * confirma el cambio.
 */
export function useMaterialDetalle(id: number | null) {
    const [material, setMaterial] = useState<Material | null>(null);
    const [extraccion, setExtraccion] =
        useState<EstadoExtraccionDetalle | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [claveCompletada, setClaveCompletada] = useState<string | null>(
        null,
    );
    const [recarga, setRecarga] = useState(0);
    const [accion, setAccion] = useState<AccionMaterial>(null);
    // Error de una acción: se guarda aparte para no ocultar el detalle.
    const [errorAccion, setErrorAccion] = useState<string | null>(null);
    const [codigoErrorAccion, setCodigoErrorAccion] = useState<number | null>(
        null,
    );
    const [origenErrorAccion, setOrigenErrorAccion] = useState<
        'autorizacion' | 'eliminacion' | null
    >(null);
    const [mensaje, setMensaje] = useState<string | null>(null);

    const claveConsulta = `${id ?? 'sin-id'}#${recarga}`;
    const isLoading = id !== null && claveCompletada !== claveConsulta;

    const cargar = useCallback(() => {
        setRecarga((valor) => valor + 1);
    }, []);

    useEffect(() => {
        if (id === null) return;

        let vigente = true;

        Promise.all([
            materialesService.getById(id),
            materialesService.getExtraccion(id),
        ])
            .then(([datos, estado]) => {
                if (!vigente) return;

                setMaterial(datos);
                setExtraccion(estado);
                setError(null);
            })
            .catch((err) => {
                if (!vigente) return;

                setError(
                    mensajeDeError(err, 'No se pudo cargar el material.'),
                );
            })
            .finally(() => {
                if (vigente) setClaveCompletada(claveConsulta);
            });

        return () => {
            vigente = false;
        };
    }, [id, claveConsulta]);

    // Si el identificador cambia, no mostramos los datos del material anterior.
    const materialActual = material?.material_id === id ? material : null;
    const extraccionActual =
        extraccion?.material_id === id ? extraccion : null;

    const cambiarAutorizacion = useCallback(
        async (autorizado: boolean) => {
            if (!materialActual || accion) return;

            if (!autorizado) {
                const confirmar = window.confirm(
                    `¿Revocar la autorización de "${materialActual.titulo}" para IA? Dejará de usarse en nuevas generaciones de preguntas.`,
                );

                if (!confirmar) return;
            }

            try {
                setAccion(autorizado ? 'autorizando' : 'revocando');
                setErrorAccion(null);
                setCodigoErrorAccion(null);
                setOrigenErrorAccion(null);
                setMensaje(null);

                const actualizado = await materialesService.autorizar(
                    materialActual.material_id,
                    autorizado,
                );

                // El backend ya confirmó el cambio: reflejarlo de inmediato
                // sin depender de una segunda consulta.
                setMaterial(actualizado);
                setExtraccion((anterior) =>
                    actualizarEstadoExtraccion(anterior, actualizado),
                );
                setMensaje(
                    autorizado
                        ? 'El material quedó autorizado para IA.'
                        : 'La autorización para IA fue revocada.',
                );
            } catch (err) {
                setOrigenErrorAccion('autorizacion');
                setErrorAccion(
                    mensajeDeError(
                        err,
                        autorizado
                            ? 'No se pudo autorizar el material para IA.'
                            : 'No se pudo revocar la autorización.',
                    ),
                );
                setCodigoErrorAccion(
                    axios.isAxiosError(err)
                        ? (err.response?.status ?? null)
                        : null,
                );
            } finally {
                setAccion(null);
            }
        },
        [materialActual, accion],
    );

    const autorizar = useCallback(
        () => cambiarAutorizacion(true),
        [cambiarAutorizacion],
    );

    const revocar = useCallback(
        () => cambiarAutorizacion(false),
        [cambiarAutorizacion],
    );

    /** Devuelve `true` solo cuando el backend confirmó la eliminación. */
    const eliminar = useCallback(async (): Promise<boolean> => {
        if (!materialActual || accion) return false;

        const confirmar = window.confirm(
            `¿Eliminar el material "${materialActual.titulo}"? Esta acción no se puede deshacer.`,
        );

        if (!confirmar) return false;

        try {
            setAccion('eliminando');
            setErrorAccion(null);
            setCodigoErrorAccion(null);
            setOrigenErrorAccion(null);
            setMensaje(null);

            await materialesService.eliminar(materialActual.material_id);

            return true;
        } catch (err) {
            setOrigenErrorAccion('eliminacion');
            setErrorAccion(
                mensajeDeError(
                    err,
                    'No se pudo eliminar el material.',
                ),
            );
            setCodigoErrorAccion(
                axios.isAxiosError(err)
                    ? (err.response?.status ?? null)
                    : null,
            );

            return false;
        } finally {
            setAccion(null);
        }
    }, [materialActual, accion]);

    const limpiarMensajes = useCallback(() => {
        setMensaje(null);
        setErrorAccion(null);
        setCodigoErrorAccion(null);
        setOrigenErrorAccion(null);
    }, []);

    return {
        material: materialActual,
        extraccion: extraccionActual,
        isLoading,
        error,
        accion,
        errorAccion,
        codigoErrorAccion,
        origenErrorAccion,
        mensaje,
        cargar,
        autorizar,
        revocar,
        eliminar,
        limpiarMensajes,
    };
}

/**
 * Actualiza la vista de extracción con la respuesta del backend. El número de
 * caracteres no cambia al autorizar, pero `disponible_para_ia` sí.
 */
function actualizarEstadoExtraccion(
    anterior: EstadoExtraccionDetalle | null,
    material: Material,
): EstadoExtraccionDetalle | null {
    if (!anterior || anterior.material_id !== material.material_id) {
        return anterior;
    }

    return {
        ...anterior,
        activo: material.activo,
        autorizado_ia: material.autorizado_ia,
        disponible_para_ia:
            material.activo &&
            material.autorizado_ia &&
            anterior.caracteres > 0,
    };
}
