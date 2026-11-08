import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
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
}
