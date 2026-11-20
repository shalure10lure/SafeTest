import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

class AsignacionPregunta {}
class ExamenPoolSnapshotPregunta {}
class ExamenPregunta {}
class FormulaElegida {}
class Inciso {}
class OpcionMarcada {}
class Rendicion {}
class RespuestaInciso {}
class RespuestaModelo {}
class Examen {}

let RevisionCalificacionesService: typeof import('./revision-calificaciones.service').RevisionCalificacionesService;

beforeAll(async () => {
  jest.unstable_mockModule(
    '../asignacionpregunta/entity/asignacionpregunta.entity',
    () => ({
      AsignacionPregunta,
    }),
  );
  jest.unstable_mockModule(
    '../examenpoolsnapshot/entity/examen-pool-snapshot-pregunta.entity',
    () => ({ ExamenPoolSnapshotPregunta }),
  );
  jest.unstable_mockModule(
    '../examenpregunta/entity/examenpregunta.entity',
    () => ({
      ExamenPregunta,
    }),
  );
  jest.unstable_mockModule(
    '../formulaelegida/entity/formulaelegida.entity',
    () => ({
      FormulaElegida,
    }),
  );
  jest.unstable_mockModule('../inciso/entity/inciso.entity', () => ({
    Inciso,
  }));
  jest.unstable_mockModule(
    '../opcionmarcada/entity/opcionmarcada.entity',
    () => ({
      OpcionMarcada,
    }),
  );
  jest.unstable_mockModule('../rendicion/entity/rendicion.entity', () => ({
    Rendicion,
  }));
  jest.unstable_mockModule(
    '../respuestainciso/entity/respuestainciso.entity',
    () => ({
      RespuestaInciso,
    }),
  );
  jest.unstable_mockModule(
    '../respuestamodelo/entity/respuestamodelo.entity',
    () => ({
      RespuestaModelo,
    }),
  );
  jest.unstable_mockModule('./entity/examen.entity', () => ({ Examen }));

  ({ RevisionCalificacionesService } =
    await import('./revision-calificaciones.service'));
});

type MockAsync = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
type MockSync = jest.Mock<(...args: unknown[]) => unknown>;

interface RepositorioMock {
  find: MockAsync;
  findOne: MockAsync;
  create: MockSync;
  save: MockAsync;
  update: MockAsync;
  createQueryBuilder: MockSync;
}

function crearRepositorio(): RepositorioMock {
  const crear = jest
    .fn<(...args: unknown[]) => unknown>()
    .mockImplementation((datos) => ({
      ...(datos as Record<string, unknown>),
    }));
  const guardar = jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockImplementation(async (entidad) => entidad);

  return {
    find: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue([]),
    findOne: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(null),
    create: crear,
    save: guardar,
    update: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn<(...args: unknown[]) => unknown>(),
  };
}

