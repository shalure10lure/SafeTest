import {
  Catch,
  Inject,
  PayloadTooLargeException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

import {
  MATERIALES_CONFIG,
  type MaterialesConfig,
} from '../config/materiales.config';

/**
 * Traduce el error de tamaño de multer ("File too large") a un mensaje en
 * español con el límite configurado.
 *
 * Multer corta la lectura antes de que el servicio vea el archivo, así que el
 * límite también debe explicarse aquí y no solo en la validación del servicio.
 */
@Catch(PayloadTooLargeException)
export class MaterialesTamanoFilter implements ExceptionFilter {
  constructor(
    @Inject(MATERIALES_CONFIG) private readonly config: MaterialesConfig,
  ) {}

  catch(_excepcion: PayloadTooLargeException, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const limiteMb = Math.floor(this.config.maxBytes / 1024 / 1024);

    respuesta.status(413).json({
      statusCode: 413,
      error: 'Payload Too Large',
      message: `El archivo supera el tamaño máximo de ${limiteMb} MB.`,
    });
  }
}
