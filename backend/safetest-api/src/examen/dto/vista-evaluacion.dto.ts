/**
 * Vistas explícitas de una evaluación para docentes y estudiantes.
 *
 * La separación es intencional: el estudiante nunca recibe la explicación ni
 * los campos de solución, salvo que exista una publicación autorizada
 * (`examen.resultados_publicados_en`). No se devuelven entidades de TypeORM.
 */

/** Opción visible para responder. Nunca indica cuál es correcta. */
export class OpcionEstudianteDto {
  nro_opcion: number;
  texto_opcion: string;
}

/** Inciso visible para responder, sin datos de corrección. */
export class IncisoEstudianteDto {
  letra: string;
  enunciado_inciso: string;
  tipo_respuesta: string;
  /** Puntaje máximo de este inciso, almacenado en `Inciso.puntaje_max`. */
  puntaje_max: number;
  opciones: OpcionEstudianteDto[];
}

/** Pregunta visible para responder, sin explicación ni solución. */
export class PreguntaEstudianteDto {
  pregunta_id: number;
  orden: number;
  enunciado: string;
  tipo_respuesta: string | null;
  /**
   * Suma de los puntajes máximos de los incisos. Se conserva `puntaje_max`
   * por compatibilidad con el contrato existente; no es una columna propia
   * de `Pregunta`.
   */
  puntaje_max: number;
  incisos: IncisoEstudianteDto[];
}

/** Opción con la marca de respuesta correcta (solo publicación autorizada). */
export class OpcionEstudiantePublicadaDto extends OpcionEstudianteDto {
  es_correcta: boolean;
}

/** Inciso con su solución (solo publicación autorizada). */
export class IncisoEstudiantePublicadoDto extends IncisoEstudianteDto {
  declare opciones: OpcionEstudiantePublicadaDto[];
  valor_correcto: number | null;
  tolerancia: number | null;
  solucion_referencia: string | null;
}

/** Pregunta con su solución (solo publicación autorizada). */
export class PreguntaEstudiantePublicadaDto extends PreguntaEstudianteDto {
  explicacion: string | null;
  declare incisos: IncisoEstudiantePublicadoDto[];
}

/** Respuesta de la vista del estudiante. */
export class VistaEvaluacionEstudianteDto {
  examen_id: number;
  titulo: string | null;
  instrucciones: string | null;
  estado: string;
  duracion_min: number | null;
  disponible_desde: Date | null;
  disponible_hasta: Date | null;
  /** `true` cuando el docente publicó los resultados. */
  resultados_publicados: boolean;
  /** `true` cuando el estudiante puede ver las respuestas correctas. */
  respuestas_disponibles: boolean;
  /** Aviso para la interfaz cuando las respuestas aún no están disponibles. */
  mensaje: string | null;
  preguntas: PreguntaEstudianteDto[];
}

/** Opción con la solución, para la vista del docente autorizado. */
export class OpcionDocenteDto extends OpcionEstudianteDto {
  es_correcta: boolean;
}

/** Inciso con la solución, para la vista del docente autorizado. */
export class IncisoDocenteDto extends IncisoEstudianteDto {
  declare opciones: OpcionDocenteDto[];
  valor_correcto: number | null;
  tolerancia: number | null;
  solucion_referencia: string | null;
}

/** Pregunta con solución y explicación, para el docente autorizado. */
export class PreguntaDocenteDto extends PreguntaEstudianteDto {
  explicacion: string | null;
  declare incisos: IncisoDocenteDto[];
}

/** Respuesta de la vista de respuestas correctas del docente. */
export class RespuestasEvaluacionDocenteDto {
  examen_id: number;
  titulo: string | null;
  estado: string;
  resultados_publicados_en: Date | null;
  preguntas: PreguntaDocenteDto[];
}
