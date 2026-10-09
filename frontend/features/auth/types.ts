
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
  nombre: string;
  correo: string;
  tipo: Rol;
}

export interface ApiMessage {
  message: string;
}

export interface LoginResponse extends ApiMessage {
  accessToken: string;
  usuario: UsuarioAuth;
}

export interface RefreshResponse {
  accessToken: string;
  usuario: UsuarioAuth;
}

export interface RegisterResponse extends ApiMessage {
  docente?: {
    id: number;
    nombre: string;
    correo: string;
  };
  estudiante?: {
    id: number;
    nombre: string;
    correo: string;
  };
}