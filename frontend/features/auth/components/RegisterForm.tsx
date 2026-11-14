
"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Rol } from "../types";
import { authService } from "../services/auth.service";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { rutaSeguraAceptacion } from
  "@/features/invitacion/services/aceptacion-invitacion.service";

interface RegisterFormProps {
  rol: Rol;
  onBack: () => void;
  loginHref?: string;
}

export default function RegisterForm({
  rol,
  onBack,
  loginHref = "/login",
}: RegisterFormProps) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] =
    useState("");
  const [mostrarPassword, setMostrarPassword] =
    useState(false);

  const [mostrarConfirmacion, setMostrarConfirmacion] =
    useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const esDocente = rol === "docente";

  const inputClass =
    "w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass =
    "mb-2 block text-sm font-medium text-slate-800";
  const router = useRouter();
  const { login } = useAuth();


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMensaje("");

    const correoNormalizado =
      correo.trim().toLowerCase();

    // Validaciones
    if (!nombre.trim() || !correoNormalizado) {
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

    // PRIMERA ETAPA: registrar la cuenta
    try {
      if (esDocente) {
        await authService.registerDocente({
          nombre: nombre.trim(),
          correo: correoNormalizado,
          password,
        });
      } else {
        await authService.registerEstudiante({
          nombre_completo: nombre.trim(),
          celular: celular.trim(),
          correo_institucional: correoNormalizado,
          password,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear la cuenta.",
      );

      setLoading(false);
      return;
    }

    // SEGUNDA ETAPA: iniciar sesión automáticamente
    try {
      const usuario = await login({
        correo: correoNormalizado,
        password,
      });

      // Si es docente, ir al panel docente
      if (usuario.tipo === "docente") {
        router.replace("/docente");
        return;
      }

      // Si es estudiante, recuperar una invitación
      // pendiente o ir al panel principal
      if (usuario.tipo === "estudiante") {
        const parametros = new URL(
          loginHref,
          window.location.origin,
        ).searchParams;

        const retorno = rutaSeguraAceptacion(
          parametros.get("next"),
        );

        router.replace(retorno ?? "/estudiante");
        return;
      }

      // Si el backend devolvió un rol inesperado,
      // la cuenta ya existe, pero no redirigimos.
      setMensaje(
        "Cuenta creada, pero no se pudo identificar el rol. " +
        "Inicia sesión desde la página de acceso.",
      );
    } catch {
      // El registro ya terminó correctamente.
      // No debemos intentar registrar la misma cuenta otra vez.
      setMensaje(
        "Cuenta creada correctamente, pero no se pudo " +
        "iniciar sesión automáticamente. " +
        "Puedes iniciar sesión desde la página de acceso.",
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
          className={`rounded-full px-3 py-1 text-xs font-semibold ${esDocente
            ? "bg-violet-50 text-violet-600"
            : "bg-emerald-50 text-emerald-600"
            }`}
        >
          ● {esDocente ? "Docente" : "Estudiante"}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-500">
        Completa tus datos para crear una cuenta en SafeTest.
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
            Correo electrónico
          </label>

          <input
            id="correo"
            type="email"
            required
            autoComplete="email"
            placeholder="usuario@gmail.com"
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

        {/* CONTRASEÑAS CON OJITOS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          {/* Contraseña */}
          <div>
            <label htmlFor="password" className={labelClass}>
              Contraseña
            </label>

            <div className="relative">
              <input
                id="password"
                type={mostrarPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-11`}
              />

              <button
                type="button"
                onClick={() =>
                  setMostrarPassword(!mostrarPassword)
                }
                aria-label={
                  mostrarPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                aria-pressed={mostrarPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-blue-600"
              >
                {mostrarPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label
              htmlFor="confirmarPassword"
              className={labelClass}
            >
              Confirmar contraseña
            </label>

            <div className="relative">
              <input
                id="confirmarPassword"
                type={
                  mostrarConfirmacion ? "text" : "password"
                }
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmarPassword}
                onChange={(e) =>
                  setConfirmarPassword(e.target.value)
                }
                className={`${inputClass} pr-11`}
              />

              <button
                type="button"
                onClick={() =>
                  setMostrarConfirmacion(!mostrarConfirmacion)
                }
                aria-label={
                  mostrarConfirmacion
                    ? "Ocultar confirmación de contraseña"
                    : "Mostrar confirmación de contraseña"
                }
                aria-pressed={mostrarConfirmacion}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-blue-600"
              >
                {mostrarConfirmacion ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
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
              href={loginHref}
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