function montarServicio() {
  const examen = {
    examen_id: 10,
    docente_id: 20,
    estado: 'publicado',
    calificaciones_revisadas_en: null,
    resultados_publicados_en: null,
  };
  const rendicion = {
    examen_id: 10,
    estudiante_id: 30,
    estado: 'enviada',
    nota_final: null,
  };
  const respuesta = {
    examen_id: 10,
    estudiante_id: 30,
    pregunta_id: 40,
    letra: 'a',
    respuesta_texto: 'Respuesta del estudiante',
    estado_correccion: 'automatica',
    puntaje_obtenido: '1.00',
    retroalimentacion: 'Comentario previo',
    ia_estado: 'pendiente',
    ia_puntaje_sugerido: '3.50',
    ia_valoracion: 'valoración IA',
    ia_explicacion: 'explicación IA',
    ia_errores: [{ tipo: 'conceptual' }],
    ia_confianza: '0.85',
    ia_generado_en: new Date('2026-01-01T00:00:00.000Z'),
  };
  const inciso = { pregunta_id: 40, letra: 'a', puntaje_max: '5.00' };
  const asignacion = { examen_id: 10, estudiante_id: 30, pregunta_id: 40 };
  const repositorios = new Map<unknown, RepositorioMock>();
  const repositorioExamen = crearRepositorio();
  const query = {
    where: jest.fn<(...args: unknown[]) => unknown>(),
    andWhere: jest.fn<(...args: unknown[]) => unknown>(),
    setLock: jest.fn<(...args: unknown[]) => unknown>(),
    getOne: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(examen),
  };
  query.where.mockReturnValue(query);
  query.andWhere.mockReturnValue(query);
  query.setLock.mockReturnValue(query);
  repositorioExamen.createQueryBuilder.mockReturnValue(query);
  repositorioExamen.findOne.mockResolvedValue(examen);
  repositorios.set(Examen, repositorioExamen);

  const repositorioRendicion = crearRepositorio();
  repositorioRendicion.findOne.mockResolvedValue(rendicion);
  repositorios.set(Rendicion, repositorioRendicion);

  const repositorioAsignacion = crearRepositorio();
  repositorioAsignacion.findOne.mockResolvedValue(asignacion);
  repositorioAsignacion.find.mockResolvedValue([asignacion]);
  repositorios.set(AsignacionPregunta, repositorioAsignacion);

  const repositorioInciso = crearRepositorio();
  repositorioInciso.findOne.mockResolvedValue(inciso);
  repositorioInciso.find.mockResolvedValue([inciso]);
  repositorios.set(Inciso, repositorioInciso);

  const repositorioRespuesta = crearRepositorio();
  repositorioRespuesta.findOne.mockResolvedValue(respuesta);
  repositorioRespuesta.find.mockResolvedValue([respuesta]);
  repositorioRespuesta.update.mockImplementation(async (_clave, cambios) =>
    Object.assign(respuesta, cambios as Record<string, unknown>),
  );
  repositorioRespuesta.save.mockImplementation(async (entidad) =>
    Object.assign(respuesta, entidad as Record<string, unknown>),
  );
  repositorios.set(RespuestaInciso, repositorioRespuesta);

  const repositorioPreguntaExamen = crearRepositorio();
  repositorioPreguntaExamen.find.mockResolvedValue([
    { pregunta_id: 40, puntaje: '4.00' },
  ]);
  repositorios.set(ExamenPregunta, repositorioPreguntaExamen);

  const repositorioSnapshot = crearRepositorio();
  repositorios.set(ExamenPoolSnapshotPregunta, repositorioSnapshot);

  repositorioRendicion.save.mockImplementation(async (entidad) =>
    Object.assign(rendicion, entidad as Record<string, unknown>),
  );

  const manager = {
    getRepository: jest.fn((entidad: unknown) => {
      const repositorio = repositorios.get(entidad);
      if (!repositorio)
        throw new Error('Repositorio no configurado en la prueba.');
      return repositorio;
    }),
  } as unknown as EntityManager;
  let commits = 0;
  let rollbacks = 0;
  const transaction =
    jest.fn<
      (
        callback: (manager: EntityManager) => Promise<unknown>,
      ) => Promise<unknown>
    >();
  transaction.mockImplementation(
    async (callback: (manager: EntityManager) => Promise<unknown>) => {
      const respuestaAntes = { ...respuesta };
      const rendicionAntes = { ...rendicion };
      try {
        const resultado = await callback(manager);
        commits += 1;
        return resultado;
      } catch (error) {
        Object.assign(respuesta, respuestaAntes);
        Object.assign(rendicion, rendicionAntes);
        rollbacks += 1;
        throw error;
      }
    },
  );
  const dataSource = { transaction } as unknown as DataSource;
  const servicio = new RevisionCalificacionesService(dataSource);

  return {
    servicio,
    manager,
    transaction,
    commits: () => commits,
    rollbacks: () => rollbacks,
    examen,
    rendicion,
    respuesta,
    repositorios,
    repositorioRendicion,
    repositorioAsignacion,
    repositorioInciso,
    query,
  };
}

