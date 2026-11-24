import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Cuerpo opcional del lote de corrección con IA. Sin `estudiante_id` se
 * procesan todas las rendiciones del examen; con él, solo las de ese estudiante
 * (botón «Revisar con IA» junto a «Revisar resultado»).
 */
export class SolicitarLoteCorreccionIaDto {
  @IsOptional()
  @IsInt({ message: 'El estudiante debe ser un número entero' })
  @Min(1, { message: 'El estudiante no es válido' })
  estudiante_id?: number;
}
