'use client';

import { useCallback, useEffect, useState } from 'react';

import { paralelosService } from '../services/paralelos.service';

import type {
  Paralelo,
  CreateParaleloDto,
  UpdateParaleloDto,
} from '../types';

export function useParalelos() {
  const [paralelos, setParalelos] = useState<Paralelo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarParalelos = useCallback(async () => {
    setCargando(true);
    setError('');

    try {
      const datos = await paralelosService.getAll();
      setParalelos(datos);
    } catch {
      setError('No se pudieron cargar los paralelos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarParalelos();
  }, [cargarParalelos]);

  async function crearParalelo(datos: CreateParaleloDto) {
    setError('');

    try {
      await paralelosService.create(datos);
      await cargarParalelos();
    } catch {
      setError('No se pudo crear el paralelo. Verifica los datos.');
      throw new Error('Error al crear el paralelo');
    }
  }

  async function actualizarParalelo(
    id: number,
    datos: UpdateParaleloDto,
  ) {
    setError('');

    try {
      await paralelosService.update(id, datos);
      await cargarParalelos();
    } catch {
      setError('No se pudo actualizar el paralelo.');
      throw new Error('Error al actualizar el paralelo');
    }
  }

  return {
    paralelos,
    cargando,
    error,
    cargarParalelos,
    crearParalelo,
    actualizarParalelo,
  };
}