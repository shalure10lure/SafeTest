"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "../hooks/useAuth";

import { rutaSeguraAceptacion } from "@/features/invitacion/services/aceptacion-invitacion.service";

export default function LoginForm() {
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [recordarme, setRecordarme] = useState(false);

  const [registroHref, setRegistroHref] =
    useState("/registro");

  useEffect(() => {
    const parametros = new URLSearchParams(
      window.location.search,
    );

    const retorno = rutaSeguraAceptacion(
      parametros.get("next"),
    );

    if (retorno) {
      setRegistroHref(
        `/registro?next=${encodeURIComponent(retorno)}`,
      );
    }
  }, []);

  const {
    login,
    isLoading: loading,
    error,
  } = useAuth();

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    try {
      const usuario = await login({
        correo,
        password,
      });

      if (usuario.tipo === "docente") {
        router.replace("/docente");
        return;
      }


      if (usuario.tipo === "estudiante") {
        const parametros = new URLSearchParams(
          window.location.search,
        );

        const retorno = rutaSeguraAceptacion(
          parametros.get("next"),
        );

        router.replace(retorno ?? "/estudiante");
      }

    } catch {
      // useAuth administra y muestra el error.
    }
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-bold text-slate-950">
        Iniciar sesión
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Ingresa tus credenciales institucionales para continuar.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-9 space-y-5"
      >
        <div>
          <label
            htmlFor="correo"
            className="mb-2 block text-sm font-medium"
          >
            Correo institucional
          </label>

          <input
            id="correo"
            type="email"
            autoComplete="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="docente@universidad.edu"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium"
          >
            Contraseña
          </label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={recordarme}
            onChange={(e) => setRecordarme(e.target.checked)}
            className="accent-blue-600"
          />
          Recordarme en este dispositivo
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading
            ? "Iniciando sesión..."
            : "Iniciar sesión"}
        </button>
      </form>

      <div className="mt-6">
        <div className="mb-5 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-sm text-slate-400">
            O continúa con
          </span>

          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={() => {
            const apiUrl =
              process.env.NEXT_PUBLIC_API_URL ??
              "http://localhost:3001";

            window.location.assign(
              `${apiUrl.replace(/\/$/, "")}/auth/google`,
            );
          }}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <span className="text-lg font-bold text-blue-600">
            G
          </span>

          Continuar como docente con Google
        </button>
      </div>

      <p className="mt-7 text-center text-sm text-slate-500">
        ¿No tienes una cuenta?{" "}
        <Link
          href={registroHref}
          className="font-semibold text-blue-600 hover:underline"
        >
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}