import 'reflect-metadata';

import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

/**
 * Las entidades reales forman ciclos bajo ESM. El servicio solo las usa como
 * tokens de TypeORM y para tipar, así que se sustituyen por clases vacías.
 */
class Pregunta {}
class Tema {}
class Materia {}
class ExamenPregunta {}
class Inciso {}
class Opcion {}
class SolucionInciso {}
class SolucionOpcion {}
class SolucionTexto {}
class ExamenPoolSnapshotPregunta {}

let PreguntaService: typeof import('./pregunta.service').PreguntaService;
let PreguntaCongeladaService: typeof import('./pregunta-congelada.service').PreguntaCongeladaService;

beforeAll(async () => {
  jest.unstable_mockModule('./entity/pregunta.entity', () => ({ Pregunta }));
  jest.unstable_mockModule('../tema/entity/tema.entity', () => ({ Tema }));
  jest.unstable_mockModule('../materia/entity/materia.entity', () => ({
    Materia,
  }));
  jest.unstable_mockModule(
    '../examenpregunta/entity/examenpregunta.entity',
    () => ({ ExamenPregunta }),
  );
  jest.unstable_mockModule('../inciso/entity/inciso.entity', () => ({
    Inciso,
  }));
  jest.unstable_mockModule('../opcion/entity/opcion.entity', () => ({
    Opcion,
  }));
  jest.unstable_mockModule(
    '../solucioninciso/entity/solucioninciso.entity',
    () => ({ SolucionInciso }),
  );
  jest.unstable_mockModule(
    '../solucionopcion/entity/solucionopcion.entity',
    () => ({ SolucionOpcion }),
  );
  jest.unstable_mockModule(
    '../soluciontexto/entity/soluciontexto.entity',
    () => ({ SolucionTexto }),
  );
  jest.unstable_mockModule(
    '../examenpoolsnapshot/entity/examen-pool-snapshot-pregunta.entity',
    () => ({ ExamenPoolSnapshotPregunta }),
  );

  ({ PreguntaService } = await import('./pregunta.service'));
  ({ PreguntaCongeladaService } = await import('./pregunta-congelada.service'));
});

interface QueryBuilderMock {
  innerJoin: jest.Mock;
  leftJoin: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  getOne: jest.Mock;
  getCount: jest.Mock;
}

function queryBuilderMock(): QueryBuilderMock {
  const qb = {
    getOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
  } as QueryBuilderMock;

  const encadenables = [
    'innerJoin',
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
    'addOrderBy',
  ] as const;

  for (const metodo of encadenables) {
    qb[metodo] = jest.fn().mockReturnValue(qb);
  }

  return qb;
}

