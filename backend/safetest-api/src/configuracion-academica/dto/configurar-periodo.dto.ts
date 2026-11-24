import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
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
    ValidateNested,
} from 'class-validator';

import { CreateMateriaDto } from '../../materia/dto/create-materia.dto';

/** Datos del periodo (mismas reglas que al crear un periodo normal). */
export class PeriodoAsistenteDto {
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
}

/**
 * Paralelos que se crearán para UNA materia.
 * La materia se indica de una de estas dos formas:
 *  - materia_id: una materia que ya existe
 *  - materia_nueva_indice: posición (desde 0) dentro de `materias_nuevas`
 */
export class ParalelosMateriaDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    materia_id?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    materia_nueva_indice?: number;

    @IsArray()
    @ArrayMaxSize(20, { message: 'Máximo 20 paralelos por materia' })
    @IsString({ each: true })
    nombres: string[];
}

/** Cuerpo de POST /configuracion-academica/periodo */
export class ConfigurarPeriodoDto {
    @ValidateNested()
    @Type(() => PeriodoAsistenteDto)
    periodo: PeriodoAsistenteDto;

    /** Materias que ya existen y se asocian al periodo. */
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    materia_ids?: number[];

    /** Materias nuevas que se crean junto con el periodo. */
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(30, { message: 'Máximo 30 materias nuevas a la vez' })
    @ValidateNested({ each: true })
    @Type(() => CreateMateriaDto)
    materias_nuevas?: CreateMateriaDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ParalelosMateriaDto)
    paralelos?: ParalelosMateriaDto[];
}
