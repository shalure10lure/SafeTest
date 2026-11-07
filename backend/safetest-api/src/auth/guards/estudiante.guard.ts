import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class EstudianteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (request.user?.tipo !== 'estudiante') {
      throw new ForbiddenException(
        'Solo los estudiantes pueden acceder a esta información',
      );
    }

    return true;
  }
}
