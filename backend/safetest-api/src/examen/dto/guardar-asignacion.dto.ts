import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    ArrayUnique,
    IsArray,
    IsIn,
    IsInt,
    ValidateIf,
} from 'class-validator';

export class GuardarAsignacionDto {
    @IsIn(['paralelos', 'estudiantes'], {
        message: 'El modo de asignación debe ser paralelos o estudiantes',
    })
    modo_asignacion: 'paralelos' | 'estudiantes';

    @ValidateIf((dto: GuardarAsignacionDto) => dto.modo_asignacion === 'paralelos')
    @IsArray()
    @ArrayNotEmpty({ message: 'Selecciona al menos un paralelo' })
    @ArrayUnique()
    @Type(() => Number)
    @IsInt({ each: true })
    paralelo_ids?: number[];

    @ValidateIf((dto: GuardarAsignacionDto) => dto.modo_asignacion === 'estudiantes')
    @IsArray()
    @ArrayNotEmpty({ message: 'Selecciona al menos un estudiante' })
    @ArrayUnique()
    @Type(() => Number)
    @IsInt({ each: true })
    estudiante_ids?: number[];
}