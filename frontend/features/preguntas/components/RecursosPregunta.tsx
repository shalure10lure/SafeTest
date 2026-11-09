'use client';

import type { RecursoPendiente } from '../hooks/useRecursosPregunta';
import type { RecursoPregunta } from '../types';

import FormulaRenderizada from './FormulaRenderizada';
import ImagenRecurso from './ImagenRecurso';
import TablaRecurso from './TablaRecurso';

interface RecursosPreguntaProps {
    /** Pregunta a la que pertenecen los recursos guardados. */
    preguntaId?: number;
    guardados?: RecursoPregunta[];
    pendientes?: RecursoPendiente[];
}

/**
 * Muestra el contenido especializado de una pregunta (imágenes, tablas y
 * fórmulas) tal como lo vería el estudiante.
 *
 * Es solo de lectura y no depende del formulario, así que también sirve para
 * la pantalla de respuesta del estudiante (HU-22).
 */
export default function RecursosPregunta({
    preguntaId,
    guardados = [],
    pendientes = [],
}: RecursosPreguntaProps) {
    if (guardados.length === 0 && pendientes.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 space-y-3">
            {guardados.map((item) => {
                if (item.tipo === 'imagen' && preguntaId !== undefined) {
                    return (
                        <ImagenRecurso
                            key={item.recurso}
                            nombre={
                                item.nombre_original ?? 'Imagen de la pregunta'
                            }
                            preguntaId={preguntaId}
                            recurso={item.recurso}
                        />
                    );
                }

                if (
                    item.tipo === 'tabla' &&
                    typeof item.contenido === 'object' &&
                    item.contenido !== null
                ) {
                    return (
                        <TablaRecurso key={item.recurso} tabla={item.contenido} />
                    );
                }

                if (
                    item.tipo === 'formula' &&
                    typeof item.contenido === 'string'
                ) {
                    return (
                        <FormulaRenderizada
                            key={item.recurso}
                            latex={item.contenido}
                        />
                    );
                }

                return null;
            })}

            {pendientes.map((item) => {
                if (item.tipo === 'imagen') {
                    return (
                        <ImagenRecurso
                            key={item.id}
                            nombre={item.archivo.name}
                            urlLocal={item.url}
                        />
                    );
                }

                if (item.tipo === 'tabla') {
                    return <TablaRecurso key={item.id} tabla={item.tabla} />;
                }

                return <FormulaRenderizada key={item.id} latex={item.latex} />;
            })}
        </div>
    );
}
