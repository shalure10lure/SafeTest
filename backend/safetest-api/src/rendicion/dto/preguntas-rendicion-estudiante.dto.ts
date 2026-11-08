export type EstadoRespuestaPregunta = 'respondida' | 'pendiente';

export class OpcionRendicionEstudianteDto {
  nro_opcion: number;
  texto_opcion: string;
}

export class IncisoRendicionEstudianteDto {
  letra: string;
  enunciado_inciso: string;
  tipo_respuesta: string;
  opciones: OpcionRendicionEstudianteDto[];
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
