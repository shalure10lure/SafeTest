'use client';

import { useEffect, useRef, useState } from 'react';

import { preguntasService } from '../services/preguntas.service';

interface ImagenRecursoProps {
    /** Texto alternativo de la imagen. */
    nombre: string;
    /** Imagen elegida en el navegador que todavía no se subió. */
    urlLocal?: string;
    /** Imagen ya guardada: se descarga con la sesión del docente. */
    preguntaId?: number;
    recurso?: string;
    /**
     * Cómo descargar la imagen guardada. Por defecto usa el endpoint del
     * docente; la rendición del estudiante entrega el suyo.
     */
    cargarImagen?: () => Promise<Blob>;
    /** Clases de la imagen (por defecto, tamaño completo). */
    claseImagen?: string;
}

/**
 * Muestra una imagen de la pregunta. Las guardadas no se pueden cargar con un
 * `<img src>` directo porque el endpoint exige el token de sesión; se
 * descargan como Blob y se muestran desde una URL temporal.
 */
export default function ImagenRecurso({
    nombre,
    urlLocal,
    preguntaId,
    recurso,
    cargarImagen,
    claseImagen = 'max-h-72 max-w-full',
}: ImagenRecursoProps) {
    const [urlRemota, setUrlRemota] = useState('');
    const [fallo, setFallo] = useState(false);

    // El cargador suele recrearse en cada render del padre; se guarda en una
    // referencia para no volver a descargar la imagen por eso.
    const cargadorRef = useRef(cargarImagen);
    const usaCargador = cargarImagen !== undefined;

    useEffect(() => {
        cargadorRef.current = cargarImagen;
    }, [cargarImagen]);

    useEffect(() => {
        if (
            !usaCargador &&
            (preguntaId === undefined || recurso === undefined)
        ) {
            return;
        }

        let vigente = true;
        let url = '';

        const descarga =
            cargadorRef.current?.() ??
            preguntasService.getImagen(preguntaId as number, recurso as string);

        descarga
            .then((blob) => {
                if (!vigente) return;

                url = URL.createObjectURL(blob);
                setUrlRemota(url);
            })
            .catch(() => {
                if (vigente) setFallo(true);
            });

        return () => {
            vigente = false;

            if (url) URL.revokeObjectURL(url);
        };
    }, [preguntaId, recurso, usaCargador]);

    const origen = urlLocal ?? urlRemota;

    if (fallo) {
        return (
            <p role="alert" className="text-xs text-red-600">
                No se pudo cargar la imagen.
            </p>
        );
    }

    if (!origen) {
        return (
            <div
                role="status"
                aria-label="Cargando imagen"
                className="h-24 w-full max-w-xs animate-pulse rounded-lg bg-slate-100"
            />
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element -- URL temporal (blob:), no admite next/image
        <img
            src={origen}
            alt={nombre}
            className={`${claseImagen} rounded-lg border border-slate-200 object-contain`}
        />
    );
}
