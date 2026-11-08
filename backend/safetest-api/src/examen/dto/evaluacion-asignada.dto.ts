export type EstadoDisponibilidadEvaluacion =
  | 'proxima'
  | 'disponible'
  | 'finalizada';

/**
 * Metadatos de una evaluación asignada al estudiante autenticado.
 * No incluye preguntas, respuestas ni información de rendición.
 */
export class EvaluacionAsignadaDto {
  examen_id: number;
  titulo: string | null;
  materia: string | null;
  docente: string | null;
  disponible_desde: Date | null;
  disponible_hasta: Date | null;
  duracion_min: number | null;
  total_preguntas: number;
  estado_disponibilidad: EstadoDisponibilidadEvaluacion | null;
}
