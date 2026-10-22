import { BaseService } from '@/services/api/base.service';

import type {
  LoginDto,
  LoginResponse,
  RefreshResponse,
  UsuarioAuth,
  ApiMessage,
  RegisterDocenteDto,
  RegisterEstudianteDto,
  RegisterResponse,
} from '../types';

class AuthService extends BaseService {
  private refreshEnCurso: Promise<RefreshResponse> | null = null;
  constructor() {
    super('/auth');
  }

  login(datos: LoginDto): Promise<LoginResponse> {
    return this.post<LoginResponse, LoginDto>(
      '/login',
      datos,
    );
  }

  registerDocente(
    datos: RegisterDocenteDto,
  ): Promise<RegisterResponse> {
    return this.post<RegisterResponse, RegisterDocenteDto>(
      '/register/docente',
      datos,
    );
  }

  registerEstudiante(
    datos: RegisterEstudianteDto,
  ): Promise<RegisterResponse> {
    return this.post<RegisterResponse, RegisterEstudianteDto>(
      '/register/estudiante',
      datos,
    );
  }

  
    refresh(): Promise<RefreshResponse> {
      // Si ya estamos recuperando la sesión,
      // reutilizamos la misma solicitud.
      if (this.refreshEnCurso) {
        return this.refreshEnCurso;
      }

      this.refreshEnCurso =
        this.post<
          RefreshResponse,
          Record<string, never>
        >('/refresh', {}).finally(() => {
          // Cuando termina, permitimos futuras renovaciones.
          this.refreshEnCurso = null;
        });

      return this.refreshEnCurso;
    }


  checkStatus(accessToken: string): Promise<UsuarioAuth> {
    return this.get<UsuarioAuth>('/check-status', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  logout(accessToken: string): Promise<ApiMessage> {
    return this.post<ApiMessage, Record<string, never>>(
      '/logout',
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
  }
}

export const authService = new AuthService();