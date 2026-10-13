import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class UpdatePeriodoDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'La gestión no puede estar vacía' })
    @MaxLength(50)
    gestion?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    nro_pruebas?: number;

    @IsOptional()
    @IsDateString()
    fecha_inicio?: string;

    @IsOptional()
    @IsDateString()
    fecha_fin?: string;

    @IsOptional()
    @IsBoolean()
    activo?: boolean;

    // Si se envía, REEMPLAZA el conjunto de materias del periodo
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    materiaIds?: number[];
}