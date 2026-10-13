import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

@Injectable()
export class DocenteGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();

        if (request.user?.tipo !== 'docente') {
            throw new ForbiddenException(
                'Solo los docentes pueden gestionar materias',
            );
        }

        return true;
    }
}