
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AuthBrandPanel from "@/features/auth/components/AuthBrandPanel";
import RoleSelection from "@/features/auth/components/RoleSelection";
import RegisterForm from "@/features/auth/components/RegisterForm";

import type { Rol } from "@/features/auth/types";

export default function RegistroPage() {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [rol, setRol] = useState<Rol | null>(null);

  function continuar() {
    if (rol !== null) {
      setPaso(2);
    }
  }

  function volver() {
    setPaso(1);
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Panel izquierdo reutilizable */}
      <AuthBrandPanel />

      {/* Panel derecho */}
      <section className="flex min-h-screen w-full items-center justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="w-full max-w-md">

          {paso === 1 ? (
            <>
              {/* Volver a Login */}
              <Link
                href="/login"
                className="mb-7 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-blue-600"
              >
                <ArrowLeft size={15} />
                Volver a iniciar sesión
              </Link>

              <RoleSelection
                selectedRole={rol}
                onSelect={setRol}
                onContinue={continuar}
              />

              <p className="mt-7 text-center text-sm text-slate-500">
                ¿Ya tienes una cuenta?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Iniciar sesión
                </Link>
              </p>
            </>
          ) : (
            rol && (
              <RegisterForm
                key={rol}
                rol={rol}
                onBack={volver}
              />
            )
          )}
        </div>
      </section>
    </div>
  );
}
