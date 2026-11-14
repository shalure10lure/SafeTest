import { IsBoolean, IsIn, IsObject, ValidateIf } from 'class-validator';

import {
  TIPOS_RESPUESTA,
  type TipoRespuesta,
} from '../../pregunta/entity/dtos/create-pregunta.dto';

/**
 * Datos para registrar una regla de corrección.
 *
 * No incluye `docente_id`, `regla_id` ni fechas: el docente se obtiene del JWT
 * y los demás valores los controla el servidor.
 */
export class CrearReglaCorreccionDto {
  @IsIn(TIPOS_RESPUESTA, {
    message: 'El tipo de pregunta no es válido',
  })
  tipo_respuesta: TipoRespuesta;

  @IsObject({
    message: 'Los parámetros de la regla deben ser un objeto JSON',
  })
  parametros: Record<string, unknown>;

  @ValidateIf((_objeto, valor: unknown) => valor !== undefined)
  @IsBoolean({ message: 'El estado activo debe ser booleano' })
  activo?: boolean;
}
