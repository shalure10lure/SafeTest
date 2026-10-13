
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "../hooks/useAuth";
import type { Rol } from "../types";

interface RoleGuardProps {
  rolPermitido: Rol;
  children: ReactNode;
}

export default function RoleGuard({
  rolPermitido,
  children,
}: RoleGuardProps) {
  const router = useRouter();

  const {
    usuario,
    isInitializing,
  } = useAuth();

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (usuario.tipo !== rolPermitido) {
      const rutaCorrecta =
        usuario.tipo === "docente"
          ? "/docente"
          : "/estudiante";

      router.replace(rutaCorrecta);
    }
  }, [
    isInitializing,
    usuario,
    rolPermitido,
    router,
  ]);

  if (
    isInitializing ||
    !usuario ||
    usuario.tipo !== rolPermitido
  ) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-slate-50"
        aria-live="polite"
      >
        <p className="text-sm text-slate-600">
          Verificando acceso...
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
