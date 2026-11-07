import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import { DocenteGuard } from './docente.guard';
import { EstudianteGuard } from './estudiante.guard';

function contextoConUsuario(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('guards de rol', () => {
  it('DocenteGuard permite docentes autenticados', () => {
    const guard = new DocenteGuard();

    expect(
      guard.canActivate(contextoConUsuario({ id: 1, tipo: 'docente' })),
    ).toBe(true);
  });

  it('DocenteGuard niega estudiantes y usuarios sin sesión', () => {
    const guard = new DocenteGuard();

    expect(() =>
      guard.canActivate(contextoConUsuario({ id: 2, tipo: 'estudiante' })),
    ).toThrow(ForbiddenException);

    expect(() => guard.canActivate(contextoConUsuario(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('EstudianteGuard permite estudiantes autenticados', () => {
    const guard = new EstudianteGuard();

    expect(
      guard.canActivate(contextoConUsuario({ id: 2, tipo: 'estudiante' })),
    ).toBe(true);
  });

  it('EstudianteGuard niega docentes y usuarios sin sesión', () => {
    const guard = new EstudianteGuard();

    expect(() =>
      guard.canActivate(contextoConUsuario({ id: 1, tipo: 'docente' })),
    ).toThrow(ForbiddenException);

    expect(() => guard.canActivate(contextoConUsuario(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
