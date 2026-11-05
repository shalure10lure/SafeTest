
"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import {
  AlertCircle,
  Mail,
  Users,
} from "lucide-react";

import {
  paraleloEstudiantesService,
  type EstudiantesParaleloResponse,
} from "../services/paralelo-estudiantes.service";

interface Props {
  paraleloId: number;
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

  return "No se pudieron cargar los estudiantes.";
}

export default function EstudiantesParalelo({
  paraleloId,
}: Props) {
  const [datos, setDatos] =
    useState<EstudiantesParaleloResponse | null>(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarEstudiantes() {
      setCargando(true);
      setError("");
      setDatos(null);

      try {
        const respuesta =
          await paraleloEstudiantesService.listar(
            paraleloId,
          );

        if (activo) {
          setDatos(respuesta);
        }
      } catch (err) {
        if (activo) {
          setError(obtenerMensajeError(err));
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    if (
      Number.isSafeInteger(paraleloId) &&
      paraleloId > 0
    ) {
      void cargarEstudiantes();
    } else {
      setError("El paralelo no es válido.");
      setCargando(false);
    }

    return () => {
      activo = false;
    };
  }, [paraleloId]);

  if (cargando) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Cargando estudiantes del paralelo...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
      >
        <AlertCircle
          size={20}
          className="shrink-0"
        />
        <p>{error}</p>
      </div>
    );
  }

  if (!datos) return null;

  return (
    <section className="space-y-5">
      {/* ENCABEZADO DEL PARALELO */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Estudiantes de {datos.paralelo.nombre}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {datos.paralelo.materia ?? "Sin materia"}
            {" · "}
            {datos.paralelo.periodo ?? "Sin periodo"}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
          <Users size={18} />
          {datos.total_estudiantes}
          {" "}
          {datos.total_estudiantes === 1
            ? "estudiante"
            : "estudiantes"}
        </div>
      </div>

      {/* LISTADO */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {datos.estudiantes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users
              size={38}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 font-semibold text-slate-900">
              Todavía no hay estudiantes inscritos
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Los estudiantes aparecerán aquí cuando
              acepten sus invitaciones a este paralelo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">
                    N.º
                  </th>
                  <th className="px-5 py-4">
                    Estudiante
                  </th>
                  <th className="px-5 py-4">
                    Correo institucional
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {datos.estudiantes.map(
                  (estudiante, indice) => (
                    <tr
                      key={estudiante.estudiante_id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-slate-500">
                        {indice + 1}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-900">
                        {estudiante.nombre_completo}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <Mail
                            size={15}
                            className="text-slate-400"
                          />

                          {estudiante.correo_institucional}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
