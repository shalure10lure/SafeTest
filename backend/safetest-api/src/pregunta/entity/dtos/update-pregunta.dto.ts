
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePreguntaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El enunciado no puede estar vacío' })
  enunciado?: string;

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
}
