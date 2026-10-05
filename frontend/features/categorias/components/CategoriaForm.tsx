'use client';

import { FormEvent, useState } from 'react';

import { categoriasService } from '../services/categorias.service';
import type { Categoria } from '../types';

interface CategoriaFormProps {
  categoriaEditar?: Categoria | null;
  onGuardado: () => Promise<void>;
  onCancelar?: () => void;
}

export function CategoriaForm({
  categoriaEditar = null,
  onGuardado,
  onCancelar,
}: CategoriaFormProps) {
  const [nombre, setNombre] = useState(
    categoriaEditar?.nombre ?? '',
  );

  const [descripcion, setDescripcion] = useState(
    categoriaEditar?.descripcion ?? '',
  );

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nombre.trim()) {
      setMensaje('El nombre es obligatorio');
      return;
    }

    try {
      setGuardando(true);
      setMensaje('');

      if (categoriaEditar) {
        await categoriasService.update(categoriaEditar.id, {
          nombre,
          descripcion,
        });
      } else {
        await categoriasService.create({
          nombre,
          descripcion,
        });
      }

      setNombre('');
      setDescripcion('');

      await onGuardado();
    } catch {
      setMensaje('No se pudo guardar la categoría');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={guardar}
      className="mb-8 space-y-4 rounded-lg border p-4"
    >
      <h2 className="text-lg font-semibold">
        {categoriaEditar
          ? 'Editar categoría'
          : 'Nueva categoría'}
      </h2>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Nombre
        </label>

        <input
          value={nombre}
          onChange={(event) =>
            setNombre(event.target.value)
          }
          className="w-full rounded-md border px-3 py-2"
          placeholder="Ej. Química"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Descripción
        </label>

        <input
          value={descripcion}
          onChange={(event) =>
            setDescripcion(event.target.value)
          }
          className="w-full rounded-md border px-3 py-2"
          placeholder="Descripción"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>

        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-md border px-4 py-2"
          >
            Cancelar
          </button>
        )}
      </div>

      {mensaje && (
        <p className="text-sm">{mensaje}</p>
      )}
    </form>
  );
}