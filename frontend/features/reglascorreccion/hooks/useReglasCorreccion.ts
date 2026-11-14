'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';

import { reglasCorreccionService } from '../services/reglas-correccion.service';
import type {
    CambioRegla,
    FalloGuardado,
    ReglaCorreccion,
    TipoRespuestaRegla,
} from '../types';

export interface ResultadoGuardado {
    exitosos: TipoRespuestaRegla[];
    fallidos: FalloGuardado[];
}

function estadoHttp(error: unknown): number | undefined {
    return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/**
 * Carga y guarda las reglas del docente autenticado.
 *
 * El backend obtiene el docente del JWT; el frontend nunca envía docente_id.
 */
export function useReglasCorreccion() {
    const [reglas, setReglas] = useState<ReglaCorreccion[]>([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState('');
    const [guardando, setGuardando] = useState(false);

    const ultimaPeticion = useRef(0);

    const consultar = useCallback(async (silencioso: boolean) => {
        const peticion = ++ultimaPeticion.current;

        if (!silencioso) {
            setCargando(true);
            setErrorCarga('');
        }

        try {
            const datos = await reglasCorreccionService.listar();

            if (peticion !== ultimaPeticion.current) return;

            setReglas(datos);
            setErrorCarga('');
        } catch (error) {
            if (peticion !== ultimaPeticion.current) return;

            if (!silencioso) {
                setErrorCarga(
                    mensajeDeError(
                        error,
                        'No se pudieron cargar las reglas de corrección.',
                    ),
                );
            }
        } finally {
            if (peticion === ultimaPeticion.current && !silencioso) {
                setCargando(false);
            }
        }
    }, []);

    useEffect(() => {
        void consultar(false);

        return () => {
            ultimaPeticion.current += 1;
        };
    }, [consultar]);

    const cargar = useCallback(() => {
        void consultar(false);
    }, [consultar]);

    /**
     * Guarda los cambios uno por uno para poder informar el error de cada
     * tipo. Si una regla falla, las demás continúan y la lista se refresca al
     * final para reflejar lo que realmente quedó persistido.
     */
    const guardar = useCallback(
        async (cambios: CambioRegla[]): Promise<ResultadoGuardado> => {
            setGuardando(true);

            const exitosos: TipoRespuestaRegla[] = [];
            const fallidos: FalloGuardado[] = [];
            const guardadas: ReglaCorreccion[] = [];

            for (const cambio of cambios) {
                try {
                    const regla =
                        cambio.regla_id !== undefined
                            ? await reglasCorreccionService.actualizar(
                                  cambio.regla_id,
                                  {
                                      parametros: cambio.parametros,
                                      activo: cambio.activo,
                                  },
                              )
                            : await reglasCorreccionService.crear({
                                  tipo_respuesta: cambio.tipo_respuesta,
                                  parametros: cambio.parametros,
                                  activo: cambio.activo,
                              });

                    exitosos.push(cambio.tipo_respuesta);
                    guardadas.push(regla);
                } catch (error) {
                    fallidos.push({
                        tipo: cambio.tipo_respuesta,
                        mensaje: mensajeDeError(
                            error,
                            'No se pudo guardar la regla de corrección.',
                        ),
                        estado: estadoHttp(error),
                    });
                }
            }

            // Refleja de inmediato lo guardado aunque la recarga falle.
            if (guardadas.length > 0) {
                setReglas((actuales) => {
                    const porTipo = new Map(
                        actuales.map((regla) => [
                            regla.tipo_respuesta,
                            regla,
                        ]),
                    );

                    for (const regla of guardadas) {
                        porTipo.set(regla.tipo_respuesta, regla);
                    }

                    return [...porTipo.values()];
                });
            }

            await consultar(true);
            setGuardando(false);

            return { exitosos, fallidos };
        },
        [consultar],
    );

    return {
        reglas,
        cargando,
        errorCarga,
        guardando,
        cargar,
        guardar,
    };
}
