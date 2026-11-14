import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayUnique,
    IsArray,
    IsIn,
    IsInt,
    IsNumber,
    IsOptional,
    IsPositive,
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

/**
 * Puntaje propio de una pregunta dentro de la evaluación. Es independiente del
 * puntaje del banco: al agregar la pregunta se propone la suma de sus incisos,
 * pero el docente puede ajustarlo.
 */
export class PuntajePreguntaDto {
    @Type(() => Number)
    @IsInt({ message: 'El identificador de la pregunta debe ser un número entero' })
    @Min(1, { message: 'El identificador de la pregunta debe ser mayor que cero' })
    pregunta_id: number;

    @Type(() => Number)
    @IsNumber(
        { maxDecimalPlaces: 2 },
        {
            message:
                'El puntaje de la pregunta debe ser un número con un máximo de 2 decimales',
        },
    )
    @IsPositive({ message: 'El puntaje de la pregunta debe ser mayor que cero' })
    puntaje: number;
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

    // Puntajes propios de las preguntas. Si se omite una pregunta, se usa el
    // puntaje del banco (suma de los `puntaje_max` de sus incisos).
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(200)
    @ArrayUnique((item: PuntajePreguntaDto) => item.pregunta_id)
    @ValidateNested({ each: true })
    @Type(() => PuntajePreguntaDto)
    puntajes?: PuntajePreguntaDto[];

    // Solo se exige en modo aleatorio.
    @ValidateIf((dto: GuardarSeleccionDto) => dto.modo_seleccion === 'aleatorio')
    @IsArray()
    @ArrayMaxSize(50)
    @ValidateNested({ each: true })
    @Type(() => CriterioTemaDto)
    criterios?: CriterioTemaDto[];
}