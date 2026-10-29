
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTemaDto {
  @IsOptional()
  @IsString({ message: 'El nombre del tema debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del tema no puede estar vacío' })
  @MaxLength(150, {
    message: 'El nombre del tema no puede superar 150 caracteres',
  })
  nombre_tema?: string;

  @IsOptional()
  @IsInt({ message: 'La materia debe ser un identificador válido' })
  @Min(1, { message: 'La materia debe ser válida' })
  materia_id?: number;
}
