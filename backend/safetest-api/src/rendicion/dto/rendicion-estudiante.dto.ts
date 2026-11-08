export class RendicionEstudianteDto {
  examen_id: number;
  paralelo_id: number;
  estado: 'en_curso';
  fecha_inicio: Date | null;
  preguntas: {
    pregunta_id: number;
    orden: number;
  }[];
  recuperada: boolean;
}
