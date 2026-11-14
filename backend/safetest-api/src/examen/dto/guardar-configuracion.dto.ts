import { Type } from 'class-transformer';
import {
    IsDateString,
    IsIn,
    IsInt,
    IsNumber,
    IsPositive,
    Max,
    Min,
} from 'class-validator';

export class GuardarConfiguracionDto {
    @IsIn(['definido', 'aleatorio'], {
        message: 'El orden de preguntas debe ser definido o aleatorio',
    })
    orden_preguntas: 'definido' | 'aleatorio';

    @Type(() => Number)
    @IsInt({ message: 'La duración debe ser un número entero de minutos' })
    @Min(5, { message: 'La duración mínima es de 5 minutos' })
    @Max(720, { message: 'La duración máxima es de 12 horas' })
    duracion_min: number;

    @IsDateString({}, { message: 'La fecha de inicio es obligatoria' })
    disponible_desde: string;

    @IsDateString({}, { message: 'La fecha de finalización es obligatoria' })
    disponible_hasta: string;

    @IsIn(['al_publicar', 'inmediata'], {
        message: 'La publicación de resultados debe ser al_publicar o inmediata',
    })
    modo_entrega_nota: 'al_publicar' | 'inmediata';

    @Type(() => Number)
    @IsNumber(
        { maxDecimalPlaces: 2 },
        {
            message:
                'El puntaje total debe ser un número con un máximo de 2 decimales',
        },
    )
    @IsPositive({ message: 'El puntaje total debe ser mayor que cero' })
    puntaje_total: number;
}