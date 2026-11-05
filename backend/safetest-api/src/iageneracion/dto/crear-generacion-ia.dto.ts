import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';

import type { DificultadIa } from '../../ia/ai.types';
import { MAX_MATERIALES_IA } from '../../config/ia.config';
import {
  TIPOS_RESPUESTA,
  type TipoRespuesta,
} from '../../pregunta/entity/dtos/create-pregunta.dto';
import {
  CANTIDAD_MAXIMA_PREGUNTAS,
  CANTIDAD_MINIMA_PREGUNTAS,
  DIFICULTADES_IA,
} from '../iageneracion.types';

/**
 * Parámetros que puede enviar el docente para crear una generación.
 *
 * No incluye docente_id, estado ni fechas: esos valores los decide el
 * servidor a partir del JWT y del ciclo de vida del worker.
 */
export class CrearGeneracionIaDto {
  @Type(() => Number)
  @IsInt({ message: 'La materia debe ser un número entero' })
  @Min(1, { message: 'La materia debe ser válida' })
  materia_id: number;

  @Type(() => Number)
  @IsInt({ message: 'El tema debe ser un número entero' })
  @Min(1, { message: 'El tema debe ser válido' })
  tema_id: number;

  @IsIn(TIPOS_RESPUESTA, {
    message: 'El tipo de pregunta no es válido',
  })
  tipo_respuesta: TipoRespuesta;

  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(CANTIDAD_MINIMA_PREGUNTAS, {
    message: `La cantidad debe ser al menos ${CANTIDAD_MINIMA_PREGUNTAS}`,
  })
  @Max(CANTIDAD_MAXIMA_PREGUNTAS, {
    message: `La cantidad no puede superar ${CANTIDAD_MAXIMA_PREGUNTAS}`,
  })
  cantidad: number;

  @IsIn(DIFICULTADES_IA, {
    message: 'La dificultad debe ser facil, media o dificil',
  })
  dificultad: DificultadIa;

  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((id) => Number(id)) : value,
  )
  @IsArray({ message: 'Los materiales deben enviarse como una lista' })
  @ArrayMinSize(1, {
    message: 'Selecciona al menos un material autorizado con texto extraído',
  })
  @ArrayMaxSize(MAX_MATERIALES_IA, {
    message: `No puedes seleccionar más de ${MAX_MATERIALES_IA} materiales`,
  })
  @ArrayUnique({ message: 'Los materiales no pueden repetirse' })
  @IsInt({ each: true, message: 'Cada material debe ser un número entero' })
  @Min(1, {
    each: true,
    message: 'Cada material debe ser válido',
  })
  material_ids: number[];
}
