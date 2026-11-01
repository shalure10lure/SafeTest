import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const TIPOS_RESPUESTA = [
  'opcion_unica',
  'opcion_multiple',
  'verdadero_falso',
  'desarrollo',
  'numerica',
] as const;

export type TipoRespuesta = (typeof TIPOS_RESPUESTA)[number];

export class OpcionPreguntaDto {
  @IsString({ message: 'El texto de la opción debe ser texto' })
  @IsNotEmpty({ message: 'El texto de la opción es obligatorio' })
  @MaxLength(500, {
    message: 'El texto de la opción no puede superar los 500 caracteres',
  })
  texto_opcion: string;

  @IsBoolean({ message: 'Debes indicar si la opción es correcta' })
  es_correcta: boolean;
}

export class CreatePreguntaDto {
  @IsString({ message: 'El enunciado debe ser texto' })
  @IsNotEmpty({ message: 'El enunciado es obligatorio' })
  enunciado: string;

  @IsInt({ message: 'La materia debe ser un número entero' })
  @Min(1, { message: 'La materia debe ser válida' })
  materia_id: number;

  @IsInt({ message: 'El tema debe ser un número entero' })
  @Min(1, { message: 'El tema debe ser válido' })
  tema_id: number;

  @IsOptional()
  @IsString({ message: 'La dificultad debe ser texto' })
  @IsIn(['facil', 'media', 'dificil'], {
    message: 'La dificultad debe ser facil, media o dificil',
  })
  dificultad?: string;

  @IsString({ message: 'El tipo de pregunta debe ser texto' })
  @IsIn(TIPOS_RESPUESTA, {
    message: 'El tipo de pregunta no es válido',
  })
  tipo_respuesta: TipoRespuesta;

  @Type(() => Number)
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 },
    { message: 'El puntaje debe ser un número válido' },
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
  solucion_referencia?: string;
}
