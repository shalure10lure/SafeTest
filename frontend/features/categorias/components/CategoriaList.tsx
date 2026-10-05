'use client';

import { categoriasService } from '../services/categorias.service';
import type { Categoria } from '../types';

interface CategoriaListProps {
  categorias: Categoria[];
  onEditar: (categoria: Categoria) => void;
  onEliminado: () => Promise<void>;
}

export function CategoriaList({
  categorias,
  onEditar,
  onEliminado,
}: CategoriaListProps) {
  async function eliminar(id: number) {
    const confirmar = window.confirm(
      '¿Estás seguro de eliminar esta categoría?',
    );

    if (!confirmar) {
      return;
    }

    await categoriasService.eliminar(id);

    await onEliminado();
  }

  if (categorias.length === 0) {
    return <p>No hay categorías registradas.</p>;
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">
        Categorías registradas
      </h2>

      <div className="space-y-3">
        {categorias.map((categoria) => (
          <div
            key={categoria.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <h3 className="font-semibold">
                {categoria.nombre}
              </h3>

              <p className="text-sm text-gray-600">
                {categoria.descripcion ??
                  'Sin descripción'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEditar(categoria)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Editar
              </button>

              <button
                type="button"
                onClick={() =>
                  eliminar(categoria.id)
                }
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}