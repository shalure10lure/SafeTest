'use client';

import { useCallback, useState } from 'react';

import { describirError, erroresPorFila } from '@/lib/mensajes';
import { configuracionAcademicaService } from '../services/configuracion-academica.service';
import type {
    DatosPeriodo,
    ErroresFilas,
    EstadoAsistente,
    FilaMateriaNueva,
    ResultadoConfiguracion,
} from '../types';
import { construirPayload } from '../utils';

/** Genera un identificador corto para las filas nuevas. */
const nuevaClave = () => Math.random().toString(36).slice(2, 9);

export const filaNueva = (nombre = '', codigo = ''): FilaMateriaNueva => ({
    clave: nuevaClave(),
    nombre,
    codigo,
});

const ESTADO_INICIAL: EstadoAsistente = {
    periodo: { gestion: '', nroPruebas: '3', fechaInicio: '', fechaFin: '' },
    materiaIds: [],
    materiasNuevas: [],
    paralelos: {},
};

export interface ErrorEnvio {
    titulo: string;
    detalle: string;
    /** Paso al que conviene volver para corregir el problema (1, 2 o 3). */
    pasoDelError: 1 | 2 | 3;
}

/**
 * Guarda TODO lo que el docente va completando a lo largo de los pasos
 * (así no se pierde al ir "Atrás") y se encarga de enviarlo al servidor.
 */
export function useAsistentePeriodo() {
    const [estado, setEstado] = useState<EstadoAsistente>(ESTADO_INICIAL);
    const [enviando, setEnviando] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState<ErrorEnvio | null>(null);
    // Errores por fila que devolvió el servidor (se muestran en el paso 2)
    const [erroresServidor, setErroresServidor] = useState<ErroresFilas>({});

    const cambiarPeriodo = useCallback((cambio: Partial<DatosPeriodo>) => {
        setEstado((actual) => ({ ...actual, periodo: { ...actual.periodo, ...cambio } }));
    }, []);

    const cambiarMateriaIds = useCallback((ids: number[]) => {
        setEstado((actual) => ({ ...actual, materiaIds: ids }));
    }, []);

    const cambiarMateriasNuevas = useCallback((filas: FilaMateriaNueva[]) => {
        setEstado((actual) => ({ ...actual, materiasNuevas: filas }));
        setErroresServidor({}); // al editar, los errores viejos ya no aplican
    }, []);

    /** Reemplaza los grupos de paralelos indicados (uno o varios a la vez). */
    const cambiarParalelos = useCallback((cambios: Record<string, string[]>) => {
        setEstado((actual) => ({
            ...actual,
            paralelos: { ...actual.paralelos, ...cambios },
        }));
    }, []);

    /**
     * Envía todo al servidor. Devuelve el resultado si salió bien, o null si
     * falló (el motivo queda en `errorEnvio`).
     */
    const enviar = useCallback(async (): Promise<ResultadoConfiguracion | null> => {
        setEnviando(true);
        setErrorEnvio(null);
        setErroresServidor({});

        const { payload, clavesEnviadas } = construirPayload(estado);

        try {
            return await configuracionAcademicaService.configurarPeriodo(payload);
        } catch (fallo) {
            const { titulo, detalle, estado: codigo } = describirError(
                fallo,
                'No se pudo crear el periodo',
            );

            // ¿El servidor marcó filas concretas de materias nuevas?
            const filas = erroresPorFila(fallo);
            if (filas.length > 0) {
                const porClave: ErroresFilas = {};
                for (const fila of filas) {
                    const clave = clavesEnviadas[fila.indice];
                    if (!clave) continue;
                    porClave[clave] = { ...porClave[clave], [fila.campo]: fila.mensaje };
                }
                setErroresServidor(porClave);
            }

            // 409 = la gestión ya existe -> se corrige en el paso 1
            const pasoDelError = filas.length > 0 ? 2 : codigo === 409 ? 1 : 3;
            setErrorEnvio({ titulo, detalle, pasoDelError });

            return null;
        } finally {
            setEnviando(false);
        }
    }, [estado]);

    return {
        estado,
        enviando,
        errorEnvio,
        erroresServidor,
        limpiarErrorEnvio: () => setErrorEnvio(null),
        cambiarPeriodo,
        cambiarMateriaIds,
        cambiarMateriasNuevas,
        cambiarParalelos,
        enviar,
    };
}
