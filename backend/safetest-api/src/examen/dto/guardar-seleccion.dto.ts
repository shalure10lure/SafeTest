import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayUnique,
    IsArray,
    IsIn,
    IsInt,
    Min,
    ValidateIf,
    ValidateNested,
} from 'class-validator';

export class CriterioTemaDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    tema_id: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    cantidad: number;
}

export class GuardarSeleccionDto {
    @IsIn(['manual', 'aleatorio'], {
        message: 'El modo de selección debe ser manual o aleatorio',
    })
    modo_seleccion: 'manual' | 'aleatorio';

    // Solo se exige en modo manual.
    @ValidateIf((dto: GuardarSeleccionDto) => dto.modo_seleccion === 'manual')
    @IsArray()
    @ArrayMaxSize(200)
    @ArrayUnique()
    @Type(() => Number)
    @IsInt({ each: true })
    @Min(1, { each: true })
    pregunta_ids?: number[];

    // Solo se exige en modo aleatorio.
    @ValidateIf((dto: GuardarSeleccionDto) => dto.modo_seleccion === 'aleatorio')
    @IsArray()
    @ArrayMaxSize(50)
    @ValidateNested({ each: true })
    @Type(() => CriterioTemaDto)
    criterios?: CriterioTemaDto[];
}