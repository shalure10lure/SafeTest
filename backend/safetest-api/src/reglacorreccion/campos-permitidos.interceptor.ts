import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';

/**
 * Rechaza propiedades del cuerpo que el DTO no declara.
 *
 * El ValidationPipe global usa `whitelist: true`, que elimina las propiedades
 * desconocidas en lugar de rechazarlas. Este interceptor se ejecuta antes de
 * los pipes y solo se aplica a las rutas que lo declaran, de modo que el
 * rechazo estricto no cambia el comportamiento del resto de la API.
 */
@Injectable()
export class CamposPermitidosInterceptor implements NestInterceptor {
  constructor(private readonly camposPermitidos: readonly string[]) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const cuerpo: unknown = request.body;

    if (
      typeof cuerpo === 'object' &&
      cuerpo !== null &&
      !Array.isArray(cuerpo)
    ) {
      const noPermitidos = Object.keys(cuerpo).filter(
        (campo) => !this.camposPermitidos.includes(campo),
      );

      if (noPermitidos.length > 0) {
        throw new BadRequestException(
          `Propiedades no permitidas: ${noPermitidos.join(', ')}`,
        );
      }
    }

    return next.handle();
  }
}
