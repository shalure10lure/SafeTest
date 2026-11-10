"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants/routes";

import { useAuth } from "../hooks/useAuth";
import LoginScreen from "./LoginScreen";

/**
 * Punto de entrada del sistema.
 * Sin sesión muestra el login; con sesión válida redirige
 * al panel que corresponde al rol del usuario.
 */
export default function LoginEntry() {
  const router = useRouter();
  const { usuario, isInitializing } = useAuth();

  useEffect(() => {
    if (isInitializing || !usuario) {
      return;
    }

    router.replace(
      usuario.tipo === "docente"
        ? ROUTES.docente.inicio
        : ROUTES.estudiante.inicio,
    );
  }, [isInitializing, usuario, router]);

  // El login se muestra de inmediato. Solo se reemplaza por el
  // aviso de verificación cuando ya se confirmó una sesión válida
  // y la redirección por rol está en curso.
  if (usuario) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-slate-50"
        aria-live="polite"
      >
        <p className="text-sm text-slate-600">
          Verificando sesión...
        </p>
      </main>
    );
  }

  return <LoginScreen />;
}
