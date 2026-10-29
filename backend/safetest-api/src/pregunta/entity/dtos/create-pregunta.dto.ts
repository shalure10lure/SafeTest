
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePreguntaDto {
  @IsString({ message: 'El enunciado debe ser texto' })
  @IsNotEmpty({ message: 'El enunciado es obligatorio' })
  enunciado: string;

  @IsInt({ message: 'El tema debe ser un número entero' })
  @Min(1, { message: 'El tema debe ser válido' })
  tema_id: number;

  @IsOptional()
  @IsString({ message: 'La dificultad debe ser texto' })
  @IsIn(['facil', 'media', 'dificil'], {
    message: 'La dificultad debe ser facil, media o dificil',
  })
  dificultad?: string;
}
