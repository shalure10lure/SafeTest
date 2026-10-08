
export type Rol = "docente" | "estudiante";

export interface LoginDto {
  correo: string;
  password: string;
}

export interface RegisterDocenteDto {
  nombre: string;
  correo: string;
  password: string;
}

export interface RegisterEstudianteDto {
  nombre_completo: string;
  celular: string;
  correo_institucional: string;
  password: string;
}

export interface UsuarioAuth {
  id: number;
  tipo: Rol;
  [campo: string]: unknown;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  usuario: UsuarioAuth;
}
