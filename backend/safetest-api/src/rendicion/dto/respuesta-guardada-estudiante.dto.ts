export class RespuestaGuardadaEstudianteDto {
  examen_id: number;
  pregunta_id: number;
  letra: string;
  estado_respuesta: 'respondida' | 'pendiente';
  guardado_en: Date;
}
