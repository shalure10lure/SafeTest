import type { EstadoDisponibilidadEvaluacion } from './evaluacion-asignada.dto';

/**
 * Metadatos e instrucciones previas para un estudiante asignado.
 * No contiene preguntas ni información de rendición.
 */
export class InstruccionesEvaluacionEstudianteDto {
  examen_id: number;
  titulo: string | null;
  instrucciones: string | null;
  materia: string | null;
  docente: string | null;
  duracion_min: number | null;
  disponible_desde: Date | null;
  disponible_hasta: Date | null;
  total_preguntas: number;
  estado_disponibilidad: EstadoDisponibilidadEvaluacion;
  paralelos_rendicion: {
    paralelo_id: number;
    nombre_paralelo: string;
  }[];
}