const argumentosValoracion = [10, 30, 40, 'a', 20, { puntaje: 2 }] as const;
const argumentosConRetroalimentacion = [
  10,
  30,
  40,
  'a',
  20,
  { puntaje: 2, retroalimentacion: 'Revisión manual' },
] as const;

describe('RevisionCalificacionesService', () => {
  it('valorarInciso conserva la valoración oficial, los bloqueos y el recálculo proporcional', async () => {
    const contexto = montarServicio();

    const resultado = await contexto.servicio.valorarInciso(
      ...argumentosConRetroalimentacion,
    );

    expect(contexto.transaction).toHaveBeenCalledTimes(1);
    expect(contexto.query.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(
      contexto.repositorios.get(RespuestaInciso)?.update,
    ).toHaveBeenCalledWith(
      { examen_id: 10, estudiante_id: 30, pregunta_id: 40, letra: 'a' },
      {
        estado_correccion: 'revisada',
        puntaje_obtenido: '2.00',
        retroalimentacion: 'Revisión manual',
      },
    );
    expect(
      contexto.repositorios.get(RespuestaInciso)?.save,
    ).not.toHaveBeenCalled();
    expect(contexto.rendicion).toMatchObject({
      estado: 'corregida',
      nota_final: '1.60',
    });
    expect(contexto.repositorios.get(Rendicion)?.save).toHaveBeenCalledWith(
      contexto.rendicion,
    );
    expect(resultado).toEqual({
      examen_id: 10,
      estudiante_id: 30,
      pregunta_id: 40,
      letra: 'a',
      estado_correccion: 'revisada',
      puntaje_obtenido: '2.00',
      nota_final: '1.60',
      estado_rendicion: 'corregida',
      pendientes_revision: 0,
    });
  });

  it('aplicarValoracionOficial usa el manager recibido sin iniciar otra transacción y conserva ia_*', async () => {
    const contexto = montarServicio();

    await contexto.servicio.aplicarValoracionOficial(
      contexto.manager,
      ...argumentosValoracion,
    );

    expect(contexto.transaction).not.toHaveBeenCalled();
    expect(contexto.manager.getRepository).toHaveBeenCalled();
    expect(
      contexto.repositorios.get(RespuestaInciso)?.update,
    ).toHaveBeenCalledWith(
      expect.any(Object),
      expect.not.objectContaining({
        ia_estado: expect.anything(),
        ia_puntaje_sugerido: expect.anything(),
        ia_valoracion: expect.anything(),
        ia_explicacion: expect.anything(),
        ia_errores: expect.anything(),
        ia_confianza: expect.anything(),
        ia_generado_en: expect.anything(),
      }),
    );
    expect(contexto.respuesta).toMatchObject({
      ia_estado: 'pendiente',
      ia_puntaje_sugerido: '3.50',
      ia_valoracion: 'valoración IA',
      ia_explicacion: 'explicación IA',
      ia_errores: [{ tipo: 'conceptual' }],
      ia_confianza: '0.85',
      retroalimentacion: 'Comentario previo',
    });
  });

  it('propaga errores del recálculo para que la transacción haga rollback', async () => {
    const contexto = montarServicio();
    contexto.repositorioRendicion.save.mockImplementation(async (entidad) => {
      Object.assign(contexto.rendicion, entidad as Record<string, unknown>);
      throw new ConflictException('Falla simulada al persistir la nota.');
    });

    await expect(
      contexto.servicio.valorarInciso(...argumentosValoracion),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(
      contexto.repositorios.get(RespuestaInciso)?.update,
    ).toHaveBeenCalled();
    expect(contexto.commits()).toBe(0);
    expect(contexto.rollbacks()).toBe(1);
    expect(contexto.respuesta).toMatchObject({
      estado_correccion: 'automatica',
      puntaje_obtenido: '1.00',
    });
    expect(contexto.rendicion).toMatchObject({
      estado: 'enviada',
      nota_final: null,
    });
  });

  it('rechaza una entrada inválida antes de abrir la transacción', async () => {
    const contexto = montarServicio();

    await expect(
      contexto.servicio.valorarInciso(10, 30, 40, 'a', 20, { puntaje: 1.001 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(contexto.transaction).not.toHaveBeenCalled();
    await expect(
      contexto.servicio.aplicarValoracionOficial(
        contexto.manager,
        10,
        30,
        40,
        'a',
        20,
        { puntaje: 1.001 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(contexto.manager.getRepository).not.toHaveBeenCalled();
  });

  it('valida una sola vez cada entrada pública', async () => {
    const contexto = montarServicio();
    let lecturas = 0;
    const datos = {
      get puntaje() {
        lecturas += 1;
        return 2;
      },
    };

    await contexto.servicio.valorarInciso(10, 30, 40, 'a', 20, datos);
    expect(lecturas).toBe(1);

    lecturas = 0;
    await contexto.servicio.aplicarValoracionOficial(
      contexto.manager,
      10,
      30,
      40,
      'a',
      20,
      datos,
    );
    expect(lecturas).toBe(1);
  });

  it('rechaza un examen que no pertenece al docente', async () => {
    const contexto = montarServicio();
    contexto.query.getOne.mockResolvedValue(null);

    await expect(
      contexto.servicio.valorarInciso(...argumentosValoracion),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(contexto.query.andWhere).toHaveBeenCalledWith(
      'examen.docente_id = :docenteId',
      { docenteId: 20 },
    );
  });

  it('rechaza exámenes no publicados, confirmados o con resultados publicados', async () => {
    const noPublicado = montarServicio();
    Object.assign(noPublicado.examen, { estado: 'borrador' });
    await expect(
      noPublicado.servicio.valorarInciso(...argumentosValoracion),
    ).rejects.toBeInstanceOf(BadRequestException);

    for (const campo of [
      'calificaciones_revisadas_en',
      'resultados_publicados_en',
    ] as const) {
      const contexto = montarServicio();
      Object.assign(contexto.examen, { [campo]: new Date() });

      await expect(
        contexto.servicio.valorarInciso(...argumentosValoracion),
      ).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('rechaza rendiciones que no están enviadas ni corregidas', async () => {
    const contexto = montarServicio();
    Object.assign(contexto.rendicion, { estado: 'en_curso' });

    await expect(
      contexto.servicio.valorarInciso(...argumentosValoracion),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(contexto.repositorioAsignacion.findOne).not.toHaveBeenCalled();
  });

  it('rechaza una pregunta no asignada y un inciso inexistente', async () => {
    const sinAsignacion = montarServicio();
    sinAsignacion.repositorioAsignacion.findOne.mockResolvedValue(null);
    await expect(
      sinAsignacion.servicio.valorarInciso(...argumentosValoracion),
    ).rejects.toBeInstanceOf(NotFoundException);

    const sinInciso = montarServicio();
    sinInciso.repositorioInciso.findOne.mockResolvedValue(null);
    await expect(
      sinInciso.servicio.valorarInciso(...argumentosValoracion),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza puntajes superiores al máximo del inciso', async () => {
    const contexto = montarServicio();

    await expect(
      contexto.servicio.valorarInciso(10, 30, 40, 'a', 20, { puntaje: 5.01 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(
      contexto.repositorios.get(RespuestaInciso)?.update,
    ).not.toHaveBeenCalled();
  });

  it('crea la respuesta oficial cuando todavía no existe una fila', async () => {
    const contexto = montarServicio();
    contexto.repositorios.get(RespuestaInciso)?.findOne.mockResolvedValue(null);

    await contexto.servicio.aplicarValoracionOficial(
      contexto.manager,
      ...argumentosValoracion,
    );

    expect(
      contexto.repositorios.get(RespuestaInciso)?.save,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        estado_correccion: 'manual',
        puntaje_obtenido: '2.00',
        respuesta_texto: null,
      }),
    );
    expect(
      contexto.repositorios.get(RespuestaInciso)?.update,
    ).not.toHaveBeenCalled();
  });
});
