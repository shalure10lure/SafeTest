import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Request } from 'express';

import type { ActualizarPropuestaIaDto } from './dto/actualizar-propuesta-ia.dto';
import type { CrearGeneracionIaDto } from './dto/crear-generacion-ia.dto';

/**
 * Se sustituye el servicio real antes de importar el controlador: las
 * entidades de TypeORM forman ciclos que no aportan nada a esta prueba.
 */
let IaGeneracionController: typeof import('./iageneracion.controller').IaGeneracionController;
let JwtAuthGuard: typeof import('../auth/guards/jwt-auth.guard').JwtAuthGuard;
let DocenteGuard: typeof import('../auth/guards/docente.guard').DocenteGuard;

beforeAll(async () => {
  jest.unstable_mockModule('./iageneracion.service', () => ({
    IaGeneracionService: class IaGeneracionService {},
  }));

  ({ IaGeneracionController } = await import('./iageneracion.controller'));
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

const DTO: CrearGeneracionIaDto = {
  materia_id: 1,
  tema_id: 2,
  tipo_respuesta: 'opcion_unica',
  cantidad: 2,
  dificultad: 'media',
  material_ids: [5],
};

describe('IaGeneracionController', () => {
  function montarControlador() {
    const servicio = {
      crear: jest.fn().mockResolvedValue({
        generacion_id: 9,
        estado: 'pendiente',
      }),
      listar: jest.fn().mockResolvedValue([]),
      obtener: jest.fn().mockResolvedValue({ generacion_id: 9 }),
      actualizarPropuesta: jest.fn().mockResolvedValue({
        propuesta_id: 3,
        estado: 'pendiente',
      }),
      aceptarPropuesta: jest.fn().mockResolvedValue({
        propuesta_id: 3,
        estado: 'aceptada',
      }),
      descartarPropuesta: jest.fn().mockResolvedValue({
        propuesta_id: 3,
        estado: 'descartada',
      }),
      insertarPropuesta: jest.fn().mockResolvedValue({
        propuesta_id: 3,
        pregunta_id: 18,
        estado: 'aceptada',
        insertada: true,
        ya_estaba_insertada: false,
      }),
    };

    const controlador = new IaGeneracionController(
      servicio as unknown as import('./iageneracion.service').IaGeneracionService,
    );

    return { controlador, servicio };
  }

  it('exige autenticación y rol de docente en todo el controlador', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      IaGeneracionController,
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

  it('crea la generación con el docente del JWT y responde 202', async () => {
    const { controlador, servicio } = montarControlador();

    await expect(controlador.crear(DTO, requestDocente(7))).resolves.toEqual({
      generacion_id: 9,
      estado: 'pendiente',
    });

    expect(servicio.crear).toHaveBeenCalledWith(7, DTO);
    expect(Reflect.getMetadata('__httpCode__', controlador.crear)).toBe(202);
  });

  it('lista solo con el docente del JWT, sin aceptar docente_id del cliente', async () => {
    const { controlador, servicio } = montarControlador();
    const filtros = { estado: 'completada' as const };

    await controlador.listar(requestDocente(7), filtros);

    expect(servicio.listar).toHaveBeenCalledWith(7, filtros);
    expect(servicio.listar).toHaveBeenCalledTimes(1);
  });

  it('consulta una generación con el docente del JWT', async () => {
    const { controlador, servicio } = montarControlador();

    await controlador.obtener(9, requestDocente(7));

    expect(servicio.obtener).toHaveBeenCalledWith(7, 9);
  });

  it('edita una propuesta usando el docente del JWT', async () => {
    const { controlador, servicio } = montarControlador();
    const dto: ActualizarPropuestaIaDto = {
      enunciado: 'Pregunta editada',
      dificultad: 'media',
      puntaje_max: 2,
    };

    await controlador.actualizarPropuesta(9, 3, dto, requestDocente(7));

    expect(servicio.actualizarPropuesta).toHaveBeenCalledWith(7, 9, 3, dto);
  });

  it('acepta una propuesta y responde 200', async () => {
    const { controlador, servicio } = montarControlador();

    await controlador.aceptarPropuesta(9, 3, requestDocente(7));

    expect(servicio.aceptarPropuesta).toHaveBeenCalledWith(7, 9, 3);
    expect(
      Reflect.getMetadata('__httpCode__', controlador.aceptarPropuesta),
    ).toBe(200);
  });

  it('descarta una propuesta y responde 200', async () => {
    const { controlador, servicio } = montarControlador();

    await controlador.descartarPropuesta(9, 3, requestDocente(7));

    expect(servicio.descartarPropuesta).toHaveBeenCalledWith(7, 9, 3);
    expect(
      Reflect.getMetadata('__httpCode__', controlador.descartarPropuesta),
    ).toBe(200);
  });

  it('inserta una propuesta con el docente del JWT y responde 200', async () => {
    const { controlador, servicio } = montarControlador();

    await expect(
      controlador.insertarPropuesta(9, 3, requestDocente(7)),
    ).resolves.toMatchObject({
      propuesta_id: 3,
      pregunta_id: 18,
      insertada: true,
    });

    expect(servicio.insertarPropuesta).toHaveBeenCalledWith(7, 9, 3);
    expect(
      Reflect.getMetadata('__httpCode__', controlador.insertarPropuesta),
    ).toBe(200);
  });
});
