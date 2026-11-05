import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { CrearMaterialDto } from './dto/crear-material.dto';
import type { ArchivoSubido } from './materialacademico.types';

/**
 * Se sustituye el servicio real antes de importar el controlador para evitar
 * cargar entidades de TypeORM y multer en esta prueba.
 */
let MaterialAcademicoController: typeof import('./materialacademico.controller').MaterialAcademicoController;
let JwtAuthGuard: typeof import('../auth/guards/jwt-auth.guard').JwtAuthGuard;
let DocenteGuard: typeof import('../auth/guards/docente.guard').DocenteGuard;

beforeAll(async () => {
  jest.unstable_mockModule('./materialacademico.service', () => ({
    MaterialAcademicoService: class MaterialAcademicoService {},
  }));

  ({ MaterialAcademicoController } =
    await import('./materialacademico.controller'));
  ({ JwtAuthGuard } = await import('../auth/guards/jwt-auth.guard'));
  ({ DocenteGuard } = await import('../auth/guards/docente.guard'));
});

function contexto(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function requestDocente(id = 7): Request {
  return { user: { id, tipo: 'docente' } } as unknown as Request;
}

const DTO: CrearMaterialDto = { titulo: 'Apunte', materia_id: 1 };

const ARCHIVO = {
  originalname: 'apunte.pdf',
  mimetype: 'application/pdf',
  size: 100,
  buffer: Buffer.from('%PDF-1.4'),
} as ArchivoSubido;

describe('MaterialAcademicoController', () => {
  function montarControlador() {
    const servicio = {
      crear: jest.fn().mockResolvedValue({ material_id: 10 }),
      listar: jest.fn().mockResolvedValue([]),
      obtener: jest.fn().mockResolvedValue({ material_id: 10 }),
      estadoExtraccion: jest.fn().mockResolvedValue({ material_id: 10 }),
      autorizar: jest.fn().mockResolvedValue({ material_id: 10 }),
      eliminar: jest.fn().mockResolvedValue(undefined),
    };

    const controlador = new MaterialAcademicoController(
      servicio as unknown as import('./materialacademico.service').MaterialAcademicoService,
    );

    return { controlador, servicio };
  }

  it('exige autenticación y rol de docente en todo el controlador', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      MaterialAcademicoController,
    ) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, DocenteGuard]);
  });

  it('rechaza a un estudiante autenticado con 403', () => {
    const guard = new DocenteGuard();

    expect(() =>
      guard.canActivate(contexto({ id: 3, tipo: 'estudiante' })),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(contexto({ id: 7, tipo: 'docente' }))).toBe(true);
  });

  it('crea el material con el docente del JWT y el archivo recibido', async () => {
    const { controlador, servicio } = montarControlador();

    await controlador.crear(DTO, ARCHIVO, requestDocente(7));

    expect(servicio.crear).toHaveBeenCalledWith(7, DTO, ARCHIVO);
  });

  it('lista solo con el docente del JWT', async () => {
    const { controlador, servicio } = montarControlador();
    const filtros = { materia_id: 2, activo: true };

    await controlador.listar(requestDocente(7), filtros);

    expect(servicio.listar).toHaveBeenCalledWith(7, filtros);
  });

  it('consulta el detalle y el estado de extracción con el docente del JWT', async () => {
    const { controlador, servicio } = montarControlador();

    await controlador.obtener(10, requestDocente(7));
    await controlador.estadoExtraccion(10, requestDocente(7));

    expect(servicio.obtener).toHaveBeenCalledWith(7, 10);
    expect(servicio.estadoExtraccion).toHaveBeenCalledWith(7, 10);
  });

  it('autoriza o revoca con el docente del JWT', async () => {
    const { controlador, servicio } = montarControlador();
    const dto = { autorizado: false };

    await controlador.autorizar(10, dto, requestDocente(7));

    expect(servicio.autorizar).toHaveBeenCalledWith(7, 10, dto);
  });

  it('elimina con el docente del JWT y responde 204', async () => {
    const { controlador, servicio } = montarControlador();

    await controlador.eliminar(10, requestDocente(7));

    expect(servicio.eliminar).toHaveBeenCalledWith(7, 10);
    expect(Reflect.getMetadata('__httpCode__', controlador.eliminar)).toBe(204);
  });

  it('publica la ruta de estado de extracción bajo el material', () => {
    expect(
      Reflect.getMetadata(
        'path',
        MaterialAcademicoController.prototype.estadoExtraccion,
      ),
    ).toBe(':id/extraccion');
  });
});
