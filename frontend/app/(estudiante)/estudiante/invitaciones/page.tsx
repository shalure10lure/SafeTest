
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Mail, RefreshCw } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  estudianteInvitacionesService,
  type InvitacionEstudiante,
} from "@/features/invitacion/services/estudiante-invitaciones.service";

function textoError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.message;
    if (typeof mensaje === "string") return mensaje;
    if (Array.isArray(mensaje)) return mensaje.join(", ");
  }
  return "No se pudieron cargar tus invitaciones.";
}

function fechaCorta(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-BO");
}

export default function MisInvitacionesPage() {
  const { usuario, isInitializing } = useAuth();

  const [invitaciones, setInvitaciones] =
    useState<InvitacionEstudiante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isInitializing) return;

    if (usuario?.tipo !== "estudiante") {
      setCargando(false);
      return;
    }

    let activo = true;

    estudianteInvitacionesService
      .listar()
      .then((datos) => {
        if (activo) setInvitaciones(datos);
      })
      .catch((err) => {
        if (activo) setError(textoError(err));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [isInitializing, usuario?.id, usuario?.tipo]);

  const pendientes = invitaciones.filter(
    (item) => item.estado === "pendiente",
  ).length;

  if (isInitializing || cargando) {
    return (
      <main className="p-6 text-sm text-slate-500">
        Cargando tus invitaciones...
      </main>
    );
  }

  return (
    <main className="min-h-full space-y-6 p-6">
      <div>
        <p className="mb-2 text-sm text-slate-500">
          SafeTest / Estudiante / Invitaciones
        </p>

        <h1 className="text-2xl font-semibold text-slate-900">
          Invitaciones
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {pendientes === 0
            ? "No tienes invitaciones pendientes."
            : `Tienes ${pendientes} invitación(es) pendiente(s).`}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800"
        >
          <p className="font-semibold">
            No se pudo mostrar tu bandeja
          </p>
          <p className="mt-2">{error}</p>
          <p className="mt-2">
            Si todavía no verificaste tu correo, abre
            primero un enlace de invitación recibido
            en tu bandeja de entrada.
          </p>
        </div>
      )}

      {!error && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Materia</th>
                  <th className="px-5 py-4">Paralelo</th>
                  <th className="px-5 py-4">Docente</th>
                  <th className="px-5 py-4">Periodo</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Acción</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {invitaciones.map((invitacion) => (
                  <tr
                    key={invitacion.invitacion_id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {invitacion.paralelo.materia ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {invitacion.paralelo.nombre}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {invitacion.paralelo.docente ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {invitacion.paralelo.periodo ?? "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          invitacion.estado === "pendiente"
                            ? "bg-amber-50 text-amber-700"
                            : invitacion.estado === "aceptada"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {invitacion.estado === "pendiente"
                          ? "Pendiente"
                          : invitacion.estado === "aceptada"
                            ? "Aceptada"
                            : "Vencida"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/estudiante/invitaciones/${invitacion.invitacion_id}`}
                        className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Ver invitación
                      </Link>
                    </td>
                  </tr>
                ))}

                {invitaciones.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center"
                    >
                      <Mail
                        size={34}
                        className="mx-auto text-slate-400"
                      />
                      <p className="mt-3 font-medium text-slate-700">
                        Todavía no tienes invitaciones
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Aparecerán cuando un docente
                        te invite a un paralelo.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {invitaciones.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              Mostrando las invitaciones más recientes.
              Fechas registradas desde el envío.
              <RefreshCw size={12} className="ml-2 inline" />
              {" "}Última consulta: {fechaCorta(new Date().toISOString())}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
