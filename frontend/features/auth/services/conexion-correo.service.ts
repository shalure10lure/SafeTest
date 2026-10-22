    
import { BaseService } from "@/services/api/base.service";

export interface EstadoConexionCorreo {
  conectado: boolean;
  correo: string | null;
  estado: "conectada" | "requiere_reconexion" | null;
}

interface IniciarConexionResponse {
  url: string;
}

class ConexionCorreoService extends BaseService {
  constructor() {
    super("/correo/google");
  }

  // Consultar si el docente ya conectó Gmail.
  obtenerEstado(): Promise<EstadoConexionCorreo> {
    return this.get<EstadoConexionCorreo>("/estado");
  }

  // Solicitar al backend la URL de autorización.
  iniciarConexion(): Promise<IniciarConexionResponse> {
    return this.post<
      IniciarConexionResponse,
      Record<string, never>
    >("/iniciar", {});
  }
}

export const conexionCorreoService =
  new ConexionCorreoService();
