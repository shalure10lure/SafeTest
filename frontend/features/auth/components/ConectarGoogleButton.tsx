
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/auth.service";

type EstadoGoogle =
  | "comprobando"
  | "pendiente"
  | "vinculado"
  | "error";

export default function ConectarGoogleButton() {
  const {
    usuario,
    accessToken,
    isInitializing,
  } = useAuth();

  const [estado, setEstado] =
    useState<EstadoGoogle>("comprobando");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Consultar el estado real de Google
  useEffect(() => {
    if (isInitializing) return;

    if (!usuario || !accessToken) return;

    let activo = true;

    authService
      .estadoGoogle(accessToken)
      .then((resultado) => {
        if (!activo) return;

        setEstado(
          resultado.vinculado
            ? "vinculado"
            : "pendiente",
        );
      })
      .catch(() => {
        if (activo) setEstado("error");
      });

    return () => {
      activo = false;
    };
  }, [usuario, accessToken, isInitializing]);

  // Iniciar conexión con Google
  async function conectarGoogle() {
    if (!accessToken) return;

    setLoading(true);
    setError("");

    try {
      const resultado =
        await authService.vincularGoogle(accessToken);

      window.location.assign(resultado.url);
    } catch {
      setError(
        "No se pudo conectar con Google.",
      );
      setLoading(false);
    }
  }

  // No mostrar mientras se comprueba el estado
  if (
    isInitializing ||
    !usuario ||
    estado === "comprobando"
  ) {
    return null;
  }

  // ¡Google ya vinculado! No mostrar el botón
  if (estado === "vinculado") {
    return null;
  }

  if (estado === "error") {
    return (
      <p className="text-sm text-red-600">
        No se pudo comprobar la vinculación con Google.
      </p>
    );
  }

  // Google aún no vinculado
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <h3 className="text-lg font-semibold text-slate-900">
        Conecta tu cuenta de Google
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        Vincula Google para iniciar sesión con tu cuenta
        sin depender únicamente de tu contraseña.
      </p>

      <button
        type="button"
        onClick={conectarGoogle}
        disabled={loading}
        className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {loading
          ? "Conectando..."
          : "Conectar mi cuenta de Google"}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
