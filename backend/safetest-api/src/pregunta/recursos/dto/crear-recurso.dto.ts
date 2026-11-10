import { IsDefined, IsIn } from 'class-validator';

export const TIPOS_CONTENIDO_ESCRITO = ['tabla', 'formula'] as const;
export type TipoContenidoEscrito = (typeof TIPOS_CONTENIDO_ESCRITO)[number];

/**
 * Tabla o fórmula que se agrega a una pregunta. Las imágenes no usan este DTO:
 * llegan como archivo multipart.
 *
 * `contenido` se valida a fondo en el servicio según el tipo.
 */
export class CrearRecursoDto {
  @IsIn(TIPOS_CONTENIDO_ESCRITO, {
    message: 'El tipo debe ser "tabla" o "formula"',
  })
  tipo: TipoContenidoEscrito;

  @IsDefined({ message: 'El contenido es obligatorio' })
  contenido: unknown;
}