import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';
import type { Docente } from '../../docente/entity/docente.entity.js';
import type { Estudiante } from '../../estudiante/entity/estudiante.entity.js';

jest.unstable_mockModule('../../docente/entity/docente.entity', () => ({
  Docente: class Docente {},
}));
jest.unstable_mockModule(
  '../../estudiante/entity/estudiante.entity',
  () => ({
    Estudiante: class Estudiante {},
  }),
);

const { JwtStrategy } = await import('./jwt.strategy');

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let docenteRepository: {
    findOneBy: jest.Mock;
  };
  let estudianteRepository: {
    findOneBy: jest.Mock;
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    docenteRepository = { findOneBy: jest.fn() };
    estudianteRepository = { findOneBy: jest.fn() };

    strategy = new JwtStrategy(
      docenteRepository as unknown as Repository<Docente>,
      estudianteRepository as unknown as Repository<Estudiante>,
    );
  });

  it('uses the current docente record instead of stale token claims', async () => {
    docenteRepository.findOneBy.mockResolvedValue({
      docente_id: 7,
      nombre: 'Nombre vigente',
      correo: 'vigente@example.test',
      activo: true,
    });

    await expect(
      strategy.validate({
        id: 7,
        tipo: 'docente',
        nombre: 'Nombre anterior',
        correo: 'anterior@example.test',
      }),
    ).resolves.toEqual({
      id: 7,
      nombre: 'Nombre vigente',
      correo: 'vigente@example.test',
      tipo: 'docente',
    });
    expect(docenteRepository.findOneBy).toHaveBeenCalledWith({
      docente_id: 7,
      activo: true,
    });
  });

  it('rejects a removed or disabled docente', async () => {
    docenteRepository.findOneBy.mockResolvedValue(null);

    await expect(
      strategy.validate({ id: 7, tipo: 'docente' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses the current estudiante record', async () => {
    estudianteRepository.findOneBy.mockResolvedValue({
      estudiante_id: 9,
      nombre_completo: 'Estudiante vigente',
      correo_institucional: 'alumno@example.test',
      activo: true,
    });

    await expect(
      strategy.validate({ id: 9, tipo: 'estudiante' }),
    ).resolves.toEqual({
      id: 9,
      nombre: 'Estudiante vigente',
      correo: 'alumno@example.test',
      tipo: 'estudiante',
    });
  });

  it('rejects a removed or disabled estudiante', async () => {
    estudianteRepository.findOneBy.mockResolvedValue(null);

    await expect(
      strategy.validate({ id: 9, tipo: 'estudiante' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects malformed or unsupported token claims', async () => {
    await expect(
      strategy.validate({ id: 7, tipo: 'administrador' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(docenteRepository.findOneBy).not.toHaveBeenCalled();
    expect(estudianteRepository.findOneBy).not.toHaveBeenCalled();
  });
});
