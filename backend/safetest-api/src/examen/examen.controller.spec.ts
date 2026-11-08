import { jest } from '@jest/globals';

/**
 * Los endpoints de respuestas del docente deben usar el docente autenticado,
 * no un identificador de la solicitud. La pertenencia real de la evaluación se
 * valida además en `ExamenAccesoService`.
 */
let ExamenController: typeof import('./examen.controller').ExamenController;

beforeAll(async () => {
  jest.unstable_mockModule('./examen.service', () => ({
    ExamenService: class ExamenService {},
  }));
  jest.unstable_mockModule('./examen-acceso.service', () => ({
    ExamenAccesoService: class ExamenAccesoService {},
  }));

  ({ ExamenController } = await import('./examen.controller'));
});

describe('ExamenController — respuestas del docente', () => {
  it('consulta las respuestas con el docente autenticado del JWT', async () => {
    const acceso = {
      obtenerRespuestasDocente: jest.fn().mockResolvedValue({ examen_id: 5 }),
    };
    const controller = new ExamenController({} as never, acceso as never);

    await controller.obtenerRespuestas(5, { user: { id: 7 } });

    expect(acceso.obtenerRespuestasDocente).toHaveBeenCalledWith(5, 7);
  });

  it('publica las respuestas con el docente autenticado del JWT', async () => {
    const acceso = {
      publicarRespuestas: jest.fn().mockResolvedValue({
        examen_id: 5,
        ya_publicadas: false,
      }),
    };
    const controller = new ExamenController({} as never, acceso as never);

    await controller.publicarRespuestas(5, { user: { id: 7 } });

    expect(acceso.publicarRespuestas).toHaveBeenCalledWith(5, 7);
  });

  it('no acepta un docente_id manipulado en la solicitud', async () => {
    const acceso = {
      obtenerRespuestasDocente: jest.fn().mockResolvedValue({ examen_id: 5 }),
    };
    const controller = new ExamenController({} as never, acceso as never);

    await controller.obtenerRespuestas(5, {
      user: { id: 7 },
      body: { docente_id: 99 },
      query: { docente_id: 99 },
    } as never);

    expect(acceso.obtenerRespuestasDocente).toHaveBeenCalledWith(5, 7);
  });
});

describe('ExamenController — ámbito del docente autenticado', () => {
  function montarControlador() {
    const servicio = {
      obtenerAsignacion: jest.fn().mockResolvedValue({}),
      guardarAsignacion: jest.fn().mockResolvedValue({}),
      obtenerResumen: jest.fn().mockResolvedValue({}),
      publicar: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };

    return {
      servicio,
      controller: new ExamenController(servicio as never, {} as never),
    };
  }

  const requestManipulada = {
    user: { id: 7 },
    body: { docente_id: 99 },
    query: { docente_id: 99 },
  } as never;

  it('usa el docente del JWT en consulta, asignación, resumen y publicación', async () => {
    const { servicio, controller } = montarControlador();
    const dto = { modo_asignacion: 'paralelos' as const, paralelo_ids: [10] };

    await controller.obtenerAsignacion(5, requestManipulada);
    await controller.guardarAsignacion(5, dto, requestManipulada);
    await controller.obtenerResumen(5, requestManipulada);
    await controller.publicar(5, requestManipulada);
    await controller.findOne(5, requestManipulada);
    await controller.update(5, { titulo: 'Nuevo' }, requestManipulada);

    expect(servicio.obtenerAsignacion).toHaveBeenCalledWith(5, 7);
    expect(servicio.guardarAsignacion).toHaveBeenCalledWith(5, dto, 7);
    expect(servicio.obtenerResumen).toHaveBeenCalledWith(5, 7);
    expect(servicio.publicar).toHaveBeenCalledWith(5, 7);
    expect(servicio.findOne).toHaveBeenCalledWith(5, 7);
    expect(servicio.update).toHaveBeenCalledWith(5, { titulo: 'Nuevo' }, 7);
  });
});
