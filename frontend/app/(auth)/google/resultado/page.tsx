
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from
  "@/features/auth/hooks/useAuth";

import { rutaSeguraAceptacion } from
  "@/features/invitacion/services/aceptacion-invitacion.service";

export default function GoogleResultadoPage() {
  const router = useRouter();

  const { usuario, isInitializing } = useAuth();

  const [errorVinculacion, setErrorVinculacion] =
    useState<string | null>(null);

  useEffect(() => {
    if (isInitializing) return;

    const parametros = new URLSearchParams(
      window.location.search,
    );

    const codigoError = parametros.get("link_error");

    // MENSAJES DE ERROR DE VINCULACIÓN
    if (codigoError) {
      const mensajes: Record<string, string> = {
        correo_no_coincide:
          "El correo de Google no coincide con el correo registrado en SafeTest. Selecciona la cuenta correcta de Google.",

        google_ya_vinculado:
          "Esta cuenta de Google ya está vinculada a otra cuenta de SafeTest o existe un conflicto de vinculación.",

        cuenta_no_disponible:
          "No se encontró una cuenta activa para completar la vinculación. Comprueba tu sesión de SafeTest.",

        cancelado:
          "No se completó la autorización con Google. Comprueba que hayas seleccionado una cuenta de Google válida.",

        estado:
          "La solicitud de Google no pudo validarse. Inténtalo nuevamente.",

        fallo:
          "No se pudo completar la conexión con Google. Inténtalo nuevamente.",
      };

      setErrorVinculacion(
        mensajes[codigoError] ??
          "Ocurrió un error al conectar Google.",
      );

      return;
    }

    // SIN SESIÓN
    if (!usuario) {
      router.replace("/login?google_error=sesion");
      return;
    }

    // DOCENTE
    if (usuario.tipo === "docente") {
      router.replace("/docente");
      return;
    }

    // ESTUDIANTE
    if (usuario.tipo === "estudiante") {
      const destinoGuardado = sessionStorage.getItem(
        "safetest_google_next",
      );

      sessionStorage.removeItem(
        "safetest_google_next",
      );

      const destinoSeguro = rutaSeguraAceptacion(
        destinoGuardado,
      );

      router.replace(
        destinoSeguro ?? "/estudiante",
      );

      return;
    }

    router.replace("/login?google_error=sesion");
  }, [usuario, isInitializing, router]);

  // MOSTRAR ERROR SIN ENVIAR AL LOGIN
  if (errorVinculacion) {
    const rutaRegreso =
      usuario?.tipo === "docente"
        ? "/docente"
        : usuario?.tipo === "estudiante"
        ? "/estudiante"
        : "/login";

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-xl border border-red-100 bg-white p-8 text-center shadow-sm">

          <div className="mb-4 text-4xl">
            ⚠️
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            No se pudo conectar Google
          </h1>

          <p
            role="alert"
            className="mt-4 text-sm leading-relaxed text-red-600"
          >
            {errorVinculacion}
          </p>

          <Link
            href={rutaRegreso}
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            {usuario
              ? "Volver a mi panel"
              : "Volver a iniciar sesión"}
          </Link>
        </div>
      </div>
    );
  }

  // PANTALLA DE CARGA NORMAL
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

        <h1 className="text-xl font-semibold text-slate-900">
          Conectando con SafeTest...
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Estamos verificando tu sesión de Google.
        </p>
      </div>
    </div>
  );
}