interface RepoMock {
  createQueryBuilder: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  find: jest.Mock;
  count: jest.Mock;
  countBy: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

function repoMock(): RepoMock {
  return {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    countBy: jest.fn().mockResolvedValue(0),
    save: jest.fn(),
    create: jest.fn((datos: unknown) => datos),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };
}

interface ManagerMock {
  getRepository: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  countBy: jest.Mock;
}

const PREGUNTA = {
  pregunta_id: 10,
  enunciado: 'Enunciado original',
  explicacion: null,
  tema_id: 1,
  dificultad: 'facil',
  origen: 'manual',
  activo: true,
};

interface Montaje {
  servicio: PreguntaService;
  dataSource: {
    transaction: jest.Mock;
    getRepository: jest.Mock;
  };
  manager: ManagerMock;
  pregunta: RepoMock;
  tema: RepoMock;
  materia: RepoMock;
  examenPregunta: RepoMock;
  snapshotPregunta: { countBy: jest.Mock };
  qbPregunta: QueryBuilderMock;
  qbExamenPregunta: QueryBuilderMock;
}

function montar(): Montaje {
  const pregunta = repoMock();
  const tema = repoMock();
  const materia = repoMock();
  const examenPregunta = repoMock();
  const inciso = repoMock();
  const opcion = repoMock();
  const solucionInciso = repoMock();
  const solucionOpcion = repoMock();

  const qbPregunta = queryBuilderMock();
  qbPregunta.getOne.mockResolvedValue(PREGUNTA);
  pregunta.createQueryBuilder.mockReturnValue(qbPregunta);
  // Bloqueo `FOR UPDATE` de la fila antes de comprobar la congelación.
  pregunta.findOne.mockResolvedValue(PREGUNTA);

  const qbExamenPregunta = queryBuilderMock();
  examenPregunta.createQueryBuilder.mockReturnValue(qbExamenPregunta);

  const snapshotPregunta = repoMock();

  const repositorios = new Map<unknown, RepoMock>([
    [Pregunta, pregunta],
    [ExamenPregunta, examenPregunta],
    [ExamenPoolSnapshotPregunta, snapshotPregunta],
    [Inciso, inciso],
    [Opcion, opcion],
    [SolucionInciso, solucionInciso],
    [SolucionOpcion, solucionOpcion],
  ]);

  const manager: ManagerMock = {
    getRepository: jest.fn((entidad: unknown) => {
      const repo = repositorios.get(entidad);

      if (!repo) {
        throw new Error('Repositorio no configurado en la prueba.');
      }

      return repo;
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    save: jest.fn(async (entidad: Record<string, unknown>) => {
      if (entidad.enunciado !== undefined) {
        return { ...entidad, pregunta_id: 99 };
      }

      return entidad;
    }),
    create: jest.fn((_entidad: unknown, datos: unknown) => datos),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    countBy: jest.fn().mockResolvedValue(0),
  };

  const dataSource = {
    transaction: jest.fn(
      async (callback: (manager: ManagerMock) => Promise<unknown>) =>
        callback(manager),
    ),
    getRepository: manager.getRepository,
  };

  const congeladaService = new PreguntaCongeladaService(
    snapshotPregunta as unknown as Repository<ExamenPoolSnapshotPregunta>,
  );

  const servicio = new PreguntaService(
    pregunta as unknown as Repository<Pregunta>,
    tema as unknown as Repository<Tema>,
    materia as unknown as Repository<Materia>,
    examenPregunta as unknown as Repository<ExamenPregunta>,
    dataSource as unknown as DataSource,
    congeladaService,
  );

  return {
    servicio,
    dataSource,
    manager,
    pregunta,
    tema,
    materia,
    examenPregunta,
    snapshotPregunta,
    qbPregunta,
    qbExamenPregunta,
  };
}

describe('PreguntaService — protección de preguntas congeladas', () => {
  let montaje: Montaje;

  beforeEach(() => {
    montaje = montar();
  });

  it.each([
    ['contenido e inciso', { enunciado: 'Enunciado nuevo' }],
    ['tema', { tema_id: 2 }],
    [
      'puntaje máximo del inciso',
      { tipo_respuesta: 'numerica', puntaje_max: 5, valor_correcto: 10 },
    ],
    [
      'opciones y soluciones',
      {
        tipo_respuesta: 'opcion_unica',
        opciones: [
          { texto_opcion: 'A', es_correcta: true },
          { texto_opcion: 'B', es_correcta: false },
        ],
      },
    ],
    ['agregar un inciso', { tipo_respuesta: 'numerica', valor_correcto: 10 }],
    ['reemplazar o quitar incisos', { tipo_respuesta: 'desarrollo' }],
  ])('rechaza cambios de %s en una pregunta congelada', async (_caso, dto) => {
    montaje.snapshotPregunta.countBy.mockResolvedValue(1);

    await expect(montaje.servicio.update(10, dto, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );

    // La transacción se abre para adquirir el bloqueo; ninguna escritura llega
    // a ejecutarse.
    expect(montaje.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(montaje.manager.update).not.toHaveBeenCalled();
    expect(montaje.manager.save).not.toHaveBeenCalled();
    // La congelación no depende de que la evaluación siga publicada.
    expect(montaje.examenPregunta.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rechaza eliminar lógicamente una pregunta congelada', async () => {
    montaje.snapshotPregunta.countBy.mockResolvedValue(1);

    await expect(montaje.servicio.remove(10, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(montaje.manager.save).not.toHaveBeenCalled();
    expect(montaje.pregunta.save).not.toHaveBeenCalled();
  });

  it('rechaza editar recursos de una pregunta congelada', async () => {
    montaje.snapshotPregunta.countBy.mockResolvedValue(1);

    await expect(
      montaje.servicio.obtenerEditable(10, 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('bloquea también preguntas congeladas creadas por IA', async () => {
    montaje.qbPregunta.getOne.mockResolvedValue({
      ...PREGUNTA,
      origen: 'ia',
    });
    montaje.snapshotPregunta.countBy.mockResolvedValue(1);

    await expect(
      montaje.servicio.update(10, { enunciado: 'Cambio' }, 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('permite editar una pregunta que no está en ninguna instantánea', async () => {
    montaje.snapshotPregunta.countBy.mockResolvedValue(0);
    montaje.qbExamenPregunta.getCount.mockResolvedValue(0);

    await montaje.servicio.update(10, { enunciado: 'Enunciado nuevo' }, 1);

    expect(montaje.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(montaje.manager.update).toHaveBeenCalledWith(
      Pregunta,
      { pregunta_id: 10 },
      { tema_id: 1, enunciado: 'Enunciado nuevo' },
    );
  });

  it('permite crear preguntas nuevas', async () => {
    montaje.manager.findOne.mockResolvedValue({
      materia_id: 1,
      docente_id: 1,
      activo: true,
    });
    montaje.manager.findOneBy.mockResolvedValue({
      tema_id: 1,
      materia_id: 1,
    });

    const resultado = await montaje.servicio.create(
      {
        enunciado: 'Pregunta nueva',
        materia_id: 1,
        tema_id: 1,
        tipo_respuesta: 'opcion_unica',
        puntaje_max: 2,
        opciones: [
          { texto_opcion: 'A', es_correcta: true },
          { texto_opcion: 'B', es_correcta: false },
        ],
      },
      1,
    );

    expect(resultado.pregunta_id).toBe(99);
    expect(montaje.snapshotPregunta.countBy).not.toHaveBeenCalled();
    expect(montaje.manager.save).toHaveBeenCalled();
  });

  it('no consulta el estado de la evaluación ni las rendiciones', async () => {
    montaje.snapshotPregunta.countBy.mockResolvedValue(1);

    await expect(montaje.servicio.remove(10, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(montaje.snapshotPregunta.countBy).toHaveBeenCalledWith({
      pregunta_id: 10,
    });
    expect(montaje.qbExamenPregunta.getCount).not.toHaveBeenCalled();
  });

  /**
   * Pruebas estructurales del orden bloqueo → comprobación. No reproducen una
   * carrera real: eso requiere dos conexiones a PostgreSQL (ver limitaciones
   * en el informe de T3.4.2).
   */
  it('bloquea la fila de Pregunta antes de consultar la instantánea', async () => {
    montaje.snapshotPregunta.countBy.mockResolvedValue(1);

    await expect(
      montaje.servicio.update(10, { enunciado: 'Cambio' }, 1),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(montaje.pregunta.findOne).toHaveBeenCalledWith({
      where: { pregunta_id: 10 },
      lock: { mode: 'pessimistic_write' },
    });

    const ordenBloqueo = montaje.pregunta.findOne.mock.invocationCallOrder[0];
    const ordenComprobacion =
      montaje.snapshotPregunta.countBy.mock.invocationCallOrder[0];

    expect(ordenBloqueo).toBeLessThan(ordenComprobacion);
  });

  it('la eliminación lógica también adquiere el bloqueo y escribe en la transacción', async () => {
    montaje.snapshotPregunta.countBy.mockResolvedValue(0);
    montaje.qbExamenPregunta.getCount.mockResolvedValue(0);

    await montaje.servicio.remove(10, 1);

    expect(montaje.pregunta.findOne).toHaveBeenCalledWith({
      where: { pregunta_id: 10 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(montaje.manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ pregunta_id: 10, activo: false }),
    );
  });

  it('ejecutarEdicion no ejecuta la operación si la pregunta está congelada', async () => {
    montaje.snapshotPregunta.countBy.mockResolvedValue(1);
    const operacion = jest.fn().mockResolvedValue('no debería ejecutarse');

    await expect(
      montaje.servicio.ejecutarEdicion(10, 1, operacion),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(operacion).not.toHaveBeenCalled();
  });

  it('ejecutarEdicion entrega el manager de la transacción cuando la pregunta es editable', async () => {
    montaje.snapshotPregunta.countBy.mockResolvedValue(0);
    montaje.qbExamenPregunta.getCount.mockResolvedValue(0);
    const operacion = jest.fn().mockResolvedValue('ok');

    await expect(
      montaje.servicio.ejecutarEdicion(10, 1, operacion),
    ).resolves.toBe('ok');

    expect(operacion).toHaveBeenCalledWith(
      montaje.manager,
      expect.objectContaining({ pregunta_id: 10 }),
    );
  });
});
