
"use client";

import { GraduationCap, UserRound } from "lucide-react";
import type { Rol } from "../types";

interface RoleSelectionProps {
  selectedRole: Rol | null;
  onSelect: (role: Rol) => void;
  onContinue: () => void;
}

export default function RoleSelection({
  selectedRole,
  onSelect,
  onContinue,
}: RoleSelectionProps) {
  const roles = [
    {
      id: "docente" as const,
      title: "DOCENTE",
      description: "Gestiona tus cursos y evaluaciones.",
      Icon: GraduationCap,
      color: "text-violet-600",
      background: "bg-violet-50",
    },
    {
      id: "estudiante" as const,
      title: "ESTUDIANTE",
      description: "Participa en tus cursos y realiza evaluaciones.",
      Icon: UserRound,
      color: "text-emerald-600",
      background: "bg-emerald-50",
    },
  ];

  return (
    <div className="w-full">
      {/* Indicador de paso */}
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1 w-5 rounded-full bg-blue-600" />
        <span className="h-1 w-3 rounded-full bg-slate-200" />
        <span className="ml-2 text-xs text-slate-400">
          Paso 1 de 2
        </span>
      </div>

      <h1 className="text-2xl font-bold text-slate-950">
        Crear cuenta
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Selecciona cómo utilizarás SafeTest
      </p>

      <div className="mt-7 space-y-3">
        {roles.map(
          ({
            id,
            title,
            description,
            Icon,
            color,
            background,
          }) => {
            const active = selectedRole === id;

            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(id)}
                className={`flex w-full items-center gap-4 rounded-xl border bg-white p-4 text-left transition ${
                  active
                    ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${background} ${color}`}
                >
                  <Icon size={21} />
                </div>

                <div className="flex-1">
                  <p className={`text-xs font-bold tracking-wider ${color}`}>
                    {title}
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {description}
                  </p>
                </div>

                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    active
                      ? "border-blue-600"
                      : "border-slate-300"
                  }`}
                >
                  {active && (
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  )}
                </div>
              </button>
            );
          },
        )}
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={!selectedRole}
        className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        Continuar
      </button>
    </div>
  );
}
