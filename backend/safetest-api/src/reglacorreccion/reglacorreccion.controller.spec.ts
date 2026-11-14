import 'reflect-metadata';

import {
  BadRequestException,
  ForbiddenException,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { of } from 'rxjs';
import type { Request } from 'express';

import type { CrearReglaCorreccionDto } from './dto/crear-regla-correccion.dto';
import type { ReglaCorreccionService } from './reglacorreccion.service';

/**
 * El servicio se sustituye antes de importar el controlador para no arrastrar
 * las entidades de TypeORM ni sus ciclos a esta prueba.
 */
let ReglaCorreccionController: typeof import('./reglacorreccion.controller').ReglaCorreccionController;
let CamposPermitidosInterceptor: typeof import('./campos-permitidos.interceptor').CamposPermitidosInterceptor;
let JwtAuthGuard: typeof import('../auth/guards/jwt-auth.guard').JwtAuthGuard;
let DocenteGuard: typeof import('../auth/guards/docente.guard').DocenteGuard;

beforeAll(async () => {
  jest.unstable_mockModule('./reglacorreccion.service', () => ({
    ReglaCorreccionService: class ReglaCorreccionService {},
  }));

  ({ ReglaCorreccionController } =
    await import('./reglacorreccion.controller'));
  ({ CamposPermitidosInterceptor } =
    await import('./campos-permitidos.interceptor'));
  ({ JwtAuthGuard } = await import('../auth/guards/jwt-auth.guard'));
  ({ DocenteGuard } = await import('../auth/guards/docente.guard'));
});

const CAMPOS_REGLA = ['tipo_respuesta', 'parametros', 'activo'];

function requestDocente(id = 7): Request {
  return { user: { id, tipo: 'docente' } } as unknown as Request;
}

function contextoConCuerpo(body: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ body }),
    }),
  } as unknown as ExecutionContext;
}

function contextoConUsuario(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function montar() {
  const servicio = {
    crear: jest.fn().mockResolvedValue({ regla_id: 1 }),
    listar: jest.fn().mockResolvedValue([]),
    obtener: jest.fn().mockResolvedValue({ regla_id: 1 }),
    actualizar: jest.fn().mockResolvedValue({ regla_id: 1 }),
  };

  const controlador = new ReglaCorreccionController(
    servicio as unknown as ReglaCorreccionService,
  );

  return { controlador, servicio };
}

describe('ReglaCorreccionController', () => {
  it('exige autenticación y rol docente en todo el controlador', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      ReglaCorreccionController,
    ) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, DocenteGuard]);
    expect(Reflect.getMetadata('path', ReglaCorreccionController)).toBe(
      'reglas-correccion',
    );
  });

  it('rechaza a un estudiante autenticado y permite a un docente', () => {
    const guard = new DocenteGuard();

    expect(() =>
      guard.canActivate(contextoConUsuario({ id: 3, tipo: 'estudiante' })),
    ).toThrow(ForbiddenException);
    expect(
      guard.canActivate(contextoConUsuario({ id: 7, tipo: 'docente' })),
    ).toBe(true);
  });

  it('crea la regla con el docente del JWT', async () => {
    const { controlador, servicio } = montar();
    const dto: CrearReglaCorreccionDto = {
      tipo_respuesta: 'opcion_unica',
      parametros: {},
    };

    await controlador.crear(dto, requestDocente(7));

    expect(servicio.crear).toHaveBeenCalledWith(7, dto);
  });

  it('lista solo las reglas del docente del JWT', async () => {
    const { controlador, servicio } = montar();

    await controlador.listar(requestDocente(9));

    expect(servicio.listar).toHaveBeenCalledWith(9);
    expect(servicio.listar).toHaveBeenCalledTimes(1);
  });

  it('consulta una regla con el docente del JWT', async () => {
    const { controlador, servicio } = montar();

    await controlador.obtener(5, requestDocente(7));

    expect(servicio.obtener).toHaveBeenCalledWith(7, 5);
  });

  it('actualiza una regla con el docente del JWT', async () => {
    const { controlador, servicio } = montar();
    const dto = { activo: false };

    await controlador.actualizar(5, dto, requestDocente(7));

    expect(servicio.actualizar).toHaveBeenCalledWith(7, 5, dto);
  });

  it('aplica el rechazo estricto de propiedades en crear y actualizar', () => {
    const { controlador } = montar();

    for (const metodo of [controlador.crear, controlador.actualizar]) {
      const interceptores = Reflect.getMetadata(
        '__interceptors__',
        metodo,
      ) as unknown[];

      expect(interceptores).toHaveLength(1);
      expect(interceptores[0]).toBeInstanceOf(CamposPermitidosInterceptor);
    }
  });
});

describe('CamposPermitidosInterceptor', () => {
  const siguiente: CallHandler = { handle: () => of('ok') };

  it('rechaza docente_id y cualquier propiedad no declarada', () => {
    const interceptor = new CamposPermitidosInterceptor(CAMPOS_REGLA);

    expect(() =>
      interceptor.intercept(
        contextoConCuerpo({ tipo_respuesta: 'opcion_unica', docente_id: 99 }),
        siguiente,
      ),
    ).toThrow(BadRequestException);

    expect(() =>
      interceptor.intercept(
        contextoConCuerpo({ parametros: {}, creado_en: 'ayer' }),
        siguiente,
      ),
    ).toThrow(BadRequestException);
  });

  it('acepta únicamente las propiedades declaradas', () => {
    const interceptor = new CamposPermitidosInterceptor(CAMPOS_REGLA);

    expect(() =>
      interceptor.intercept(
        contextoConCuerpo({
          tipo_respuesta: 'opcion_unica',
          parametros: {},
          activo: true,
        }),
        siguiente,
      ),
    ).not.toThrow();
  });

  it('no falla cuando no hay cuerpo', () => {
    const interceptor = new CamposPermitidosInterceptor(CAMPOS_REGLA);

    expect(() =>
      interceptor.intercept(contextoConCuerpo(undefined), siguiente),
    ).not.toThrow();
  });
});
