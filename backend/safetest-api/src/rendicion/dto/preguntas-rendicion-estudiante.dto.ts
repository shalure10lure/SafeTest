export type EstadoRespuestaPregunta = 'respondida' | 'pendiente';

export class OpcionRendicionEstudianteDto {
  nro_opcion: number;
  texto_opcion: string;
}

/** Respuesta propia ya guardada; mismo formato que acepta el PATCH. */
export type RespuestaGuardadaIncisoDto =
  | { opciones: number[] }
  | { respuesta_texto: string };

export interface FormulaPermitidaRendicionDto {
  formula_id: number;
  expresion: string;
}

export interface ModeloPermitidoRendicionDto {
  modelo_id: number;
  nombre: string;
  descripcion: string | null;
  variables: Record<string, unknown>;
  formulas_permitidas: FormulaPermitidaRendicionDto[];
}

export interface ProcedimientoRendicionDto {
  modelo_id: number;
  valores: Record<string, unknown>;
  resultado_final: string | null;
  formula_ids: number[];
}

export class IncisoRendicionEstudianteDto {
  letra: string;
  enunciado_inciso: string;
  tipo_respuesta: string;
  opciones: OpcionRendicionEstudianteDto[];
  /** Solo aparece si el estudiante ya respondió este inciso. */
  respuesta?: RespuestaGuardadaIncisoDto;
  modelos_permitidos: ModeloPermitidoRendicionDto[];
  procedimiento: ProcedimientoRendicionDto | null;
}

export class PreguntaRendicionEstudianteDto {
  pregunta_id: number;
  orden: number;
  enunciado: string;
  tipo_respuesta: string | null;
  incisos: IncisoRendicionEstudianteDto[];
  estado_respuesta: EstadoRespuestaPregunta;
}

export class PreguntasRendicionEstudianteDto {
  examen_id: number;
  preguntas: PreguntaRendicionEstudianteDto[];
}
