import { Type } from 'class-transformer';
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateExamenDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre de la evaluación es obligatorio' })
    @MaxLength(200)
    titulo: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    materia_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    semestre_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    paralelo_id: number;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    instrucciones?: string;
}