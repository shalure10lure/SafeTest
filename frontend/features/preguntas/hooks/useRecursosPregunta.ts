'use client';

import { useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';

import {
    errorArchivoImagen,
    errorFormula,
    errorTabla,
    MAX_RECURSOS_POR_PREGUNTA,
} from '../recursos';
import { preguntasService } from '../services/preguntas.service';
import type { ContenidoTabla, RecursoPregunta } from '../types';

/** Contenido elegido en el formulario de una pregunta que todavía no existe. */
export type RecursoPendiente =
    | { id: string; tipo: 'imagen'; archivo: File; url: string }
    | { id: string; tipo: 'tabla'; tabla: ContenidoTabla }
    | { id: string; tipo: 'formula'; latex: string };

const MENSAJE_LLENO = `Una pregunta admite hasta ${MAX_RECURSOS_POR_PREGUNTA} elementos de contenido.`;

/**
 * Contenido especializado de una pregunta (imágenes, tablas y fórmulas).
 *
 * - Con `preguntaId` (edición): cada cambio se guarda al instante en el servidor.
 * - Sin `preguntaId` (creación): el contenido se acumula como pendiente y se
 *   sube con `subirPendientes` justo después de crear la pregunta.
 */
export function useRecursosPregunta(preguntaId?: number) {
    const [guardados, setGuardados] = useState<RecursoPregunta[]>([]);
    const [pendientes, setPendientes] = useState<RecursoPendiente[]>([]);
    const [cargando, setCargando] = useState(preguntaId !== undefined);
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState('');
    const urlsLocales = useRef(new Set<string>());

    useEffect(() => {
        if (preguntaId === undefined) return;

        const id = preguntaId;
        let vigente = true;

        async function cargar() {
            try {
                const datos = await preguntasService.getRecursos(id);

                if (vigente) setGuardados(datos);
            } catch (err) {
                if (vigente) {
                    setError(
                        mensajeDeError(
                            err,
                            'No se pudo cargar el contenido de la pregunta.',
                        ),
                    );
                }
            } finally {
                if (vigente) setCargando(false);
            }
        }

        void cargar();

        return () => {
            vigente = false;
        };
    }, [preguntaId]);

    // Libera las vistas previas locales al salir del formulario.
    useEffect(() => {
        const urls = urlsLocales.current;

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
            urls.clear();
        };
    }, []);

    const lleno = guardados.length + pendientes.length >= MAX_RECURSOS_POR_PREGUNTA;

    function rechazar(mensaje: string): false {
        setError(mensaje);

        return false;
    }

    /** Ejecuta una operación contra el servidor y traduce sus errores. */
    async function ejecutar(accion: () => Promise<void>): Promise<boolean> {
        setError('');
        setOcupado(true);

        try {
            await accion();

            return true;
        } catch (err) {
            setError(
                mensajeDeError(
                    err,
                    'No se pudo guardar el contenido. Inténtalo de nuevo.',
                ),
            );

            return false;
        } finally {
            setOcupado(false);
        }
    }

    function agregarPendiente(recurso: RecursoPendiente): true {
        setError('');
        setPendientes((previos) => [...previos, recurso]);

        return true;
    }

    async function agregarImagen(archivo: File): Promise<boolean> {
        const mensaje = errorArchivoImagen(archivo);

        if (mensaje) return rechazar(mensaje);
        if (lleno) return rechazar(MENSAJE_LLENO);

        if (preguntaId === undefined) {
            const url = URL.createObjectURL(archivo);

            urlsLocales.current.add(url);

            return agregarPendiente({
                id: crypto.randomUUID(),
                tipo: 'imagen',
                archivo,
                url,
            });
        }

        const id = preguntaId;

        return ejecutar(async () => {
            const creado = await preguntasService.agregarImagen(id, archivo);

            setGuardados((previos) => [...previos, creado]);
        });
    }

    async function agregarFormula(latex: string): Promise<boolean> {
        const mensaje = errorFormula(latex);

        if (mensaje) return rechazar(mensaje);
        if (lleno) return rechazar(MENSAJE_LLENO);

        const formula = latex.trim();

        if (preguntaId === undefined) {
            return agregarPendiente({
                id: crypto.randomUUID(),
                tipo: 'formula',
                latex: formula,
            });
        }

        const id = preguntaId;

        return ejecutar(async () => {
            const creado = await preguntasService.agregarContenido(id, {
                tipo: 'formula',
                contenido: formula,
            });

            setGuardados((previos) => [...previos, creado]);
        });
    }

    async function agregarTabla(tabla: ContenidoTabla): Promise<boolean> {
        const mensaje = errorTabla(tabla);

        if (mensaje) return rechazar(mensaje);
        if (lleno) return rechazar(MENSAJE_LLENO);

        if (preguntaId === undefined) {
            return agregarPendiente({
                id: crypto.randomUUID(),
                tipo: 'tabla',
                tabla,
            });
        }

        const id = preguntaId;

        return ejecutar(async () => {
            const creado = await preguntasService.agregarContenido(id, {
                tipo: 'tabla',
                contenido: tabla,
            });

            setGuardados((previos) => [...previos, creado]);
        });
    }

    async function quitarGuardado(recurso: string): Promise<boolean> {
        if (preguntaId === undefined) return false;

        const id = preguntaId;

        return ejecutar(async () => {
            await preguntasService.eliminarRecurso(id, recurso);

            setGuardados((previos) =>
                previos.filter((item) => item.recurso !== recurso),
            );
        });
    }

    function quitarPendiente(id: string) {
        const quitado = pendientes.find((item) => item.id === id);

        if (quitado?.tipo === 'imagen') {
            URL.revokeObjectURL(quitado.url);
            urlsLocales.current.delete(quitado.url);
        }

        setError('');
        setPendientes((previos) => previos.filter((item) => item.id !== id));
    }

    /**
     * Sube el contenido acumulado a una pregunta recién creada, en orden.
     * Devuelve cuántos elementos no se pudieron subir.
     */
    async function subirPendientes(nuevaPreguntaId: number): Promise<number> {
        let fallidos = 0;

        for (const item of pendientes) {
            try {
                if (item.tipo === 'imagen') {
                    await preguntasService.agregarImagen(
                        nuevaPreguntaId,
                        item.archivo,
                    );
                } else if (item.tipo === 'formula') {
                    await preguntasService.agregarContenido(nuevaPreguntaId, {
                        tipo: 'formula',
                        contenido: item.latex,
                    });
                } else {
                    await preguntasService.agregarContenido(nuevaPreguntaId, {
                        tipo: 'tabla',
                        contenido: item.tabla,
                    });
                }
            } catch {
                fallidos += 1;
            }
        }

        return fallidos;
    }

    return {
        guardados,
        pendientes,
        cargando,
        ocupado,
        error,
        lleno,
        limpiarError: () => setError(''),
        agregarImagen,
        agregarFormula,
        agregarTabla,
        quitarGuardado,
        quitarPendiente,
        subirPendientes,
    };
}

export type RecursosPreguntaEstado = ReturnType<typeof useRecursosPregunta>;
