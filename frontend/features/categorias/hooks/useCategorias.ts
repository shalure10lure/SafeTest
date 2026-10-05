'use client';

import { useCallback, useEffect, useState } from 'react';

import { categoriasService } from '../services/categorias.service';
import type { Categoria } from '../types';

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarCategorias = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await categoriasService.getAll();

      setCategorias(data);
    } catch {
      setError('No se pudieron cargar las categorías');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  return {
    categorias,
    isLoading,
    error,
    refetch: cargarCategorias,
  };
}