import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';

const CORRECCION_IA_INPUT_KEY = 'correccionia:input';

type CorreccionIaInputSource = 'body' | 'query';

interface CorreccionIaInputMetadata {
  source: CorreccionIaInputSource;
  dto: Type<unknown>;
}

export function ValidarEntradaCorreccionIa(
  source: CorreccionIaInputSource,
  dto: Type<unknown>,
): MethodDecorator {
  return SetMetadata(CORRECCION_IA_INPUT_KEY, { source, dto });
}

@Injectable()
export class CorreccionIaInputGuard implements CanActivate {
  private readonly validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = Reflect.getMetadata(
      CORRECCION_IA_INPUT_KEY,
      context.getHandler(),
    ) as CorreccionIaInputMetadata | undefined;

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const value = request[metadata.source] ?? {};

    await this.validationPipe.transform(value, {
      type: metadata.source,
      metatype: metadata.dto,
    });

    return true;
  }
}
