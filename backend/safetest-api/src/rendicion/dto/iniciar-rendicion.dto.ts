import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class IniciarRendicionDto {
  @Type(() => Number)
  @IsInt({ message: 'El paralelo debe ser un número entero.' })
  @Min(1, { message: 'El paralelo debe ser válido.' })
  paralelo_id: number;
}
