
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, Users } from "lucide-react";

import { useParalelos } from "@/features/paralelos/hooks/useParalelos";
import InvitacionesParalelo from "@/features/invitacion/components/InvitacionesParalelo";

type Pestana = "estudiantes" | "invitaciones";

export default function DetalleParaleloPage() {
  const params = useParams<{ id: string }>();

  const paraleloId = Number(params.id);

  const [pestana, setPestana] =
    useState<Pestana>("invitaciones");

  const {
    paralelos,
    cargando,
    error,
  } = useParalelos();

  const paralelo = paralelos.find(
    (item) => item.paralelo_id === paraleloId,
  );

  // VALIDAR EL ID DEL PARALELO
  if (
    !Number.isSafeInteger(paraleloId) ||
    paraleloId <= 0
  ) {
    return (
      <main className="p-6">
        <p className="text-red-600">
          El ID del paralelo no es válido.
        </p>
      </main>
    );
  }

  // CARGANDO PARALELO
  if (cargando) {
    return (
      <main className="p-6 text-sm text-slate-500">
        Cargando información del paralelo...
      </main>
    );
  }

  // ERROR DE LA CONSULTA
  if (error) {
    return (
      <main className="space-y-4 p-6">
        <p role="alert" className="text-red-600">
          {error}
        </p>

        <Link
          href="/docente/paralelos"
          className="text-sm font-medium text-blue-600"
        >
          Volver a mis paralelos
        </Link>
      </main>
    );
  }

  // PARALELO NO ENCONTRADO
  if (!paralelo) {
    return (
      <main className="space-y-4 p-6">
        <p className="text-slate-700">
          No encontramos este paralelo entre tus paralelos.
        </p>

        <Link
          href="/docente/paralelos"
          className="text-sm font-medium text-blue-600"
        >
          Volver a mis paralelos
        </Link>
      </main>
    );
  }

  const cantidadEstudiantes =
    paralelo.inscripciones?.length;

  return (
    <main className="min-h-full space-y-6 p-6">
      {/* VOLVER AL LISTADO */}
      <Link
        href="/docente/paralelos"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-violet-700"
      >
        <ArrowLeft size={16} />
        Volver a mis paralelos
      </Link>

      {/* ENCABEZADO */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-slate-500">
            SafeTest / Docente / Paralelos
          </p>

          <h1 className="text-2xl font-semibold text-slate-900">
            {paralelo.nombre_paralelo}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Gestiona los estudiantes y las invitaciones
            de este paralelo.
          </p>
        </div>

        <Link
          href={`/docente/paralelos/${paraleloId}/editar`}
          className="rounded-lg border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50"
        >
          Editar paralelo
        </Link>
      </div>

      {/* INFORMACIÓN DEL PARALELO */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            Materia
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            {paralelo.materia?.nombre ??
              "Sin información"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            Periodo
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            {paralelo.semestre?.gestion ??
              "Sin información"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">
            Estudiantes
          </p>

          <p className="mt-2 font-semibold text-slate-900">
            {cantidadEstudiantes ?? "No disponible"}
          </p>
        </div>
      </section>

      {/* PESTAÑAS */}
      <div className="border-b border-slate-200">
        <div
          role="tablist"
          aria-label="Secciones del paralelo"
          className="flex gap-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={pestana === "estudiantes"}
            onClick={() => setPestana("estudiantes")}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
              pestana === "estudiantes"
                ? "border-violet-700 text-violet-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={18} />
            Estudiantes
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={pestana === "invitaciones"}
            onClick={() => setPestana("invitaciones")}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
              pestana === "invitaciones"
                ? "border-violet-700 text-violet-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Mail size={18} />
            Invitaciones
          </button>
        </div>
      </div>

      {/* CONTENIDO DE LA PESTAÑA ACTIVA */}
      {pestana === "estudiantes" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <Users
              size={22}
              className="text-violet-700"
            />

            <h2 className="text-lg font-semibold text-slate-900">
              Estudiantes del paralelo
            </h2>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {cantidadEstudiantes === undefined
              ? "El listado de estudiantes todavía no está disponible en esta vista."
              : `El paralelo tiene ${cantidadEstudiantes} inscripción(es) registradas.`}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Aquí integraremos el listado detallado
            de estudiantes cuando conectemos sus datos.
          </p>
        </section>
      ) : (
        <InvitacionesParalelo
          paraleloId={paraleloId}
        />
      )}
    </main>
  );
}
