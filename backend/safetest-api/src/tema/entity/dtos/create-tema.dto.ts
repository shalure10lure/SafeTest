
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTemaDto {
  @IsString({ message: 'El nombre del tema debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del tema es obligatorio' })
  @MaxLength(150, {
    message: 'El nombre del tema no puede superar 150 caracteres',
  })
  nombre_tema: string;

  @IsInt({ message: 'La materia debe ser un identificador válido' })
  @Min(1, { message: 'La materia debe ser válida' })
  materia_id: number;
}
