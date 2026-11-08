import { jest } from '@jest/globals';

/**
 * La identidad del estudiante debe venir del JWT validado, nunca de un
 * parámetro de la solicitud. Así no existe un `estudiante_id` manipulable para
 * consultar respuestas ajenas.
 */
let ExamenEstudianteController: typeof import('./examen-estudiante.controller').ExamenEstudianteController;

beforeAll(async () => {
  jest.unstable_mockModule('./examen-acceso.service', () => ({
    ExamenAccesoService: class ExamenAccesoService {},
  }));

  ({ ExamenEstudianteController } = await import(
    './examen-estudiante.controller'
  ));
});

describe('ExamenEstudianteController', () => {
  it('usa el estudiante autenticado del JWT para consultar la evaluación', async () => {
    const acceso = {
      obtenerVistaEstudiante: jest.fn().mockResolvedValue({ examen_id: 5 }),
      obtenerInstruccionesEstudiante: jest
        .fn()
        .mockResolvedValue({ examen_id: 5 }),
      listarEvaluacionesAsignadas: jest.fn().mockResolvedValue([]),
    };
    const controller = new ExamenEstudianteController(acceso as never);

    await controller.obtener(5, { user: { id: 9 } });

    expect(acceso.obtenerVistaEstudiante).toHaveBeenCalledWith(5, 9);
    expect(acceso.obtenerVistaEstudiante).toHaveBeenCalledTimes(1);
  });

  it('obtiene instrucciones usando únicamente la identidad del JWT', async () => {
    const acceso = {
      obtenerInstruccionesEstudiante: jest
        .fn()
        .mockResolvedValue({ examen_id: 5 }),
    };
    const controller = new ExamenEstudianteController(acceso as never);

    await controller.obtenerInstrucciones(5, {
      user: { id: 9 },
      body: { estudiante_id: 99 },
      query: { estudiante_id: 99 },
    } as never);

    expect(acceso.obtenerInstruccionesEstudiante).toHaveBeenCalledWith(5, 9);
    expect(acceso.obtenerInstruccionesEstudiante).toHaveBeenCalledTimes(1);
  });

  it('no acepta un identificador de estudiante distinto al autenticado', async () => {
    const acceso = {
      obtenerVistaEstudiante: jest.fn().mockResolvedValue({ examen_id: 5 }),
    };
    const controller = new ExamenEstudianteController(acceso as never);

    // Aunque la solicitud incluya otros datos, el controlador solo usa
    // `request.user.id` para identificar al estudiante.
    await controller.obtener(5, {
      user: { id: 9 },
      body: { estudiante_id: 99 },
      query: { estudiante_id: 99 },
    } as never);

    expect(acceso.obtenerVistaEstudiante).toHaveBeenCalledWith(5, 9);
  });

  it('lista evaluaciones usando únicamente la identidad del JWT', async () => {
    const acceso = {
      obtenerVistaEstudiante: jest.fn(),
      listarEvaluacionesAsignadas: jest
        .fn()
        .mockResolvedValue([{ examen_id: 5 }]),
    };
    const controller = new ExamenEstudianteController(acceso as never);

    await controller.listarEvaluaciones({
      user: { id: 9 },
      body: { estudiante_id: 99 },
      query: { estudiante_id: 99 },
      params: { estudiante_id: 99 },
    } as never);

    expect(acceso.listarEvaluacionesAsignadas).toHaveBeenCalledWith(9);
    expect(acceso.listarEvaluacionesAsignadas).toHaveBeenCalledTimes(1);
  });

  it('registra la ruta GET con las guardas JWT y de estudiante', () => {
    const handler = ExamenEstudianteController.prototype.listarEvaluaciones;
    const guardas = Reflect.getMetadata(
      '__guards__',
      ExamenEstudianteController,
    ) as { name: string }[];

    expect(Reflect.getMetadata('path', handler)).toBe(
      'estudiante/evaluaciones',
    );
    expect(guardas.map((guardia) => guardia.name)).toEqual([
      'JwtAuthGuard',
      'EstudianteGuard',
    ]);
  });

  it('registra la ruta protegida de instrucciones', () => {
    const handler =
      ExamenEstudianteController.prototype.obtenerInstrucciones;

    expect(Reflect.getMetadata('path', handler)).toBe(
      ':id/estudiante/instrucciones',
    );
    const guardas = Reflect.getMetadata(
      '__guards__',
      ExamenEstudianteController,
    ) as { name: string }[];

    expect(guardas.map((guardia) => guardia.name)).toEqual([
      'JwtAuthGuard',
      'EstudianteGuard',
    ]);
  });
});
