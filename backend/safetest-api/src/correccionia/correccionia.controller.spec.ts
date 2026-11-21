import type { INestApplication } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import {
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { jest } from '@jest/globals';

import { DocenteGuard } from '../auth/guards/docente.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CorreccionIaController } from './correccionia.controller';
import { CorreccionIaPropuestaController } from './correccionia-propuesta.controller';
import { CorreccionIaService } from './correccionia.service';
import { CorreccionIaInputGuard } from './correccionia-input.guard';

const PROPUESTA = {
  propuesta_id: 42,
  examen_id: 1,
  estudiante_id: 2,
  pregunta_id: 3,
  letra: 'A',
  estado: 'generada',
};

function promesaMock<T>(resultado: T) {
  return jest
    .fn<(...argumentos: unknown[]) => Promise<T>>()
    .mockResolvedValue(resultado);
}

const servicio = {
  solicitarPropuesta: promesaMock({
    propuesta_id: 42,
    estado: 'pendiente',
    intento: 1,
  }),
  regenerarPropuesta: promesaMock({
    propuesta_id: 43,
    estado: 'pendiente',
    intento: 2,
  }),
  listarPorExamen: promesaMock({
    total: 1,
    propuestas: [PROPUESTA],
  }),
  listarHistorial: promesaMock([PROPUESTA]),
  obtenerDetalle: promesaMock(PROPUESTA),
  modificarPropuesta: promesaMock({
    ...PROPUESTA,
    estado: 'modificada',
  }),
  descartarPropuesta: promesaMock({
    propuesta_id: 42,
    estado: 'descartada',
  }),
  aceptarPropuesta: promesaMock({
    propuesta: { propuesta_id: 42, estado: 'aceptada' },
    calificacion: { puntaje_obtenido: '3.50' },
  }),
};

const usuarioAutenticado: { id: number; tipo: string } = {
  id: 71,
  tipo: 'docente',
};

const jwtSimulado = {
  canActivate: jest.fn((context: ExecutionContext) => {
    context.switchToHttp().getRequest().user = usuarioAutenticado;
    return true;
  }),
};

async function crearApp(conPipeGlobal = false): Promise<INestApplication> {
  const moduloBuilder = Test.createTestingModule({
    controllers: [CorreccionIaController, CorreccionIaPropuestaController],
    providers: [
      { provide: CorreccionIaService, useValue: servicio },
      DocenteGuard,
      CorreccionIaInputGuard,
    ],
  });
  const modulo = await moduloBuilder
    .overrideGuard(JwtAuthGuard)
    .useValue(jwtSimulado)
    .compile();

  const app = modulo.createNestApplication();
  if (conPipeGlobal) {
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
  }
  await app.init();
  return app;
}

describe('CorreccionIa controllers', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    usuarioAutenticado.id = 71;
    usuarioAutenticado.tipo = 'docente';
  });

  afterAll(async () => {
    await app.close();
  });

  it('solicita y delega con el docente autenticado y HTTP 202', async () => {
    await request(app.getHttpServer())
      .post('/examenes/1/calificaciones/2/respuestas/3/A/ia')
      .send({})
      .expect(202)
      .expect({ propuesta_id: 42, estado: 'pendiente', intento: 1 });

    expect(servicio.solicitarPropuesta).toHaveBeenCalledWith(1, 2, 3, 'A', 71);
  });

  it('regenera y delega con el docente autenticado y HTTP 202', async () => {
    await request(app.getHttpServer())
      .post('/examenes/1/calificaciones/2/respuestas/3/A/ia/regenerar')
      .send({})
      .expect(202)
      .expect({ propuesta_id: 43, estado: 'pendiente', intento: 2 });

    expect(servicio.regenerarPropuesta).toHaveBeenCalledWith(1, 2, 3, 'A', 71);
  });

  it('lista la bandeja del examen con filtros convertidos y docente del token', async () => {
    await request(app.getHttpServer())
      .get('/examenes/1/correcciones-ia')
      .query({
        estado: 'generada',
        estudiante_id: '2',
        pregunta_id: '3',
        solo_pendientes_revision: 'true',
        limite: '5',
        desplazamiento: '0',
      })
      .expect(200)
      .expect({ total: 1, propuestas: [PROPUESTA] });

    expect(servicio.listarPorExamen).toHaveBeenCalledWith(1, 71, {
      estado: 'generada',
      estudiante_id: 2,
      pregunta_id: 3,
      solo_pendientes_revision: true,
      limite: 5,
      desplazamiento: 0,
    });
  });

  it('lista el historial del inciso con filtros y docente del token', async () => {
    await request(app.getHttpServer())
      .get('/examenes/1/calificaciones/2/respuestas/3/A/ia')
      .query({ estado: 'generada', limite: '10' })
      .expect(200)
      .expect([PROPUESTA]);

    expect(servicio.listarHistorial).toHaveBeenCalledWith(1, 2, 3, 'A', 71, {
      estado: 'generada',
      limite: 10,
    });
  });

  it('consulta el detalle con el docente autenticado', async () => {
    await request(app.getHttpServer())
      .get('/correcciones-ia/42')
      .expect(200)
      .expect(PROPUESTA);

    expect(servicio.obtenerDetalle).toHaveBeenCalledWith(42, 71);
  });

  it('modifica solo los campos editables con el docente autenticado', async () => {
    await request(app.getHttpServer())
      .patch('/correcciones-ia/42')
      .send({ puntaje: 3.5 })
      .expect(200)
      .expect({ ...PROPUESTA, estado: 'modificada' });

    expect(servicio.modificarPropuesta).toHaveBeenCalledWith(42, 71, {
      puntaje: 3.5,
    });
  });

  it('descarta con el docente autenticado', async () => {
    await request(app.getHttpServer())
      .post('/correcciones-ia/42/descartar')
      .send({ motivo: 'Revisión manual' })
      .expect(200)
      .expect({ propuesta_id: 42, estado: 'descartada' });

    expect(servicio.descartarPropuesta).toHaveBeenCalledWith(
      42,
      71,
      'Revisión manual',
    );
  });

  it('acepta con el docente autenticado', async () => {
    const entrada = {
      version: 4,
      puntaje_confirmado: '3.50',
      retroalimentacion: 'Revisado',
    };

    await request(app.getHttpServer())
      .post('/correcciones-ia/42/aceptar')
      .send(entrada)
      .expect(200);

    expect(servicio.aceptarPropuesta).toHaveBeenCalledWith(42, 71, entrada);
  });

  it.each([
    [
      'solicitud',
      () =>
        request(app.getHttpServer())
          .post('/examenes/no-es-id/calificaciones/2/respuestas/3/A/ia')
          .send({}),
    ],
    [
      'regeneración',
      () =>
        request(app.getHttpServer())
          .post(
            '/examenes/1/calificaciones/2/respuestas/no-es-id/A/ia/regenerar',
          )
          .send({}),
    ],
    [
      'bandeja',
      () =>
        request(app.getHttpServer())
          .get('/examenes/1/correcciones-ia')
          .query({ limite: '201' }),
    ],
    [
      'historial',
      () =>
        request(app.getHttpServer())
          .get('/examenes/1/calificaciones/2/respuestas/3/A/ia')
          .query({ estado: 'inexistente' }),
    ],
    [
      'detalle',
      () => request(app.getHttpServer()).get('/correcciones-ia/no-es-id'),
    ],
    [
      'modificación',
      () =>
        request(app.getHttpServer())
          .patch('/correcciones-ia/42')
          .send({ puntaje: 1.234 }),
    ],
    [
      'descarte',
      () =>
        request(app.getHttpServer())
          .post('/correcciones-ia/42/descartar')
          .send({ motivo: 'x'.repeat(301) }),
    ],
    [
      'aceptación',
      () =>
        request(app.getHttpServer())
          .post('/correcciones-ia/42/aceptar')
          .send({ puntaje_confirmado: '3.50' }),
    ],
  ])('rechaza entrada inválida de %s con HTTP 400', async (_nombre, enviar) => {
    await enviar().expect(400);

    expect(
      Object.values(servicio).every((metodo) => !metodo.mock.calls.length),
    ).toBe(true);
  });

  it('rechaza campos no definidos, incluido docente_id, sin llamar al servicio', async () => {
    await request(app.getHttpServer())
      .patch('/correcciones-ia/42')
      .send({ puntaje: 3.5, docente_id: 999 })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/correcciones-ia/42')
      .send({
        errores: [
          { tipo: 'omision', descripcion: 'Falta un paso', docente_id: 999 },
        ],
      })
      .expect(400);

    expect(servicio.modificarPropuesta).not.toHaveBeenCalled();
  });

  it('rechaza docente_id en solicitudes sin cuerpo y en filtros de bandeja', async () => {
    await request(app.getHttpServer())
      .post('/examenes/1/calificaciones/2/respuestas/3/A/ia')
      .send({ docente_id: 999 })
      .expect(400);

    await request(app.getHttpServer())
      .get('/examenes/1/correcciones-ia')
      .query({ docente_id: '999' })
      .expect(400);

    expect(servicio.solicitarPropuesta).not.toHaveBeenCalled();
    expect(servicio.listarPorExamen).not.toHaveBeenCalled();
  });

  it('conserva los errores 404 y 409 producidos por el servicio', async () => {
    servicio.obtenerDetalle.mockRejectedValueOnce(
      new NotFoundException({
        codigo: 'PROPUESTA_NO_ENCONTRADA',
        motivo: 'No existe la propuesta.',
      }),
    );
    await request(app.getHttpServer())
      .get('/correcciones-ia/42')
      .expect(404)
      .expect(({ body }) =>
        expect(body.codigo).toBe('PROPUESTA_NO_ENCONTRADA'),
      );

    servicio.descartarPropuesta.mockRejectedValueOnce(
      new ConflictException({
        codigo: 'ESTADO_NO_PERMITE_OPERACION',
        motivo: 'La propuesta ya es terminal.',
      }),
    );
    await request(app.getHttpServer())
      .post('/correcciones-ia/42/descartar')
      .send({})
      .expect(409)
      .expect(({ body }) =>
        expect(body.codigo).toBe('ESTADO_NO_PERMITE_OPERACION'),
      );
  });

  it('rechaza campos extra antes de que el pipe global los elimine', async () => {
    const appConPipeGlobal = await crearApp(true);
    try {
      await request(appConPipeGlobal.getHttpServer())
        .patch('/correcciones-ia/42')
        .send({ puntaje: 3.5, docente_id: 999 })
        .expect(400);

      expect(servicio.modificarPropuesta).not.toHaveBeenCalled();
    } finally {
      await appConPipeGlobal.close();
    }
  });

  it('rechaza un usuario autenticado que no tenga rol docente', async () => {
    usuarioAutenticado.tipo = 'estudiante';

    await request(app.getHttpServer()).get('/correcciones-ia/42').expect(403);

    expect(servicio.obtenerDetalle).not.toHaveBeenCalled();
  });
});
