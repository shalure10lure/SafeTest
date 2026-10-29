
import { BaseService } from "@/services/api/base.service";

export interface InvitacionConsultada {
  invitacion_id: number;
  correo_institucional: string;
  estado: "pendiente";
  fecha_expiracion: string;
  paralelo: {
    paralelo_id: number;
    nombre: string;
    materia: string | null;
    periodo: string | null;
  };
}

export interface AceptarInvitacionResponse {
  message: string;
  invitacion_id: number;
  paralelo_id: number;
  estado: "aceptada";
}

class AceptacionInvitacionService extends BaseService {
  constructor() {
    super("/invitaciones");
  }

  consultar(token: string): Promise<InvitacionConsultada> {
    return this.post<
      InvitacionConsultada,
      { token: string }
    >("/consultar", { token });
  }

  aceptar(token: string): Promise<AceptarInvitacionResponse> {
    return this.post<
      AceptarInvitacionResponse,
      { token: string }
    >("/aceptar", { token });
  }
}

export const aceptacionInvitacionService =
  new AceptacionInvitacionService();

// Solo permitimos regresar a nuestra pantalla de invitaciones.
// Así evitamos redirecciones a sitios externos desde el login.
export function rutaSeguraAceptacion(
  siguiente: string | null,
): string | null {
  if (!siguiente || typeof window === "undefined") {
    return null;
  }

  try {
    const url = new URL(siguiente, window.location.origin);
    const token = url.searchParams.get("token");

    if (
      url.origin !== window.location.origin ||
      url.pathname !== "/invitaciones/aceptar" ||
      !token ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
      return null;
    }

    return `/invitaciones/aceptar?token=${token}`;
  } catch {
    return null;
  }
}
