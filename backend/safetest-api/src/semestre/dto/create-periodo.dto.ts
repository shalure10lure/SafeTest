import {
    ArrayUnique,
    IsArray,
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class CreatePeriodoDto {
    @IsString({ message: 'La gestión debe ser texto' })
    @IsNotEmpty({ message: 'La gestión es obligatoria' })
    @MaxLength(50)
    gestion: string;

    @IsInt({ message: 'El número de pruebas debe ser un entero' })
    @Min(1, { message: 'Debe haber al menos 1 prueba' })
    @Max(20)
    nro_pruebas: number;

    @IsDateString({}, { message: 'La fecha de inicio es obligatoria (AAAA-MM-DD)' })
    fecha_inicio: string;

    @IsDateString({}, { message: 'La fecha de fin es obligatoria (AAAA-MM-DD)' })
    fecha_fin: string;

    // Materias del docente relacionadas con el periodo
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    materiaIds?: number[];
}