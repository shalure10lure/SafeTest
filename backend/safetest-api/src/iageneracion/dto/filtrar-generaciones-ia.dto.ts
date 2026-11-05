import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

import {
  ESTADOS_GENERACION,
  type EstadoGeneracion,
} from '../iageneracion.types';

function aEntero(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === '') {
    return undefined;
  }

  return Number(valor);
}

/** Filtros opcionales del listado; el docente siempre sale del JWT. */
export class FiltrarGeneracionesIaDto {
  @IsOptional()
  @IsIn(ESTADOS_GENERACION, {
    message: 'El estado de la generación no es válido',
  })
  estado?: EstadoGeneracion;

  @IsOptional()
  @Transform(({ value }) => aEntero(value))
  @IsInt({ message: 'La materia debe ser un número entero' })
  @Min(1, { message: 'La materia debe ser válida' })
  materia_id?: number;
}
