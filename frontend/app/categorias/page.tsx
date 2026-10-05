
'use client';

import { useState } from 'react';

import { CategoriaForm } from '@/features/categorias/components/CategoriaForm';
import { CategoriaList } from '@/features/categorias/components/CategoriaList';
import { useCategorias } from '@/features/categorias/hooks/useCategorias';
import type { Categoria } from '@/features/categorias/types';

export default function CategoriasPage() {
  const {
    categorias,
    isLoading,
    error,
    refetch,
  } = useCategorias();

  const [categoriaEditar, setCategoriaEditar] =
    useState<Categoria | null>(null);

  if (isLoading) {
    return <p className="p-8">Cargando categorías...</p>;
  }

  if (error) {
    return <p className="p-8">{error}</p>;
  }

  return (
    <main className="max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold">
        Categorías
      </h1>

      <CategoriaForm
        categoriaEditar={categoriaEditar}
        onGuardado={async () => {
          await refetch();
          setCategoriaEditar(null);
        }}
        onCancelar={() => setCategoriaEditar(null)}
      />

      <CategoriaList
        categorias={categorias}
        onEditar={setCategoriaEditar}
        onEliminado={refetch}
      />
    </main>
  );
}
