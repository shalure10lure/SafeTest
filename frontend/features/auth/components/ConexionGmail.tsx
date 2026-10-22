
"use client";

import { useEffect, useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import {
  conexionCorreoService,
  type EstadoConexionCorreo,
} from "../services/conexion-correo.service";

export default function ConexionGmail() {
  const { usuario, isInitializing } = useAuth();

  const [conexion, setConexion] =
    useState<EstadoConexionCorreo | null>(null);

  const [cargando, setCargando] = useState(true);
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (isInitializing || usuario?.tipo !== "docente") {
      return;
    }

    let activo = true;

    // Leer el resultado devuelto por el backend.
    const parametros = new URLSearchParams(
      window.location.search,
    );

    const resultado = parametros.get("gmail");

    if (resultado === "conectada") {
      setAviso("Gmail autorizado correctamente.");
    } else if (resultado === "cancelado") {
      setError("La autorización de Gmail fue cancelada.");
    } else if (resultado === "error") {
      setError(
        "No se pudo conectar Gmail. Verifica que hayas " +
        "seleccionado el correo registrado en SafeTest.",
      );
    }

    // Consultar el estado real guardado en PostgreSQL.
    conexionCorreoService
      .obtenerEstado()
      .then((respuesta) => {
        if (activo) {
          setConexion(respuesta);
        }
      })
      .catch(() => {
        if (activo) {
          setError(
            "No se pudo consultar la conexión de Gmail.",
          );
        }
      })
      .finally(() => {
        if (activo) {
          setCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [isInitializing, usuario?.id, usuario?.tipo]);

  async function conectarGmail() {
    setError("");
    setAviso("");
    setConectando(true);

    try {
      const respuesta =
        await conexionCorreoService.iniciarConexion();

      // Verificar que la autorización provenga de Google.
      const destino = new URL(respuesta.url);

      if (
        destino.protocol !== "https:" ||
        destino.hostname !== "accounts.google.com"
      ) {
        throw new Error(
          "La dirección de autorización no es válida.",
        );
      }

      // Google mostrará su pantalla de autorización.
      window.location.assign(respuesta.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar la conexión con Gmail.",
      );

      setConectando(false);
    }
  }

  if (usuario?.tipo !== "docente") {
    return null;
  }

  const conectado = conexion?.conectado === true;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
          <Mail size={22} />
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">
            Conexión de Gmail
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Autoriza tu correo para enviar invitaciones
            a los estudiantes de tus paralelos.
          </p>
        </div>
      </div>

      {cargando ? (
        <p className="mt-5 text-sm text-slate-500">
          Comprobando conexión...
        </p>
      ) : (
        <div className="mt-5">
          {conectado ? (
            <div className="flex items-start gap-2 rounded-lg bg-green-50 p-4 text-green-700">
              <CheckCircle2 size={20} />

              <div>
                <p className="font-semibold">
                  Gmail conectado
                </p>

                <p className="mt-1 text-sm">
                  {conexion?.correo}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Todavía no has conectado una cuenta Gmail.
            </p>
          )}

          {aviso && (
            <p
              role="status"
              className="mt-3 text-sm text-green-700"
            >
              {aviso}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={conectarGmail}
            disabled={conectando}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {conectando
              ? "Redirigiendo a Google..."
              : conectado
                ? "Volver a autorizar Gmail"
                : "Conectar Gmail"}
          </button>
        </div>
      )}
    </section>
  );
}
