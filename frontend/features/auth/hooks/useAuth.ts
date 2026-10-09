
"use client";

import { useState } from "react";
import axios from "axios";

import { authService } from "../services/auth.service";

import type {
  LoginDto,
  UsuarioAuth,
  RegisterDocenteDto,
  RegisterEstudianteDto,
} from "../types";

function obtenerMensajeError(
  err: unknown,
  mensajePorDefecto: string,
): string {
  if (axios.isAxiosError(err)) {
    const mensaje = err.response?.data?.message;

    if (Array.isArray(mensaje)) {
      return mensaje.join(", ");
    }

    if (typeof mensaje === "string") {
      return mensaje;
    }
  }

  return mensajePorDefecto;
}

export function useAuth() {
  const [usuario, setUsuario] =
    useState<UsuarioAuth | null>(null);

  const [accessToken, setAccessToken] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function login(datos: LoginDto) {
    setIsLoading(true);
    setError("");
    setMensaje("");

    try {
      const resultado = await authService.login(datos);

      setUsuario(resultado.usuario);
      setAccessToken(resultado.accessToken);

      // Almacenamiento temporal para la integración inicial.
      sessionStorage.setItem(
        "accessToken",
        resultado.accessToken,
      );

      setMensaje(resultado.message);

      return resultado.usuario;
    } catch (err: unknown) {
      const mensajeError = obtenerMensajeError(
        err,
        "No se pudo iniciar sesión.",
      );

      setError(mensajeError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function registerDocente(
    datos: RegisterDocenteDto,
  ) {
    setIsLoading(true);
    setError("");
    setMensaje("");

    try {
      const resultado =
        await authService.registerDocente(datos);

      setMensaje(resultado.message);
      return resultado;
    } catch (err: unknown) {
      setError(
        obtenerMensajeError(
          err,
          "No se pudo registrar al docente.",
        ),
      );

      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function registerEstudiante(
    datos: RegisterEstudianteDto,
  ) {
    setIsLoading(true);
    setError("");
    setMensaje("");

    try {
      const resultado =
        await authService.registerEstudiante(datos);

      setMensaje(resultado.message);
      return resultado;
    } catch (err: unknown) {
      setError(
        obtenerMensajeError(
          err,
          "No se pudo registrar al estudiante.",
        ),
      );

      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshSession() {
    setIsLoading(true);
    setError("");

    try {
      // El backend lee el refresh token de la cookie HttpOnly.
      const resultado = await authService.refresh();

      setUsuario(resultado.usuario);
      setAccessToken(resultado.accessToken);

      sessionStorage.setItem(
        "accessToken",
        resultado.accessToken,
      );

      return resultado.usuario;
    } catch (err: unknown) {
      setUsuario(null);
      setAccessToken(null);
      sessionStorage.removeItem("accessToken");

      setError(
        obtenerMensajeError(
          err,
          "No se pudo recuperar la sesión.",
        ),
      );

      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    setIsLoading(true);
    setError("");

    try {
      const token =
        accessToken ??
        sessionStorage.getItem("accessToken");

      if (token) {
        await authService.logout(token);
      }
    } catch (err: unknown) {
      setError(
        obtenerMensajeError(
          err,
          "No se pudo cerrar la sesión en el servidor.",
        ),
      );

      throw err;
    } finally {
      setUsuario(null);
      setAccessToken(null);
      sessionStorage.removeItem("accessToken");
      setIsLoading(false);
    }
  }

  return {
    usuario,
    accessToken,
    isLoading,
    error,
    mensaje,
    login,
    registerDocente,
    registerEstudiante,
    refreshSession,
    logout,
  };
}