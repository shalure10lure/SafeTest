import { IsString,IsNotEmpty } from 'class-validator';

export class CreateCategoria {
  @IsString()
  @IsNotEmpty()
  nombre: string;
  @IsNotEmpty()
  descripcion: string;
}