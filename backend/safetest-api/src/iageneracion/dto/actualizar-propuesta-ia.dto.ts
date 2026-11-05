import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import type { DificultadIa } from '../../ia/ai.types';
import { OpcionPreguntaDto } from '../../pregunta/entity/dtos/create-pregunta.dto';
import { DIFICULTADES_IA } from '../iageneracion.types';

/**
 * Contenido editable de una propuesta generada por IA.
 *
 * No incluye `tipo_respuesta`: el tipo es inmutable y se hereda de la
 * generación. Tampoco acepta `docente_id`, `estado` ni `pregunta_id`; esos
 * valores los controla exclusivamente el servidor.
 */
export class ActualizarPropuestaIaDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'El enunciado debe ser texto' })
  @IsNotEmpty({ message: 'El enunciado es obligatorio' })
  @MaxLength(4_000, {
    message: 'El enunciado no puede superar los 4000 caracteres',
  })
  enunciado: string;

  @IsIn(DIFICULTADES_IA, {
    message: 'La dificultad debe ser facil, media o dificil',
  })
  dificultad: DificultadIa;

  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'El puntaje debe ser un número válido con hasta 2 decimales' },
  )
  @IsPositive({ message: 'El puntaje debe ser mayor que 0' })
  puntaje_max: number;

  @IsOptional()
  @IsArray({ message: 'Las opciones deben enviarse como una lista' })
  @ArrayMinSize(2, { message: 'Agrega al menos 2 opciones con texto' })
  @ValidateNested({ each: true })
  @Type(() => OpcionPreguntaDto)
  opciones?: OpcionPreguntaDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'El valor correcto debe ser un número válido' },
  )
  valor_correcto?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'La tolerancia debe ser un número válido' },
  )
  @Min(0, { message: 'La tolerancia debe ser mayor o igual que 0' })
  tolerancia?: number;

  @IsOptional()
  @IsString({ message: 'La solución de referencia debe ser texto' })
  @MaxLength(4_000, {
    message: 'La solución de referencia no puede superar los 4000 caracteres',
  })
  solucion_referencia?: string;

  @IsOptional()
  @IsString({ message: 'La explicación debe ser texto' })
  @MaxLength(2_000, {
    message: 'La explicación no puede superar los 2000 caracteres',
  })
  explicacion?: string;
}
