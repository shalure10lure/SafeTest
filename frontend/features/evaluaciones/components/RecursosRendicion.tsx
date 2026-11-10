'use client';

import RecursosPregunta from '@/features/preguntas/components/RecursosPregunta';

import { useRecursosRendicion } from '../hooks/useRecursosRendicion';

/** Contenido especializado de la pregunta que el estudiante está respondiendo. */
export default function RecursosRendicion({
    examenId,
    preguntaId,
}: {
    examenId: number;
    preguntaId: number;
}) {
    const { recursos, error, cargarImagen } = useRecursosRendicion(
        examenId,
        preguntaId,
    );

    if (error) {
        return (
            <p role="alert" className="mt-3 text-xs text-amber-700">
                No se pudo cargar el contenido adicional de esta pregunta.
            </p>
        );
    }

    return (
        <RecursosPregunta
            preguntaId={preguntaId}
            guardados={recursos}
            cargarImagen={cargarImagen}
        />
    );
}
