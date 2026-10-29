
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  X,
} from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";

import {
  estudianteInvitacionesService,
  type InvitacionEstudiante,
} from "@/features/invitacion/services/estudiante-invitaciones.service";

function obtenerError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.message;
    if (typeof mensaje === "string") return mensaje;
    if (Array.isArray(mensaje)) return mensaje.join(", ");
  }
  return "No se pudo completar la operación.";
}

export default function DetalleInvitacionPage() {
  const params = useParams<{ id: string }>();
  const invitacionId = Number(params.id);

  const { usuario, isInitializing } = useAuth();

  const [invitacion, setInvitacion] =
    useState<InvitacionEstudiante | null>(null);

  const [cargando, setCargando] = useState(true);
  const [confirmar, setConfirmar] = useState(false);
  const [aceptando, setAceptando] = useState(false);
  const [aceptada, setAceptada] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isInitializing) return;

    if (
      usuario?.tipo !== "estudiante" ||
      !Number.isSafeInteger(invitacionId) ||
      invitacionId <= 0
    ) {
      setError("La invitación no es válida.");
      setCargando(false);
      return;
    }

    let activo = true;

    estudianteInvitacionesService
      .listar()
      .then((lista) => {
        if (!activo) return;

        const encontrada = lista.find(
          (item) => item.invitacion_id === invitacionId,
        );

        if (encontrada) {
          setInvitacion(encontrada);
        } else {
          setError("No encontramos esta invitación.");
        }
      })
      .catch((err) => {
        if (activo) setError(obtenerError(err));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [
    invitacionId,
    isInitializing,
    usuario?.id,
    usuario?.tipo,
  ]);

  async function aceptar() {
    if (!invitacion || aceptando || aceptada) return;

    setAceptando(true);
    setError("");

    try {
      await estudianteInvitacionesService.aceptar(
        invitacion.invitacion_id,
      );

      setConfirmar(false);
      setAceptada(true);
    } catch (err) {
      setError(obtenerError(err));
      setConfirmar(false);
    } finally {
      setAceptando(false);
    }
  }

  if (isInitializing || cargando) {
    return (
      <main className="p-6 text-sm text-slate-500">
        Consultando invitación...
      </main>
    );
  }

  if (error && !invitacion) {
    return (
      <main className="space-y-4 p-6">
        <p role="alert" className="text-red-600">
          {error}
        </p>
        <Link
          href="/estudiante/invitaciones"
          className="font-medium text-blue-600"
        >
          Volver a invitaciones
        </Link>
      </main>
    );
  }

  if (!invitacion) return null;

  if (aceptada) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2
              size={40}
              className="text-emerald-600"
            />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            ¡Invitación aceptada!
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Ahora formas parte de{" "}
            <strong>{invitacion.paralelo.nombre}</strong>.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {invitacion.paralelo.materia}
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <Link
              href="/estudiante"
              className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              Ir a mi panel
            </Link>

            <Link
              href="/estudiante/invitaciones"
              className="rounded-lg border border-slate-200 px-5 py-3 font-medium text-slate-700"
            >
              Volver a invitaciones
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const pendiente = invitacion.estado === "pendiente";

  return (
    <main className="min-h-full space-y-6 p-6">
      <Link
        href="/estudiante/invitaciones"
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-700"
      >
        <ArrowLeft size={16} />
        Volver a invitaciones
      </Link>

      <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
            <Mail size={23} />
          </div>

          <h1 className="text-xl font-semibold text-slate-900">
            {invitacion.paralelo.materia ?? "Invitación"}
          </h1>

          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            pendiente
              ? "bg-amber-50 text-amber-700"
              : invitacion.estado === "aceptada"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
          }`}>
            {pendiente
              ? "Pendiente"
              : invitacion.estado === "aceptada"
                ? "Aceptada"
                : "Vencida"}
          </span>
        </div>

        <div className="mt-7 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">
              Materia
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {invitacion.paralelo.materia ?? "—"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500">
              Paralelo
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {invitacion.paralelo.nombre}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500">
              Docente
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {invitacion.paralelo.docente ?? "—"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500">
              Periodo
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {invitacion.paralelo.periodo ?? "—"}
            </p>
          </div>
        </div>

        {pendiente && (
          <p className="mt-7 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
            Has sido invitado a formar parte de este paralelo.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Link
            href="/estudiante/invitaciones"
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700"
          >
            Ahora no
          </Link>

          {pendiente && (
            <button
              type="button"
              onClick={() => setConfirmar(true)}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Aceptar invitación
            </button>
          )}
        </div>
      </section>

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmacion"
            className="w-full max-w-sm rounded-xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <h2
                  id="titulo-confirmacion"
                  className="font-semibold text-slate-900"
                >
                  ¿Aceptar invitación?
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Te incorporarás a{" "}
                  {invitacion.paralelo.materia} —
                  {" "}{invitacion.paralelo.nombre}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfirmar(false)}
                disabled={aceptando}
                aria-label="Cerrar"
                className="text-slate-500"
              >
                <X size={19} />
              </button>
            </div>

            <p className="p-5 text-sm text-slate-500">
              Docente: {invitacion.paralelo.docente ?? "—"}
              <br />
              Periodo: {invitacion.paralelo.periodo ?? "—"}
            </p>

            <div className="flex justify-end gap-3 border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setConfirmar(false)}
                disabled={aceptando}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={aceptar}
                disabled={aceptando}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {aceptando ? "Aceptando..." : "Aceptar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
