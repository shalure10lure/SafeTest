import { IsBoolean, IsIn, IsObject, ValidateIf } from 'class-validator';

import {
  TIPOS_RESPUESTA,
  type TipoRespuesta,
} from '../../pregunta/entity/dtos/create-pregunta.dto';

/**
 * Datos para actualizar una regla de corrección propia.
 *
 * Todos los campos son opcionales, pero ninguno puede ser `null`. No incluye
 * `docente_id` ni `regla_id`: la pertenencia se valida contra el JWT.
 */
export class ActualizarReglaCorreccionDto {
  @ValidateIf((_objeto, valor: unknown) => valor !== undefined)
  @IsIn(TIPOS_RESPUESTA, {
    message: 'El tipo de pregunta no es válido',
  })
  tipo_respuesta?: TipoRespuesta;

  @ValidateIf((_objeto, valor: unknown) => valor !== undefined)
  @IsObject({
    message: 'Los parámetros de la regla deben ser un objeto JSON',
  })
  parametros?: Record<string, unknown>;

  @ValidateIf((_objeto, valor: unknown) => valor !== undefined)
  @IsBoolean({ message: 'El estado activo debe ser booleano' })
  activo?: boolean;
}
