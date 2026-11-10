import {
  Catch,
  Inject,
  PayloadTooLargeException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

import { RECURSOS_CONFIG, type RecursosConfig } from './recursos.config';

/** Traduce el error de tamaño de multer a un mensaje en español con el límite. */
@Catch(PayloadTooLargeException)
export class RecursosTamanoFilter implements ExceptionFilter {
  constructor(
    @Inject(RECURSOS_CONFIG) private readonly config: RecursosConfig,
  ) {}

  catch(_excepcion: PayloadTooLargeException, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const limiteMb = Number((this.config.maxBytesImagen / 1024 / 1024).toFixed(1));

    respuesta.status(413).json({
      statusCode: 413,
      error: 'Payload Too Large',
      message: `La imagen supera el tamaño máximo de ${limiteMb} MiB`,
    });
  }
}