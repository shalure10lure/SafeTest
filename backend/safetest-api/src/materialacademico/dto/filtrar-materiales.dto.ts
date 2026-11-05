import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

/** Filtros opcionales del listado; el docente siempre sale del JWT. */
export class FiltrarMaterialesDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsInt({ message: 'La materia debe ser un número entero' })
  @Min(1, { message: 'La materia debe ser válida' })
  materia_id?: number;

  @IsOptional()
  @Transform(({ value }) => aBooleano(value))
  @IsBoolean({ message: 'El filtro activo debe ser true o false' })
  activo?: boolean;
}

function aBooleano(valor: unknown): unknown {
  if (valor === undefined || valor === null || valor === '') {
    return undefined;
  }

  if (typeof valor === 'boolean') {
    return valor;
  }

  if (valor === 'true' || valor === '1') {
    return true;
  }

  if (valor === 'false' || valor === '0') {
    return false;
  }

  return valor;
}
