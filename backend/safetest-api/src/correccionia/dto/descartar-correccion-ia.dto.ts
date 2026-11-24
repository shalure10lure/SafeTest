import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DescartarCorreccionIaDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string | null;
}
