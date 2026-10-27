import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    ArrayUnique,
    IsArray,
    IsIn,
    IsInt,
    Max,
    Min,
    ValidateIf,
    ValidateNested,
} from 'class-validator';

export class CriterioTemaDto {
    @Type(() => Number)
    @IsInt({ message: 'El tema es obligatorio' })
    @Min(1)
    tema_id: number;

    @Type(() => Number)
    @IsInt({ message: 'La cantidad debe ser un entero' })
    @Min(1, { message: 'La cantidad mínima es 1' })
    @Max(100)
    cantidad: number;
}

export class GuardarSeleccionDto {
    @IsIn(['manual', 'aleatorio'], {
        message: 'El modo de selección debe ser manual o aleatorio',
    })
    modo_seleccion: 'manual' | 'aleatorio';

    @ValidateIf((dto: GuardarSeleccionDto) => dto.modo_seleccion === 'manual')
    @IsArray()
    @ArrayNotEmpty({ message: 'Selecciona al menos una pregunta' })
    @ArrayUnique()
    @Type(() => Number)
    @IsInt({ each: true })
    preguntaIds?: number[];

    @ValidateIf((dto: GuardarSeleccionDto) => dto.modo_seleccion === 'aleatorio')
    @IsArray()
    @ArrayNotEmpty({ message: 'Agrega al menos un criterio por tema' })
    @ValidateNested({ each: true })
    @Type(() => CriterioTemaDto)
    criterios?: CriterioTemaDto[];
}