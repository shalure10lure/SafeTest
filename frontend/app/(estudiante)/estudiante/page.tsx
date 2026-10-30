
"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Mail,
} from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";

export default function EstudiantePage() {
  const { usuario, isInitializing } = useAuth();

  return (
    <main className="min-h-full space-y-7 p-6">
      {/* BIENVENIDA */}
      <section>
        <p className="mb-2 text-sm text-slate-500">
          SafeTest / Estudiante / Inicio
        </p>

        <h1 className="text-2xl font-semibold text-slate-900">
          {isInitializing
            ? "Bienvenido a SafeTest"
            : `¡Hola, ${usuario?.nombre ?? "estudiante"}!`}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Consulta tus invitaciones, paralelos y
          evaluaciones académicas.
        </p>
      </section>

      {/* TARJETA DE BIENVENIDA */}
      <section className="rounded-2xl bg-[#203D89] p-7 text-white">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex rounded-xl bg-white/10 p-3">
              <GraduationCap size={28} />
            </div>

            <h2 className="text-xl font-bold">
              Tu espacio académico
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-blue-100">
              Desde aquí podrás gestionar las
              invitaciones que recibas y acceder
              a los paralelos en los que estés inscrito.
            </p>
          </div>

          <BookOpen
            size={72}
            className="hidden text-blue-200/40 sm:block"
          />
        </div>
      </section>

      {/* SECCIONES */}
      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 inline-flex rounded-lg bg-blue-50 p-3 text-blue-600">
            <Mail size={23} />
          </div>

          <h3 className="font-semibold text-slate-900">
            Mis invitaciones
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Consulta las invitaciones que te enviaron
            tus docentes.
          </p>

          <p className="mt-4 text-xs font-medium text-blue-600">
            Próxima sección: bandeja de invitaciones
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 inline-flex rounded-lg bg-emerald-50 p-3 text-emerald-600">
            <BookOpen size={23} />
          </div>

          <h3 className="font-semibold text-slate-900">
            Mis paralelos
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Revisa los grupos a los que perteneces
            después de aceptar una invitación.
          </p>

          <p className="mt-4 text-xs font-medium text-slate-500">
            Próxima sección: paralelos inscritos
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 inline-flex rounded-lg bg-violet-50 p-3 text-violet-600">
            <ClipboardList size={23} />
          </div>

          <h3 className="font-semibold text-slate-900">
            Mis evaluaciones
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Accede a las evaluaciones asignadas
            por tus docentes.
          </p>

          <p className="mt-4 text-xs font-medium text-slate-500">
            Funcionalidad de evaluaciones
          </p>
        </div>
      </section>

      {/* ACCESO A LA INVITACIÓN POR CORREO */}
      <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <Mail
            size={21}
            className="shrink-0 text-blue-600"
          />

          <div>
            <h3 className="font-semibold text-slate-900">
              ¿Recibiste una invitación por correo?
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Abre el enlace de tu correo para consultar
              y aceptar la invitación. Próximamente
              también podrás gestionarla desde
              el panel de estudiante.
            </p>

            <Link
              href="/estudiante"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-700"
            >
              Estás en tu panel
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
