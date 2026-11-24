import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ErrorCorreccionIaDto {
  @IsString()
  @MinLength(1)
  tipo: string;

  @IsString()
  @MinLength(1)
  descripcion: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  ubicacion?: string;
}

export class ActualizarCorreccionIaDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  puntaje?: number;

  @IsOptional()
  @IsString()
  valoracion?: string;

  @IsOptional()
  @IsString()
  explicacion?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ErrorCorreccionIaDto)
  errores?: ErrorCorreccionIaDto[];
}
