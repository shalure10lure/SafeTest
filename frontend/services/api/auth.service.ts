
import type {
  LoginDto,
  LoginResponse,
  RegisterDocenteDto,
  RegisterEstudianteDto,
  UsuarioAuth,
} from "../types";

// URL del backend NestJS
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

// Tipos de respuesta
interface RefreshResponse {
  accessToken: string;
  usuario: UsuarioAuth;
}

interface ApiMessage {
  message: string;
}

// Manejo centralizado de errores
async function handleResponse<T>(
  response: Response,
): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => null);

    const message = data?.message;

    const errorMessage = Array.isArray(message)
      ? message.join(", ")
      : typeof message === "string"
        ? message
        : `Error en la solicitud (${response.status})`;

    throw new Error(errorMessage);
  }

  // Algunos endpoints pueden devolver 204 sin contenido.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

// Función reutilizable para peticiones HTTP
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    },
  );

  return handleResponse<T>(response);
}

// Servicio de autenticación de SafeTest
export const authService = {

  // 1. LOGIN
  login(datos: LoginDto): Promise<LoginResponse> {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(datos),
    });
  },

  // 2. REGISTRAR DOCENTE
  registerDocente(
    datos: RegisterDocenteDto,
  ): Promise<unknown> {
    return request<unknown>("/auth/register/docente", {
      method: "POST",
      body: JSON.stringify(datos),
    });
  },

  // 3. REGISTRAR ESTUDIANTE
  registerEstudiante(
    datos: RegisterEstudianteDto,
  ): Promise<unknown> {
    return request<unknown>("/auth/register/estudiante", {
      method: "POST",
      body: JSON.stringify(datos),
    });
  },

  // 4. LOGOUT
  logout(accessToken: string): Promise<ApiMessage> {
    return request<ApiMessage>(
      "/auth/logout",
      {
        method: "POST",
      },
      accessToken,
    );
  },

  // 5. REFRESH TOKEN
  // El backend lee el refresh_token de la cookie HttpOnly.
  refresh(): Promise<RefreshResponse> {
    return request<RefreshResponse>("/auth/refresh", {
      method: "POST",
    });
  },

  // 6. CHECK STATUS
  checkStatus(
    accessToken: string,
  ): Promise<unknown> {
    return request<unknown>(
      "/auth/check-status",
      {
        method: "GET",
      },
      accessToken,
    );
  },
};
