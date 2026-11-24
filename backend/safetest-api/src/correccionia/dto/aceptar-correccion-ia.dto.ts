import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class AceptarCorreccionIaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version: number;

  @IsString()
  @Matches(/^\d+(?:\.\d{1,2})?$/)
  puntaje_confirmado: string;

  @IsOptional()
  @IsString()
  retroalimentacion?: string;
}
