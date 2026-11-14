
"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { useAuth } from "../hooks/useAuth";


import { rutaSeguraAceptacion } from
  "@/features/invitacion/services/aceptacion-invitacion.service";

export default function LoginForm() {
  const router = useRouter();

  // Datos del formulario
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  // Estado para mostrar u ocultar contraseña
  const [mostrarPassword, setMostrarPassword] =
    useState(false);

  const [registroHref, setRegistroHref] =
    useState("/registro");

  const [errorGoogle, setErrorGoogle] = useState("");
  const [googleSinCuenta, setGoogleSinCuenta] =
    useState(false);
      
  const {
    login,
    isLoading: loading,
    error,
  } = useAuth();

  // Leer parámetros de la URL
  useEffect(() => {
    const parametros = new URLSearchParams(
      window.location.search,
    );

    // Conservar una invitación pendiente
    const retorno = rutaSeguraAceptacion(
      parametros.get("next"),
    );

    if (retorno) {
      setRegistroHref(
        `/registro?next=${encodeURIComponent(retorno)}`,
      );
    }

    // Mostrar posibles errores de Google
    const codigoError =
      parametros.get("google_error");
    setGoogleSinCuenta(
      codigoError === "cuenta_no_registrada",
    );

    const mensajes: Record<string, string> = {
      cancelado: "Se canceló el inicio de sesión con Google.",
      estado: "No se pudo validar la solicitud de Google.",
      cuenta_existente:
        "Este correo ya está registrado. Inicia sesión con tu contraseña.",
      autenticacion:
        "No se pudo autenticar la cuenta de Google.",
      sesion:
        "No se pudo recuperar la sesión de Google.",
      cuenta_no_registrada:
        "No encontramos una cuenta con este correo electrónico. Regístrate primero para continuar.",
    };

    if (codigoError) {
      setErrorGoogle(
        mensajes[codigoError] ??
        "Ocurrió un error al iniciar sesión con Google.",
      );
    }
  }, []);

  // LOGIN CON CORREO Y CONTRASEÑA
  async function handleSubmit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    setErrorGoogle("");

    try {
      const usuario = await login({
        correo: correo.trim().toLowerCase(),
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
        return;
      }
    } catch {
      // El contexto de autenticación maneja el error.
    }
  }

  // INICIAR AUTENTICACIÓN CON GOOGLE
  function iniciarSesionConGoogle() {
    const parametros = new URLSearchParams(
      window.location.search,
    );

    const retorno = rutaSeguraAceptacion(
      parametros.get("next"),
    );

    // Guardar temporalmente el destino de una invitación
    if (retorno) {
      sessionStorage.setItem(
        "safetest_google_next",
        retorno,
      );
    } else {
      sessionStorage.removeItem(
        "safetest_google_next",
      );
    }

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3001";

    window.location.assign(
      `${apiUrl.replace(/\/$/, "")}/auth/google`,
    );
  }

  return (
    <div className="w-full max-w-md">

      <h1 className="text-3xl font-bold text-slate-950">
        Iniciar sesión
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Ingresa tu correo electrónico y contraseña
        para continuar.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-9 space-y-5"
      >
        {/* CORREO ELECTRÓNICO */}
        <div>
          <label
            htmlFor="correo"
            className="mb-2 block text-sm font-medium"
          >
            Correo electrónico
          </label>

          <input
            id="correo"
            type="email"
            autoComplete="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="usuario@gmail.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* CONTRASEÑA CON OJITO */}
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium"
          >
            Contraseña
          </label>

          <div className="relative">
            <input
              id="password"
              type={mostrarPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Ingresa tu contraseña"
              className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-4 pr-12 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="button"
              onClick={() =>
                setMostrarPassword(!mostrarPassword)
              }
              aria-label={
                mostrarPassword
                  ? "Ocultar contraseña"
                  : "Mostrar contraseña"
              }
              aria-pressed={mostrarPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-blue-600"
            >
              {mostrarPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>
        </div>

        {/* ERRORES */}
        {(error || errorGoogle) && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
          >
            {error || errorGoogle}
          </p>
        )}

        {/* ENLACE DE REGISTRO SI NO EXISTE LA CUENTA */}
        {googleSinCuenta && (
          <Link
            href={registroHref}
            className="inline-block text-sm font-semibold text-blue-600 hover:underline"
          >
            Crear mi cuenta en SafeTest
          </Link>
        )}


        {/* BOTÓN LOGIN */}
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

      {/* SEPARADOR */}
      <div className="mt-6">
        <div className="mb-5 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />

          <span className="text-sm text-slate-400">
            O continúa con
          </span>

          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* LOGIN CON GOOGLE */}
        <button
          type="button"
          onClick={iniciarSesionConGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <span className="text-lg font-bold text-blue-600">
            G
          </span>

          Continuar con Google
        </button>
      </div>

      {/* REGISTRO */}
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
