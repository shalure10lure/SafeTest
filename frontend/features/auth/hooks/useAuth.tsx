
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";

import { authService } from "../services/auth.service";

import type {
  LoginDto,
  UsuarioAuth,
  RegisterDocenteDto,
  RegisterEstudianteDto,
} from "../types";

interface AuthContextType {
  usuario: UsuarioAuth | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  error: string;
  mensaje: string;
  login: (datos: LoginDto) => Promise<UsuarioAuth>;
  registerDocente: (
    datos: RegisterDocenteDto,
  ) => Promise<unknown>;
  registerEstudiante: (
    datos: RegisterEstudianteDto,
  ) => Promise<unknown>;
  refreshSession: (silencioso?: boolean) => Promise<UsuarioAuth>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

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

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const inicializacionIniciada = useRef(false);
  const [usuario, setUsuario] =
    useState<UsuarioAuth | null>(null);

  const [accessToken, setAccessToken] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
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

      sessionStorage.setItem(
        "accessToken",
        resultado.accessToken,
      );

      setMensaje(resultado.message);

      return resultado.usuario;
    } catch (err: unknown) {
      setError(
        obtenerMensajeError(
          err,
          "No se pudo iniciar sesión.",
        ),
      );
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


  async function refreshSession(silencioso = false) {
    if (!silencioso) {
      setIsLoading(true);
      setError("");
    }

    try {
      const resultado = await authService.refresh();

      setUsuario(resultado.usuario);
      setAccessToken(resultado.accessToken);

      sessionStorage.setItem(
        "accessToken",
        resultado.accessToken,
      );

      return resultado.usuario;
    } catch (err: unknown) {
      // Eliminar una sesión local que ya no es válida.
      setUsuario(null);
      setAccessToken(null);
      sessionStorage.removeItem("accessToken");

      // Un 401 durante la inicialización significa
      // que no existe una sesión activa.
      const noHaySesion =
        axios.isAxiosError(err) &&
        err.response?.status === 401;

      // Ignoramos únicamente la ausencia normal
      // de sesión durante el arranque.
      if (!(silencioso && noHaySesion)) {
        setError(
          obtenerMensajeError(
            err,
            "No se pudo recuperar la sesión.",
          ),
        );
      }

      throw err;
    } finally {
      if (!silencioso) {
        setIsLoading(false);
      }
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
  useEffect(() => {
    if (inicializacionIniciada.current) return;

    inicializacionIniciada.current = true;

    refreshSession(true)
      .catch(() => undefined)
      .finally(() => setIsInitializing(false));

    // Inicializamos una sola vez al montar el proveedor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        accessToken,
        isLoading,
        isInitializing,
        error,
        mensaje,
        login,
        registerDocente,
        registerEstudiante,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider.",
    );
  }

  return contexto;
}
