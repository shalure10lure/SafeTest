
import { BaseService } from "@/services/api/base.service";

export type EstadoInvitacion =
  | "pendiente"
  | "aceptada"
  | "error";

export interface Invitacion {
  invitacion_id: number;
  paralelo_id: number;
  correo_institucional: string;
  estado: EstadoInvitacion;
  fecha_creacion: string;
  fecha_envio: string | null;
  fecha_expiracion: string;
}

export interface CrearInvitacionDto {
  correo_institucional: string;
}

export interface CrearInvitacionResponse {
  invitacion_id: number;
  correo_institucional: string;
  estado: EstadoInvitacion;
  fecha_creacion: string;
  fecha_envio: string | null;
  message: string;
}

class InvitacionService extends BaseService {
  constructor() {
    super("/paralelos");
  }

  // GET /paralelos/:id/invitaciones
  listar(paraleloId: number): Promise<Invitacion[]> {
    return this.get<Invitacion[]>(
      `/${paraleloId}/invitaciones`,
    );
  }

  // POST /paralelos/:id/invitaciones
  crear(
    paraleloId: number,
    datos: CrearInvitacionDto,
  ): Promise<CrearInvitacionResponse> {
    return this.post<
      CrearInvitacionResponse,
      CrearInvitacionDto
    >(`/${paraleloId}/invitaciones`, datos);
  }
}

export const invitacionService =
  new InvitacionService();
