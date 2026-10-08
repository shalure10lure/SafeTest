
import type {
  LoginDto,
  LoginResponse,
  RegisterDocenteDto,
  RegisterEstudianteDto,
} from "../types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000";

async function post<T>(
  endpoint: string,
  data: object,
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    const mensaje =
      typeof error?.message === "string"
        ? error.message
        : "No se pudo completar la solicitud";

    throw new Error(mensaje);
  }

  return response.json() as Promise<T>;
}

export const authService = {
  login(datos: LoginDto) {
    return post<LoginResponse>("/auth/login", datos);
  },

  registerDocente(datos: RegisterDocenteDto) {
    return post<unknown>("/auth/register/docente", datos);
  },

  registerEstudiante(datos: RegisterEstudianteDto) {
    return post<unknown>("/auth/register/estudiante", datos);
  },
};
