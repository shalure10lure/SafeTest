import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    ValidateNested,
} from 'class-validator';

import { PuntajePreguntaDto } from './guardar-seleccion.dto';

/**
 * Puntajes propios de las preguntas ya seleccionadas en una evaluación.
 *
 * La lista puede ser parcial: las preguntas omitidas conservan el puntaje que
 * ya tienen guardado (o el del banco si la fila es anterior a esa columna).
 */
export class GuardarPuntajesDto {
    @IsArray({ message: 'Los puntajes deben enviarse como una lista' })
    @ArrayMinSize(1, { message: 'Debe indicar al menos un puntaje' })
    @ArrayMaxSize(200, { message: 'No se pueden guardar más de 200 puntajes' })
    @ArrayUnique((item: PuntajePreguntaDto) => item.pregunta_id, {
        message: 'No se puede repetir una pregunta en los puntajes',
    })
    @ValidateNested({ each: true })
    @Type(() => PuntajePreguntaDto)
    puntajes: PuntajePreguntaDto[];
}