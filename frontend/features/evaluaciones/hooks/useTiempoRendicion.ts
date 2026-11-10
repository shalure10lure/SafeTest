'use client';

import { useEffect, useState } from 'react';

import { mensajeDeError } from '../mensaje-error';
import {
  rendicionTiempoService,
  type EstadoTiempoRendicion,
} from '../services/rendicion-tiempo.service';

/**
 * Sincroniza el reloj con el servidor y no con la hora de inicio del navegador.
 * performance.now() hace que el descuento no dependa de cambios en el reloj
 * del sistema mientras la pestaña está abierta.
 *
 * El reloj solo controla la interfaz. NestJS/PostgreSQL autorizan cada guardado.
 */
export function useTiempoRendicion(examenId: number) {
  const [estado, setEstado] = useState<EstadoTiempoRendicion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    let solicitando = false;
    let vencimientoMonotonico: number | null = null;

    setEstado(null);
    setSegundosRestantes(null);
    setCargando(true);
    setError('');

    function actualizarContador() {
      if (vencimientoMonotonico === null) {
        setSegundosRestantes(null);
        return;
      }

      const restantes = Math.max(
        0,
        Math.ceil((vencimientoMonotonico - performance.now()) / 1000),
      );
      setSegundosRestantes(restantes);
    }

    async function sincronizar() {
      if (!activo || solicitando) return;
      solicitando = true;

      // Medimos la duración de la solicitud para aproximar cuándo se recibió
      // la hora devuelta por el servidor (la mitad del viaje de ida y vuelta).
      const inicioSolicitud = performance.now();

      try {
        const datos = await rendicionTiempoService.obtenerEstado(examenId);
        const finSolicitud = performance.now();
        if (!activo) return;

        if (datos.fecha_limite !== null) {
          const servidorMs = Date.parse(datos.tiempo_servidor);
          const limiteMs = Date.parse(datos.fecha_limite);

          if (!Number.isFinite(servidorMs) || !Number.isFinite(limiteMs)) {
            throw new Error('El servidor devolvió fechas de rendición inválidas.');
          }

          const mitadViajeMs = Math.max(
            0,
            (finSolicitud - inicioSolicitud) / 2,
          );

          const restanteMs = limiteMs - servidorMs - mitadViajeMs;
          vencimientoMonotonico = finSolicitud + Math.max(0, restanteMs);
        } else {
          vencimientoMonotonico = null;
        }

        setEstado(datos);
        setError('');
        actualizarContador();
      } catch (errorConsulta) {
        if (!activo) return;
        setError(
          mensajeDeError(
            errorConsulta,
            'No se pudo sincronizar el tiempo de la evaluación.',
          ),
        );
        // Mantenemos la última sincronización para no reiniciar el contador.
        // El backend sigue rechazando las respuestas vencidas.
      } finally {
        solicitando = false;
        if (activo) setCargando(false);
      }
    }

    void sincronizar();

    const reloj = window.setInterval(actualizarContador, 1000);
    const consulta = window.setInterval(() => {
      void sincronizar();
    }, 5000);

    const reactivar = () => {
      if (document.visibilityState === 'visible') {
        void sincronizar();
      }
    };

    document.addEventListener('visibilitychange', reactivar);
    window.addEventListener('focus', reactivar);

    return () => {
      activo = false;
      window.clearInterval(reloj);
      window.clearInterval(consulta);
      document.removeEventListener('visibilitychange', reactivar);
      window.removeEventListener('focus', reactivar);
    };
  }, [examenId, intento]);

  const vencidaEnPantalla =
    segundosRestantes !== null && segundosRestantes === 0;

  const bloqueada =
    estado === null || !estado.puede_responder || vencidaEnPantalla;

  return {
    estado,
    cargando,
    error,
    segundosRestantes,
    bloqueada,
    reintentar: () => setIntento((anterior) => anterior + 1),
  };
}
