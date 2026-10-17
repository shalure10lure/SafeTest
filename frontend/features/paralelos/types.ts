export interface Paralelo {
  paralelo_id: number;
  nombre_paralelo: string;
  materia_id: number;
  semestre_id: number;
  docente_id: number;

  materia?: {
    materia_id: number;
    nombre: string;
    codigo?: string;
  };

  semestre?: {
    semestre_id: number;
    gestion: string;
  };

  inscripciones?: unknown[];
}

export interface CreateParaleloDto {
  nombre_paralelo: string;
  materia_id: number;
  semestre_id: number;
}

export interface UpdateParaleloDto {
  nombre_paralelo?: string;
  materia_id?: number;
  semestre_id?: number;
}