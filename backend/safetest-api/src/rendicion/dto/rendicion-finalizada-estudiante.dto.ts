/** Resultado de finalizar manualmente una rendición (HU-26). */
export class RendicionFinalizadaEstudianteDto {
  examen_id: number;
  estado: 'enviada' | 'corregida';
  fecha_envio: Date | null;
}
