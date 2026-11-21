import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import type { EstadoCorreccionIa } from '../entity/correccionia.entity';

export const ESTADOS_CORRECCION_IA_VALIDOS: readonly EstadoCorreccionIa[] = [
  'pendiente',
  'procesando',
  'generada',
  'modificada',
  'aceptada',
  'descartada',
  'error',
  'reemplazada',
];

export class ListarCorreccionesIaDto {
  @IsOptional()
  @IsIn(ESTADOS_CORRECCION_IA_VALIDOS)
  estado?: EstadoCorreccionIa;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estudiante_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pregunta_id?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  solo_pendientes_revision?: unknown;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limite = 100;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  desplazamiento = 0;
}

export class ListarHistorialCorreccionesIaDto {
  @IsOptional()
  @IsIn(ESTADOS_CORRECCION_IA_VALIDOS)
  estado?: EstadoCorreccionIa;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite = 50;
}
