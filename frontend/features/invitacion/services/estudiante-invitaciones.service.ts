
import { BaseService } from "@/services/api/base.service";

export interface InvitacionEstudiante {
  invitacion_id: number;
  correo_institucional: string;
  estado: "pendiente" | "aceptada" | "vencida";
  fecha_creacion: string;
  fecha_expiracion: string;
  paralelo: {
    paralelo_id: number;
    nombre: string;
    materia: string | null;
    periodo: string | null;
    docente: string | null;
  };
}

export interface AceptacionPanelResponse {
  message: string;
  invitacion_id: number;
  paralelo_id: number;
  estado: "aceptada";
}

class EstudianteInvitacionesService extends BaseService {
  constructor() {
    super("/invitaciones");
  }

  listar(): Promise<InvitacionEstudiante[]> {
    return this.get<InvitacionEstudiante[]>(
      "/mis-invitaciones",
    );
  }

  aceptar(
    invitacionId: number,
  ): Promise<AceptacionPanelResponse> {
    return this.post<
      AceptacionPanelResponse,
      Record<string, never>
    >(
      `/mis-invitaciones/${invitacionId}/aceptar`,
      {},
    );
  }
}

export const estudianteInvitacionesService =
  new EstudianteInvitacionesService();
