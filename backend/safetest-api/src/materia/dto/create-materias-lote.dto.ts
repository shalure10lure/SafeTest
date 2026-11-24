import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';

import { CreateMateriaDto } from './create-materia.dto';

/** Máximo de materias que se pueden crear de una sola vez. */
export const MAX_MATERIAS_POR_LOTE = 30;

/**
 * Cuerpo de POST /materias/lote.
 * Cada elemento usa las mismas reglas que crear una materia individual.
 */
export class CreateMateriasLoteDto {
    @IsArray({ message: 'Debes enviar una lista de materias' })
    @ArrayMinSize(1, { message: 'Agrega al menos una materia' })
    @ArrayMaxSize(MAX_MATERIAS_POR_LOTE, {
        message: `Puedes crear hasta ${MAX_MATERIAS_POR_LOTE} materias a la vez`,
    })
    @ValidateNested({ each: true })
    @Type(() => CreateMateriaDto)
    materias: CreateMateriaDto[];
}
