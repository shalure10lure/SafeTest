
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function GoogleResultadoPage() {
  const router = useRouter();

  const { usuario, isInitializing } = useAuth();

  useEffect(() => {
    if (isInitializing) return;

    if (usuario?.tipo === "docente") {
      router.replace("/docente");
    } else {
      router.replace("/login?google_error=sesion");
    }
  }, [usuario, isInitializing, router]);

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
