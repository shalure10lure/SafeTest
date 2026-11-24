'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { describirError, esAccesoDenegado } from '@/lib/mensajes';
import { estadisticasService } from '../services/estadisticas.service';
import type { FiltrosPanel, PanelEstadisticas } from '../types';

interface ErrorPanel {
    titulo: string;
    detalle: string;
}

type CambioFiltro = Partial<Record<keyof FiltrosPanel, number | null>>;

/**
 * Carga el panel de estadísticas y reacciona a los cambios de filtro.
 *
 * - Al inicio no enviamos filtros: el backend elige la materia y el periodo
 *   más recientes con datos y nos dice cuáles eligió (`datos.seleccion`).
 * - Si el backend responde 403 (recurso de otro docente) se activa
 *   `accesoDenegado` para mostrar la pantalla "Acceso no autorizado".
 */
export function usePanelEstadisticas() {
    const [filtros, setFiltros] = useState<FiltrosPanel>({});
    const [datos, setDatos] = useState<PanelEstadisticas | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<ErrorPanel | null>(null);
    const [accesoDenegado, setAccesoDenegado] = useState(false);

    // Número de la última petición: si el docente cambia rápido de filtro,
    // se ignoran las respuestas viejas que llegan tarde.
    const ultimaPeticion = useRef(0);

    const cargar = useCallback(async (filtrosActuales: FiltrosPanel) => {
        ultimaPeticion.current += 1;
        const numero = ultimaPeticion.current;

        setCargando(true);
        setError(null);
        setAccesoDenegado(false);

        try {
            const respuesta = await estadisticasService.getPanel(filtrosActuales);
            if (numero !== ultimaPeticion.current) return;

            setDatos(respuesta);
        } catch (fallo) {
            if (numero !== ultimaPeticion.current) return;

            if (esAccesoDenegado(fallo)) {
                setAccesoDenegado(true);
            } else {
                setError(
                    describirError(fallo, 'No se pudieron cargar las estadísticas'),
                );
            }
        } finally {
            if (numero === ultimaPeticion.current) setCargando(false);
        }
    }, []);

    useEffect(() => {
        void cargar(filtros);
    }, [cargar, filtros]);

    /**
     * Cambia un filtro. Los que dependen del cambiado se reinician:
     *  - nueva materia -> el backend vuelve a elegir periodo; sin evaluación ni paralelo
     *  - nuevo periodo -> sin evaluación ni paralelo
     */
    const cambiarFiltro = useCallback(
        (cambio: CambioFiltro) => {
            setFiltros((actuales) => {
                // Partimos de lo que se ve en pantalla (incluye los valores
                // por defecto que eligió el backend).
                const sel = datos?.seleccion;
                const siguiente: FiltrosPanel = {
                    materia_id: actuales.materia_id ?? sel?.materia_id ?? undefined,
                    semestre_id: actuales.semestre_id ?? sel?.semestre_id ?? undefined,
                    examen_id: actuales.examen_id,
                    paralelo_id: actuales.paralelo_id,
                };

                if ('materia_id' in cambio) {
                    siguiente.materia_id = cambio.materia_id ?? undefined;
                    siguiente.semestre_id = undefined;
                    siguiente.examen_id = undefined;
                    siguiente.paralelo_id = undefined;
                }
                if ('semestre_id' in cambio) {
                    siguiente.semestre_id = cambio.semestre_id ?? undefined;
                    siguiente.examen_id = undefined;
                    siguiente.paralelo_id = undefined;
                }
                if ('examen_id' in cambio) {
                    siguiente.examen_id = cambio.examen_id ?? undefined;
                }
                if ('paralelo_id' in cambio) {
                    siguiente.paralelo_id = cambio.paralelo_id ?? undefined;
                }

                return siguiente;
            });
        },
        [datos],
    );

    const reintentar = useCallback(() => {
        void cargar(filtros);
    }, [cargar, filtros]);

    return { datos, cargando, error, accesoDenegado, cambiarFiltro, reintentar };
}
