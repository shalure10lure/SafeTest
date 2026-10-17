'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { paralelosService } from '../services/paralelos.service';
import { materiasService } from '@/features/materias/services/materias.service';
import { periodosService } from '@/features/periodos/services/periodos.service';

import type { Paralelo } from '../types';
import type { Materia } from '@/features/materias/types';
import type { Periodo } from '@/features/periodos/types';

interface Props {
  id?: number;
}

export default function ParaleloForm({ id }: Props) {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [materiaId, setMateriaId] = useState('');
  const [semestreId, setSemestreId] = useState('');

  const [materias, setMaterias] = useState<Materia[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarDatos() {
      try {
        setCargando(true);
        setError('');

        const [listaMaterias, listaPeriodos] = await Promise.all([
          materiasService.getAll(),
          periodosService.getAll(),
        ]);

        setMaterias(listaMaterias);
        setPeriodos(listaPeriodos);

        if (id !== undefined) {
          const paralelo: Paralelo =
            await paralelosService.getById(id);

          setNombre(paralelo.nombre_paralelo);
          setMateriaId(String(paralelo.materia_id));
          setSemestreId(String(paralelo.semestre_id));
        }
      } catch {
        setError(
          'No se pudieron cargar los datos. Verifica tu sesión y la conexión con el servidor.',
        );
      } finally {
        setCargando(false);
      }
    }

    void cargarDatos();
  }, [id]);

  async function manejarEnvio(
    evento: React.FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();
    setError('');

    if (!nombre.trim() || !materiaId || !semestreId) {
      setError('Completa todos los campos.');
      return;
    }

    try {
      setGuardando(true);

      const datos = {
        nombre_paralelo: nombre.trim(),
        materia_id: Number(materiaId),
        semestre_id: Number(semestreId),
      };

      if (id !== undefined) {
        await paralelosService.update(id, datos);
      } else {
        await paralelosService.create(datos);
      }

      router.push('/docente/paralelos');
      router.refresh();
    } catch {
      setError(
        'No se pudo guardar el paralelo. Revisa los datos e inténtalo nuevamente.',
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Cargando formulario...
      </p>
    );
  }

  return (
    <form
      onSubmit={manejarEnvio}
      className="max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6"
    >
      <div>
        <label
          htmlFor="nombre"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Nombre del paralelo
        </label>

        <input
          id="nombre"
          type="text"
          maxLength={100}
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Paralelo A"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor="materia"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Materia
        </label>

        <select
          id="materia"
          required
          value={materiaId}
          onChange={(e) => setMateriaId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
        >
          <option value="">Selecciona una materia</option>

          {materias.map((materia) => (
            <option
              key={materia.materia_id}
              value={materia.materia_id}
            >
              {materia.nombre}
            </option>
          ))}
        </select>

        {materias.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Primero debes registrar una materia.
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="periodo"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Periodo académico
        </label>

        <select
          id="periodo"
          required
          value={semestreId}
          onChange={(e) => setSemestreId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
        >
          <option value="">Selecciona un periodo</option>

          {periodos.map((periodo) => (
            <option
              key={periodo.semestre_id}
              value={periodo.semestre_id}
            >
              {periodo.gestion}
            </option>
          ))}
        </select>

        {periodos.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">
            Primero debes registrar un periodo académico.
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={() => router.push('/docente/paralelos')}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={
            guardando ||
            materias.length === 0 ||
            periodos.length === 0
          }
          className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando
            ? 'Guardando...'
            : id !== undefined
              ? 'Guardar cambios'
              : 'Crear paralelo'}
        </button>
      </div>
    </form>
  );
}