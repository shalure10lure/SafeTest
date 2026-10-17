
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class CreateParaleloDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre_paralelo: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  materia_id: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  semestre_id: number;
}
