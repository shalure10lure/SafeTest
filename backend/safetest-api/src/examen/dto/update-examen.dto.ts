import { Type } from 'class-transformer';
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class UpdateExamenDto {
    @IsOptional()
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre de la evaluación no puede estar vacío' })
    @MaxLength(200)
    titulo?: string;

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

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    paralelo_id?: number;

    // Se permite "" para borrar las instrucciones.
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    instrucciones?: string;
}