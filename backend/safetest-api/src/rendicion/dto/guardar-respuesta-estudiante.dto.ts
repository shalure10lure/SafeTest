import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsObject,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class GuardarRespuestaEstudianteDto {
  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsArray({
    message: 'Las opciones seleccionadas deben enviarse como una lista.',
  })
  @ArrayUnique({ message: 'No repitas opciones seleccionadas.' })
  @IsInt({
    each: true,
    message: 'Cada opción debe ser un identificador entero.',
  })
  @Type(() => Number)
  opciones?: number[];

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsString({ message: 'La respuesta debe ser texto.' })
  respuesta_texto?: string;

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsInt({
    message: 'El modelo seleccionado debe ser un identificador entero.',
  })
  @Min(1, { message: 'El modelo seleccionado no es válido.' })
  @Type(() => Number)
  modelo_id?: number;

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsArray({
    message: 'Las fórmulas seleccionadas deben enviarse como una lista.',
  })
  @ArrayUnique({ message: 'No repitas fórmulas seleccionadas.' })
  @IsInt({
    each: true,
    message: 'Cada fórmula debe ser un identificador entero.',
  })
  @Min(1, {
    each: true,
    message: 'Cada fórmula debe ser un identificador válido.',
  })
  @Type(() => Number)
  formula_ids?: number[];

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsObject({
    message: 'Los valores del procedimiento deben ser un objeto JSON.',
  })
  valores?: Record<string, unknown>;

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsString({ message: 'El resultado final debe ser texto.' })
  resultado_final?: string;
}
