
import { BaseService } from "@/services/api/base.service";

export interface EstudianteInscrito {
  estudiante_id: number;
  nombre_completo: string;
  correo_institucional: string;
}

export interface EstudiantesParaleloResponse {
  paralelo: {
    paralelo_id: number;
    nombre: string;
    materia: string | null;
    periodo: string | null;
  };
  total_estudiantes: number;
  estudiantes: EstudianteInscrito[];
}

class ParaleloEstudiantesService extends BaseService {
  constructor() {
    super("/paralelos");
  }

  listar(
    paraleloId: number,
  ): Promise<EstudiantesParaleloResponse> {
    return this.get<EstudiantesParaleloResponse>(
      `/${paraleloId}/estudiantes`,
    );
  }
}

export const paraleloEstudiantesService =
  new ParaleloEstudiantesService();
