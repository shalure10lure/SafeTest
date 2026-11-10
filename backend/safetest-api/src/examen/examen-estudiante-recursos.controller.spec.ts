import { jest } from '@jest/globals';

let ExamenEstudianteRecursosController: typeof import('./examen-estudiante-recursos.controller').ExamenEstudianteRecursosController;

beforeAll(async () => {
  jest.unstable_mockModule('../rendicion/rendicion.service', () => ({
    RendicionService: class RendicionService {},
  }));
  jest.unstable_mockModule('../pregunta/recursos/recursos.service', () => ({
    PreguntaRecursosService: class PreguntaRecursosService {},
  }));

  ({ ExamenEstudianteRecursosController } = await import(
    './examen-estudiante-recursos.controller'
  ));
});

describe('ExamenEstudianteRecursosController', () => {
  it('valida la asignación con la identidad del JWT antes de listar', async () => {
    const orden: string[] = [];
    const rendicion = {
      verificarPreguntaDeRendicionActiva: jest.fn(async () => {
        orden.push('verificar');
      }),
    };
    const recursos = {
      listarParaRendicion: jest.fn(async () => {
        orden.push('listar');
        return [];
      }),
    };
    const controller = new ExamenEstudianteRecursosController(
      rendicion as never,
      recursos as never,
    );

    await controller.listarRecursos(5, 21, {
      user: { id: 9 },
      body: { estudiante_id: 99 },
    } as never);

    expect(rendicion.verificarPreguntaDeRendicionActiva).toHaveBeenCalledWith(
      5,
      9,
      21,
    );
    expect(recursos.listarParaRendicion).toHaveBeenCalledWith(21);
    expect(orden).toEqual(['verificar', 'listar']);
  });

  it('no entrega recursos si la pregunta no es del estudiante', async () => {
    const rendicion = {
      verificarPreguntaDeRendicionActiva: jest
        .fn()
        .mockRejectedValue(new Error('no asignada') as never),
    };
    const recursos = { listarParaRendicion: jest.fn() };
    const controller = new ExamenEstudianteRecursosController(
      rendicion as never,
      recursos as never,
    );

    await expect(
      controller.listarRecursos(5, 77, { user: { id: 9 } } as never),
    ).rejects.toThrow('no asignada');
    expect(recursos.listarParaRendicion).not.toHaveBeenCalled();
  });

  it('entrega la imagen con cabeceras seguras tras validar la asignación', async () => {
    const rendicion = {
      verificarPreguntaDeRendicionActiva: jest.fn(async () => undefined),
    };
    const recursos = {
      obtenerImagenParaRendicion: jest.fn(async () => ({
        contenido: Buffer.from([1, 2, 3]),
        mime: 'image/png',
      })),
    };
    const res = { set: jest.fn() };
    const controller = new ExamenEstudianteRecursosController(
      rendicion as never,
      recursos as never,
    );

    const archivo = await controller.obtenerImagen(
      5,
      21,
      'img1.png',
      { user: { id: 9 } } as never,
      res as never,
    );

    expect(rendicion.verificarPreguntaDeRendicionActiva).toHaveBeenCalledWith(
      5,
      9,
      21,
    );
    expect(recursos.obtenerImagenParaRendicion).toHaveBeenCalledWith(
      21,
      'img1.png',
    );
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'image/png',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
      }),
    );
    expect(archivo).toBeDefined();
  });

  it('registra las rutas con las guardas JWT y de estudiante', () => {
    const guardas = Reflect.getMetadata(
      '__guards__',
      ExamenEstudianteRecursosController,
    ) as { name: string }[];

    expect(guardas.map((guardia) => guardia.name)).toEqual([
      'JwtAuthGuard',
      'EstudianteGuard',
    ]);
    expect(
      Reflect.getMetadata(
        'path',
        ExamenEstudianteRecursosController.prototype.listarRecursos,
      ),
    ).toBe(':id/estudiante/rendicion/preguntas/:preguntaId/recursos');
    expect(
      Reflect.getMetadata(
        'path',
        ExamenEstudianteRecursosController.prototype.obtenerImagen,
      ),
    ).toBe(
      ':id/estudiante/rendicion/preguntas/:preguntaId/recursos/:recurso/archivo',
    );
  });
});
