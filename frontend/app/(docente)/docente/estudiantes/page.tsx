
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import {
  AlertCircle,
  Info,
  RefreshCw,
  Users,
} from "lucide-react";

import { useParalelos } from "@/features/paralelos/hooks/useParalelos";

import { paraleloEstudiantesService } from "@/features/paralelos/services/paralelo-estudiantes.service";

interface FilaEstudiante {
  estudiante_id: number;
  nombre_completo: string;
  correo_institucional: string;

  paralelo_id: number;
  nombre_paralelo: string;
  materia: string | null;
}

function obtenerMensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.message;

    if (typeof mensaje === "string") {
      return mensaje;
    }

    if (Array.isArray(mensaje)) {
      return mensaje.join(", ");
    }
  }

  return "No se pudieron consultar los estudiantes.";
}

function nombreCompletoParalelo(
  materia: string | null,
  paralelo: string,
): string {
  return materia
    ? `${materia} · ${paralelo}`
    : paralelo;
}

export default function MisEstudiantesPage() {
  // Reutilizamos los paralelos que ya carga SafeTest.
  const { paralelos } = useParalelos();

  const [estudiantes, setEstudiantes] = useState<
    FilaEstudiante[]
  >([]);

  const [paraleloSeleccionado, setParaleloSeleccionado] =
    useState("todos");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [reintento, setReintento] = useState(0);

  // Una clave estable para volver a consultar
  // cuando cambien los paralelos del docente.
  const idsParalelos = paralelos
    .map((paralelo) => paralelo.paralelo_id)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    let activo = true;

    async function cargarEstudiantes() {
      setCargando(true);
      setError("");

      if (!idsParalelos) {
        setEstudiantes([]);
        setCargando(false);
        return;
      }

      try {
        const ids = idsParalelos
          .split(",")
          .map(Number);

        // Reutilizamos el endpoint seguro
        // que construimos en HU-06.
        const respuestas = await Promise.all(
          ids.map((id) =>
            paraleloEstudiantesService.listar(id),
          ),
        );

        // Convertir los resultados de varios paralelos
        // en una única tabla general.
        const filas: FilaEstudiante[] =
          respuestas.flatMap((respuesta) =>
            respuesta.estudiantes.map((estudiante) => ({
              estudiante_id: estudiante.estudiante_id,
              nombre_completo:
                estudiante.nombre_completo,
              correo_institucional:
                estudiante.correo_institucional,

              paralelo_id:
                respuesta.paralelo.paralelo_id,
              nombre_paralelo:
                respuesta.paralelo.nombre,
              materia:
                respuesta.paralelo.materia,
            })),
          );

        // Agrupar visualmente por materia y paralelo.
        filas.sort((a, b) => {
          const paraleloA = nombreCompletoParalelo(
            a.materia,
            a.nombre_paralelo,
          );

          const paraleloB = nombreCompletoParalelo(
            b.materia,
            b.nombre_paralelo,
          );

          const comparacionParalelos =
            paraleloA.localeCompare(
              paraleloB,
              "es",
            );

          if (comparacionParalelos !== 0) {
            return comparacionParalelos;
          }

          return a.nombre_completo.localeCompare(
            b.nombre_completo,
            "es",
          );
        });

        if (activo) {
          setEstudiantes(filas);
        }
      } catch (err) {
        if (activo) {
          setEstudiantes([]);
          setError(obtenerMensajeError(err));
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void cargarEstudiantes();

    return () => {
      activo = false;
    };
  }, [idsParalelos, reintento]);

  // Filtrar la tabla sin volver a llamar al backend.
  const estudiantesFiltrados =
    paraleloSeleccionado === "todos"
      ? estudiantes
      : estudiantes.filter(
          (estudiante) =>
            estudiante.paralelo_id ===
            Number(paraleloSeleccionado),
        );

  return (
    <main className="min-h-full space-y-5 bg-slate-50 p-5 sm:p-6">
      {/* INFORMACIÓN Y FILTRO */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Info
            size={16}
            className="shrink-0 text-violet-500"
          />

          <span>
            Solo estudiantes asociados a tus paralelos.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="filtro-paralelo"
            className="sr-only"
          >
            Filtrar por paralelo
          </label>

          <select
            id="filtro-paralelo"
            value={paraleloSeleccionado}
            onChange={(event) =>
              setParaleloSeleccionado(
                event.target.value,
              )
            }
            className="min-w-56 max-w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="todos">
              Todos mis paralelos
            </option>

            {paralelos.map((paralelo) => (
              <option
                key={paralelo.paralelo_id}
                value={paralelo.paralelo_id}
              >
                {nombreCompletoParalelo(
                  paralelo.materia?.nombre ?? null,
                  paralelo.nombre_paralelo,
                )}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ERROR AL CONSULTAR */}
      {error && (
        <section
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              size={20}
              className="shrink-0 text-red-600"
            />

            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setReintento((actual) => actual + 1)
            }
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <RefreshCw size={15} />
            Reintentar
          </button>
        </section>
      )}

      {/* TABLA */}
      {!error && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">
                    Estudiante
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Correo
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Paralelo
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* CARGANDO */}
                {cargando && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      Cargando estudiantes...
                    </td>
                  </tr>
                )}

                {/* FILAS REALES */}
                {!cargando &&
                  estudiantesFiltrados.map(
                    (estudiante) => (
                      <tr
                        key={`${estudiante.paralelo_id}-${estudiante.estudiante_id}`}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {estudiante.nombre_completo}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {estudiante.correo_institucional}
                        </td>

                        <td className="px-5 py-4 text-slate-800">
                          {nombreCompletoParalelo(
                            estudiante.materia,
                            estudiante.nombre_paralelo,
                          )}
                        </td>
                      </tr>
                    ),
                  )}

                {/* SIN ESTUDIANTES */}
                {!cargando &&
                  estudiantesFiltrados.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-14 text-center"
                      >
                        <Users
                          size={36}
                          className="mx-auto text-slate-300"
                        />

                        <p className="mt-3 font-medium text-slate-800">
                          No hay estudiantes para mostrar
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {paraleloSeleccionado ===
                          "todos"
                            ? "Los estudiantes aparecerán cuando acepten invitaciones a tus paralelos."
                            : "Este paralelo todavía no tiene estudiantes inscritos."}
                        </p>
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
