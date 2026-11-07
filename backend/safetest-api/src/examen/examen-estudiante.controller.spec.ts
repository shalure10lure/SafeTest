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
    };
    const controller = new ExamenEstudianteController(acceso as never);

    await controller.obtener(5, { user: { id: 9 } });

    expect(acceso.obtenerVistaEstudiante).toHaveBeenCalledWith(5, 9);
    expect(acceso.obtenerVistaEstudiante).toHaveBeenCalledTimes(1);
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
});
