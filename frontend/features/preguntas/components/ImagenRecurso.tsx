'use client';

import { useEffect, useState } from 'react';

import { preguntasService } from '../services/preguntas.service';

interface ImagenRecursoProps {
    /** Texto alternativo de la imagen. */
    nombre: string;
    /** Imagen elegida en el navegador que todavía no se subió. */
    urlLocal?: string;
    /** Imagen ya guardada: se descarga con la sesión del docente. */
    preguntaId?: number;
    recurso?: string;
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
}: ImagenRecursoProps) {
    const [urlRemota, setUrlRemota] = useState('');
    const [fallo, setFallo] = useState(false);

    useEffect(() => {
        if (preguntaId === undefined || recurso === undefined) return;

        let vigente = true;
        let url = '';

        preguntasService
            .getImagen(preguntaId, recurso)
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
    }, [preguntaId, recurso]);

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
            className="max-h-72 max-w-full rounded-lg border border-slate-200 object-contain"
        />
    );
}
