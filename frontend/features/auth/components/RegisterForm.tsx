
"use client";

import { useState, type FormEvent } from "react";
import type { Rol } from "../types";
import { authService } from "../services/auth.service";

interface RegisterFormProps {
  rol: Rol;
  onBack: () => void;
}

export default function RegisterForm({
  rol,
  onBack,
}: RegisterFormProps) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] =
    useState("");

  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const esDocente = rol === "docente";

  const inputClass =
    "w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass =
    "mb-2 block text-sm font-medium text-slate-800";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (!nombre.trim() || !correo.trim()) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    if (!esDocente && !celular.trim()) {
      setError("Ingresa tu número de celular.");
      return;
    }

    if (password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres.",
      );
      return;
    }

    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }

    setLoading(true);

    try {
      if (esDocente) {
        await authService.registerDocente({
          nombre: nombre.trim(),
          correo: correo.trim(),
          password,
        });
      } else {
        await authService.registerEstudiante({
          nombre_completo: nombre.trim(),
          celular: celular.trim(),
          correo_institucional: correo.trim(),
          password,
        });
      }

      setMensaje(
        "Cuenta creada correctamente. Ya puedes iniciar sesión.",
      );

      setPassword("");
      setConfirmarPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear la cuenta.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Indicador de progreso */}
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1 w-5 rounded-full bg-blue-600" />
        <span className="h-1 w-5 rounded-full bg-blue-600" />
        <span className="ml-2 text-xs text-slate-400">
          Paso 2 de 2
        </span>
      </div>

      {/* Encabezado */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-950">
          Crear cuenta
        </h1>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            esDocente
              ? "bg-violet-50 text-violet-600"
              : "bg-emerald-50 text-emerald-600"
          }`}
        >
          ● {esDocente ? "Docente" : "Estudiante"}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-500">
        Completa tus datos institucionales para registrarte.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-4"
      >
        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className={labelClass}>
            Nombre completo
          </label>

          <input
            id="nombre"
            type="text"
            required
            autoComplete="name"
            placeholder="Ej. María Fernanda López"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Correo */}
        <div>
          <label htmlFor="correo" className={labelClass}>
            Correo institucional
          </label>

          <input
            id="correo"
            type="email"
            required
            autoComplete="email"
            placeholder="usuario@universidad.edu"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Celular, solo estudiantes */}
        {!esDocente && (
          <div>
            <label htmlFor="celular" className={labelClass}>
              Celular
            </label>

            <input
              id="celular"
              type="tel"
              required
              autoComplete="tel"
              placeholder="Ej. 70000000"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* Contraseñas */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className={labelClass}>
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="confirmarPassword"
              className={labelClass}
            >
              Confirmar contraseña
            </label>

            <input
              id="confirmarPassword"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmarPassword}
              onChange={(e) =>
                setConfirmarPassword(e.target.value)
              }
              className={inputClass}
            />
          </div>
        </div>

        {/* Términos */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            required
            checked={aceptaTerminos}
            onChange={(e) =>
              setAceptaTerminos(e.target.checked)
            }
            className="h-4 w-4 accent-blue-600"
          />
          Acepto los términos y condiciones
        </label>

        {/* Mensajes */}
        {error && (
          <p
            role="alert"
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {mensaje && (
          <div
            role="status"
            className="rounded-md bg-green-50 p-3 text-sm text-green-700"
          >
            <p>{mensaje}</p>
            <a
              href="/login"
              className="mt-2 inline-block font-semibold underline"
            >
              Ir a iniciar sesión
            </a>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
          >
            Volver
          </button>

          <button
            type="submit"
            disabled={loading || Boolean(mensaje)}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </div>
      </form>
    </div>
  );
}
