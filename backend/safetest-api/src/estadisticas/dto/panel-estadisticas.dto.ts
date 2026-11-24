import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** Convierte "" o undefined en undefined y el resto en número. */
function aEntero(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === '') {
    return undefined;
  }

  return Number(valor);
}

/**
 * Filtros del panel de estadísticas (GET /estadisticas/panel).
 * Todos son opcionales: si faltan, el backend elige la materia y el periodo
 * más recientes con datos.
 */
export class PanelEstadisticasQueryDto {
  @IsOptional()
  @Transform(({ value }) => aEntero(value))
  @IsInt({ message: 'La materia debe ser un número entero' })
  @Min(1, { message: 'La materia debe ser válida' })
  materia_id?: number;

  @IsOptional()
  @Transform(({ value }) => aEntero(value))
  @IsInt({ message: 'El periodo debe ser un número entero' })
  @Min(1, { message: 'El periodo debe ser válido' })
  semestre_id?: number;

  @IsOptional()
  @Transform(({ value }) => aEntero(value))
  @IsInt({ message: 'La evaluación debe ser un número entero' })
  @Min(1, { message: 'La evaluación debe ser válida' })
  examen_id?: number;

  @IsOptional()
  @Transform(({ value }) => aEntero(value))
  @IsInt({ message: 'El paralelo debe ser un número entero' })
  @Min(1, { message: 'El paralelo debe ser válido' })
  paralelo_id?: number;
}
