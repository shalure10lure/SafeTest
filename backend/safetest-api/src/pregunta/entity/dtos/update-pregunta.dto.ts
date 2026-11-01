import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  OpcionPreguntaDto,
  TIPOS_RESPUESTA,
  type TipoRespuesta,
} from './create-pregunta.dto';

export class UpdatePreguntaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El enunciado no puede estar vacío' })
  enunciado?: string;

  @IsOptional()
  @IsInt({ message: 'La materia debe ser un número entero' })
  @Min(1, { message: 'La materia debe ser válida' })
  materia_id?: number;

  @IsOptional()
  @IsInt({ message: 'El tema debe ser un número entero' })
  @Min(1, { message: 'El tema debe ser válido' })
  tema_id?: number;

  @IsOptional()
  @IsString()
  @IsIn(['facil', 'media', 'dificil'], {
    message: 'La dificultad debe ser facil, media o dificil',
  })
  dificultad?: string;

  // ---------- Configuración de respuesta (HU-10) ----------
  // Si se envía el tipo, la configuración de respuesta se reemplaza completa.
  @IsOptional()
  @IsString({ message: 'El tipo de pregunta debe ser texto' })
  @IsIn(TIPOS_RESPUESTA, {
    message: 'El tipo de pregunta no es válido',
  })
  tipo_respuesta?: TipoRespuesta;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'El puntaje debe ser un número válido' },
  )
  @IsPositive({ message: 'El puntaje debe ser mayor que 0' })
  puntaje_max?: number;

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
  solucion_referencia?: string;
}