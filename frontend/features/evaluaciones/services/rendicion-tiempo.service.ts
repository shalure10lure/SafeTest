import { BaseService } from '@/services/api/base.service';

/** Datos de la rendición. Las fechas llegan como ISO desde NestJS. */
export interface EstadoTiempoRendicion {
  examen_id: number;
  estado: string;
  fecha_inicio: string | null;
  fecha_limite: string | null;
  fecha_envio: string | null;
  tiempo_servidor: string;
  vencida: boolean;
  puede_responder: boolean;
}

class RendicionTiempoService extends BaseService {
  constructor() {
    super('/examenes');
  }

  obtenerEstado(examenId: number): Promise<EstadoTiempoRendicion> {
    return this.get<EstadoTiempoRendicion>(
      `/${examenId}/estudiante/rendicion/estado`,
    );
  }
}

export const rendicionTiempoService = new RendicionTiempoService();
