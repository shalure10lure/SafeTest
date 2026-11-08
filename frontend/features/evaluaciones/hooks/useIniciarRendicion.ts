'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type { RendicionEstudiante } from '../types';

export function useIniciarRendicion() {
    const [rendicion, setRendicion] = useState<RendicionEstudiante | null>(
        null,
    );
    const [iniciando, setIniciando] = useState(false);
    const [error, setError] = useState('');
    const montado = useRef(false);
    const solicitudEnCurso = useRef(false);

    useEffect(() => {
        montado.current = true;
        return () => {
            montado.current = false;
        };
    }, []);

    const iniciarORecuperar = useCallback(
        async (examenId: number, paraleloId: number) => {
            if (solicitudEnCurso.current) return null;

            solicitudEnCurso.current = true;
            setIniciando(true);
            setError('');

            try {
                const resultado =
                    await evaluacionesService.iniciarORecuperarRendicion(
                        examenId,
                        paraleloId,
                    );
                if (montado.current) setRendicion(resultado);
                return resultado;
            } catch (errorInicio) {
                if (montado.current) {
                    setError(
                        mensajeDeError(
                            errorInicio,
                            'No se pudo iniciar la evaluación.',
                        ),
                    );
                }
                return null;
            } finally {
                solicitudEnCurso.current = false;
                if (montado.current) setIniciando(false);
            }
        },
        [],
    );

    return { rendicion, iniciando, error, iniciarORecuperar };
}
