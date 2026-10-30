
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Mail,
} from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";

import {
  aceptacionInvitacionService,
  type InvitacionConsultada,
} from "@/features/invitacion/services/aceptacion-invitacion.service";

function obtenerError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.message;

    if (Array.isArray(mensaje)) {
      return mensaje.join(", ");
    }

    if (typeof mensaje === "string") {
      return mensaje;
    }
  }

  return "No se pudo procesar la invitación.";
}

export default function AceptarInvitacionPage() {
  const router = useRouter();

  const {
    usuario,
    isInitializing,
    logout,
  } = useAuth();

  const [token, setToken] = useState("");
  const [invitacion, setInvitacion] =
    useState<InvitacionConsultada | null>(null);

  const [cargando, setCargando] = useState(true);
  const [aceptando, setAceptando] = useState(false);
  const [aceptada, setAceptada] = useState(false);
  const [cambiandoCuenta, setCambiandoCuenta] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (isInitializing) return;

    // El token viene del enlace enviado en HU-04.
    const tokenUrl = new URLSearchParams(
      window.location.search,
    ).get("token");

    if (!tokenUrl || !/^[a-f0-9]{64}$/.test(tokenUrl)) {
      setError("El enlace de invitación no es válido.");
      setCargando(false);
      return;
    }

    setToken(tokenUrl);

    // Si no inició sesión, conservamos el enlace
    // para recuperarlo después del login.
    if (!usuario) {
      const retorno =
        `/invitaciones/aceptar?token=${tokenUrl}`;

      router.replace(
        `/login?next=${encodeURIComponent(retorno)}`,
      );
      return;
    }

    // Solo las cuentas estudiantiles pueden consultar
    // la invitación.
    if (usuario.tipo !== "estudiante") {
      setCargando(false);
      return;
    }

    let activo = true;

    async function consultarInvitacion() {
      setCargando(true);
      setError("");

      try {
        const resultado =
          await aceptacionInvitacionService.consultar(
            tokenUrl!,
          );

        if (activo) {
          setInvitacion(resultado);
        }
      } catch (err) {
        if (activo) {
          setError(obtenerError(err));
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    void consultarInvitacion();

    return () => {
      activo = false;
    };
  }, [isInitializing, usuario, router]);

  async function aceptarInvitacion() {
    if (!token || aceptando || aceptada) return;

    setError("");
    setAceptando(true);

    try {
      await aceptacionInvitacionService.aceptar(token);
      setAceptada(true);
    } catch (err) {
      setError(obtenerError(err));
    } finally {
      setAceptando(false);
    }
  }

  async function cambiarCuenta() {
    setError("");
    setCambiandoCuenta(true);

    try {
      await logout();

      router.replace(
        `/login?next=${encodeURIComponent(
          `/invitaciones/aceptar?token=${token}`,
        )}`,
      );
    } catch (err) {
      setError(obtenerError(err));
      setCambiandoCuenta(false);
    }
  }

  // ESPERAR A QUE AUTH PROVIDER VERIFIQUE LA SESIÓN
  if (isInitializing || cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-500">
            Verificando tu invitación...
          </p>
        </div>
      </main>
    );
  }

  // DOCENTE U OTRO ROL
  if (usuario && usuario.tipo !== "estudiante") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
          <AlertCircle
            size={36}
            className="mx-auto text-amber-600"
          />

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Necesitas una cuenta de estudiante
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Las invitaciones a paralelos solamente
            pueden aceptarse desde una cuenta estudiantil.
          </p>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={cambiarCuenta}
            disabled={cambiandoCuenta}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {cambiandoCuenta
              ? "Cerrando sesión..."
              : "Entrar como estudiante"}
          </button>
        </section>
      </main>
    );
  }

  // ERROR: TOKEN INVÁLIDO, EXPIRADO O CORREO DISTINTO
  if (error && !invitacion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
          <AlertCircle
            size={38}
            className="mx-auto text-red-600"
          />

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            No se puede consultar la invitación
          </h1>

          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>

          <Link
            href="/estudiante"
            className="mt-6 inline-block font-semibold text-blue-600 hover:underline"
          >
            Volver a mi panel
          </Link>
        </section>
      </main>
    );
  }

  if (!invitacion) {
    return null;
  }

  // INVITACIÓN ACEPTADA CORRECTAMENTE
  if (aceptada) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
          <CheckCircle2
            size={52}
            className="mx-auto text-green-600"
          />

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            ¡Invitación aceptada!
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Ya formas parte del paralelo{" "}
            <strong>{invitacion.paralelo.nombre}</strong>.
          </p>

          <Link
            href="/estudiante"
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Ir a mi panel
            <ArrowRight size={18} />
          </Link>
        </section>
      </main>
    );
  }

  // INVITACIÓN VÁLIDA: MOSTRAR DATOS Y BOTÓN
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">
          <GraduationCap size={27} />
        </div>

        <h1 className="text-2xl font-bold text-slate-950">
          Invitación a un paralelo
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Has recibido una invitación para unirte
          a un grupo académico de SafeTest.
        </p>

        <div className="mt-7 space-y-4 rounded-lg bg-slate-50 p-5">
          <div>
            <p className="text-xs font-medium uppercase text-slate-500">
              Paralelo
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {invitacion.paralelo.nombre}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-slate-500">
              Materia
            </p>

            <p className="mt-1 text-slate-800">
              {invitacion.paralelo.materia ??
                "Sin información"}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail size={17} />
            {invitacion.correo_institucional}
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays size={17} />

            Válida hasta:{" "}
            {new Date(
              invitacion.fecha_expiracion,
            ).toLocaleString("es-BO")}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={aceptarInvitacion}
          disabled={aceptando}
          className="mt-7 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {aceptando
            ? "Aceptando invitación..."
            : "Aceptar invitación"}
        </button>

        <Link
          href="/estudiante"
          className="mt-4 block text-center text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Ahora no
        </Link>
      </section>
    </main>
  );
}
