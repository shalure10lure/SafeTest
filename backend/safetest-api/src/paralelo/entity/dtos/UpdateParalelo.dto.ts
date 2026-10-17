
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class UpdateParaleloDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre_paralelo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  materia_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semestre_id?: number;
}
