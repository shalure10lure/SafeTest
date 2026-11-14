import 'reflect-metadata';

import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

/**
 * Las entidades reales forman ciclos bajo ESM. El servicio solo las usa como
 * tokens de TypeORM y para tipar, así que se sustituyen por clases vacías.
 */
class Examen {}
class Estudiante {}
class Materia {}
class Semestre {}
class Paralelo {}
class ParaleloExamen {}
class Inscripcion {}
class ExamenPregunta {}
class ExamenTema {}
class ExamenEstudiante {}
class Pregunta {}
class Tema {}
class Inciso {}
class ExamenPoolSnapshot {}
class ExamenPoolSnapshotTema {}
class ExamenPoolSnapshotPregunta {}
class ExamenPoolSnapshotInciso {}

let ExamenService: typeof import('./examen.service').ExamenService;

beforeAll(async () => {
  jest.unstable_mockModule('./entity/examen.entity', () => ({ Examen }));
  jest.unstable_mockModule('../estudiante/entity/estudiante.entity', () => ({
    Estudiante,
  }));
  jest.unstable_mockModule('../materia/entity/materia.entity', () => ({
    Materia,
  }));
  jest.unstable_mockModule('../semestre/entity/semestre.entity', () => ({
    Semestre,
  }));
  jest.unstable_mockModule('../paralelo/entity/paralelo.entity', () => ({
    Paralelo,
  }));
  jest.unstable_mockModule(
    '../paraleloexamen/entity/paraleloexamen.entity',
    () => ({ ParaleloExamen }),
  );
  jest.unstable_mockModule('../inscripcion/entity/inscripcion.entity', () => ({
    Inscripcion,
  }));
  jest.unstable_mockModule(
    '../examenpregunta/entity/examenpregunta.entity',
    () => ({ ExamenPregunta }),
  );
  jest.unstable_mockModule('../examentema/entity/examentema.entity', () => ({
    ExamenTema,
  }));
  jest.unstable_mockModule(
    '../examenestudiante/entity/examenestudiante.entity',
    () => ({ ExamenEstudiante }),
  );
  jest.unstable_mockModule('../pregunta/entity/pregunta.entity', () => ({
    Pregunta,
  }));
  jest.unstable_mockModule('../tema/entity/tema.entity', () => ({ Tema }));
  jest.unstable_mockModule('../inciso/entity/inciso.entity', () => ({
    Inciso,
  }));
  jest.unstable_mockModule(
    '../examenpoolsnapshot/entity/examen-pool-snapshot.entity',
    () => ({ ExamenPoolSnapshot }),
  );
  jest.unstable_mockModule(
    '../examenpoolsnapshot/entity/examen-pool-snapshot-tema.entity',
    () => ({ ExamenPoolSnapshotTema }),
  );
  jest.unstable_mockModule(
    '../examenpoolsnapshot/entity/examen-pool-snapshot-pregunta.entity',
    () => ({ ExamenPoolSnapshotPregunta }),
  );
  jest.unstable_mockModule(
    '../examenpoolsnapshot/entity/examen-pool-snapshot-inciso.entity',
    () => ({ ExamenPoolSnapshotInciso }),
  );

  ({ ExamenService } = await import('./examen.service'));
});

interface RepoMock {
  find: jest.Mock;
  findOne: jest.Mock;
  count: jest.Mock;
  update: jest.Mock;
  createQueryBuilder: jest.Mock;
}

function repoMock(): RepoMock {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(),
  };
}

interface QueryBuilderMock {
  innerJoin: jest.Mock;
  innerJoinAndSelect: jest.Mock;
  leftJoin: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  groupBy: jest.Mock;
  addGroupBy: jest.Mock;
  setLock: jest.Mock;
  getOne: jest.Mock;
  getMany: jest.Mock;
  getRawOne: jest.Mock;
  getRawMany: jest.Mock;
  getCount: jest.Mock;
  execute: jest.Mock;
}

function queryBuilderMock(): QueryBuilderMock {
  const qb = {
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    execute: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
  } as QueryBuilderMock;

  const encadenables = [
    'innerJoin',
    'innerJoinAndSelect',
    'leftJoin',
    'leftJoinAndSelect',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'groupBy',
    'addGroupBy',
    'setLock',
  ] as const;

  for (const metodo of encadenables) {
    qb[metodo] = jest.fn().mockReturnValue(qb);
  }

  return qb;
}

interface ManagerMock {
  getRepository: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  insert: jest.Mock;
}

interface Montaje {
  servicio: ExamenService;
  dataSource: { transaction: jest.Mock; manager: ManagerMock; getRepository: jest.Mock };
  manager: ManagerMock;
  examen: RepoMock;
  materia: RepoMock;
  semestre: RepoMock;
  paralelo: RepoMock;
  inscripcion: RepoMock;
  pregunta: RepoMock;
  tema: RepoMock;
  examenPregunta: RepoMock;
  examenTema: RepoMock;
  examenEstudiante: RepoMock;
  inciso: RepoMock;
  snapshot: RepoMock;
  snapshotTema: RepoMock;
  snapshotPregunta: RepoMock;
  snapshotInciso: RepoMock;
}

function montar(): Montaje {
  const examen = repoMock();
  const materia = repoMock();
  const semestre = repoMock();
  const paralelo = repoMock();
  const inscripcion = repoMock();
  const pregunta = repoMock();
  const tema = repoMock();
  const examenPregunta = repoMock();
  const examenTema = repoMock();
  const examenEstudiante = repoMock();
  const inciso = repoMock();
  const snapshot = repoMock();
  const snapshotTema = repoMock();
  const snapshotPregunta = repoMock();
  const snapshotInciso = repoMock();

  const repositorios = new Map<unknown, RepoMock>([
    [Examen, examen],
    [Materia, materia],
    [Semestre, semestre],
    [Paralelo, paralelo],
    [Inscripcion, inscripcion],
    [Pregunta, pregunta],
    [Tema, tema],
    [ExamenPregunta, examenPregunta],
    [ExamenTema, examenTema],
    [ExamenEstudiante, examenEstudiante],
    [Inciso, inciso],
    [ExamenPoolSnapshot, snapshot],
    [ExamenPoolSnapshotTema, snapshotTema],
    [ExamenPoolSnapshotPregunta, snapshotPregunta],
    [ExamenPoolSnapshotInciso, snapshotInciso],
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
    insert: jest.fn().mockResolvedValue({}),
  };

  const dataSource = {
    transaction: jest.fn(
      async (callback: (manager: ManagerMock) => Promise<unknown>) =>
        callback(manager),
    ),
    manager,
    getRepository: manager.getRepository,
  };

  const servicio = new ExamenService(
    dataSource as unknown as DataSource,
    examen as unknown as Repository<Examen>,
    materia as unknown as Repository<Materia>,
    semestre as unknown as Repository<Semestre>,
    paralelo as unknown as Repository<Paralelo>,
    inscripcion as unknown as Repository<Inscripcion>,
    pregunta as unknown as Repository<Pregunta>,
    tema as unknown as Repository<Tema>,
  );

  return {
    servicio,
    dataSource,
    manager,
    examen,
    materia,
    semestre,
    paralelo,
    inscripcion,
    pregunta,
    tema,
    examenPregunta,
    examenTema,
    examenEstudiante,
    inciso,
    snapshot,
    snapshotTema,
    snapshotPregunta,
    snapshotInciso,
  };
}

const EXAMEN_BORRADOR = {
  examen_id: 5,
  docente_id: 7,
  materia_id: 1,
  semestre_id: 2,
  estado: 'borrador',
  modo_asignacion: 'paralelos',
};

describe('ExamenService — asignación de evaluaciones', () => {
  let montaje: Montaje;

  beforeEach(() => {
    montaje = montar();
  });

  describe('guardarAsignacion', () => {
    it('guarda una selección individual deduplicada dentro de una transacción bloqueada', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

      montaje.paralelo.find.mockResolvedValue([
        { paralelo_id: 10 },
        { paralelo_id: 11 },
      ]);

      const inscripciones = queryBuilderMock();
      inscripciones.getRawMany.mockResolvedValue([
        { estudiante_id: '100', paralelo_id: '10' },
      ]);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

      const resultado = await montaje.servicio.guardarAsignacion(
        5,
        { modo_asignacion: 'estudiantes', estudiante_ids: [100, 100] },
        7,
      );

      expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(montaje.dataSource.transaction).toHaveBeenCalledTimes(1);

      expect(montaje.manager.update).toHaveBeenCalledWith(
        Examen,
        { examen_id: 5 },
        { modo_asignacion: 'estudiantes' },
      );
      expect(montaje.manager.delete).toHaveBeenCalledWith(ParaleloExamen, {
        examen_id: 5,
      });
      expect(montaje.manager.insert).toHaveBeenCalledWith(ParaleloExamen, [
        { paralelo_id: 10, examen_id: 5 },
      ]);
      expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenEstudiante, {
        examen_id: 5,
      });
      expect(montaje.manager.insert).toHaveBeenCalledWith(ExamenEstudiante, [
        { examen_id: 5, estudiante_id: 100 },
      ]);

      expect(resultado).toEqual({
        modo_asignacion: 'estudiantes',
        total_estudiantes: 1,
      });
    });

    it('guarda una asignación por paralelos deduplicada y cuenta solo estudiantes activos', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

      montaje.paralelo.find.mockResolvedValue([
        { paralelo_id: 10 },
        { paralelo_id: 11 },
      ]);

      const conteo = queryBuilderMock();
      conteo.getRawOne.mockResolvedValue({ total: '4' });
      montaje.inscripcion.createQueryBuilder.mockReturnValue(conteo);

      const resultado = await montaje.servicio.guardarAsignacion(
        5,
        { modo_asignacion: 'paralelos', paralelo_ids: [10, 10, 11] },
        7,
      );

      expect(conteo.innerJoin).toHaveBeenCalledWith(
        'inscripcion.estudiante',
        'estudiante',
      );
      expect(conteo.andWhere).toHaveBeenCalledWith(
        'estudiante.activo = :activo',
        { activo: true },
      );
      expect(montaje.manager.insert).toHaveBeenCalledWith(ParaleloExamen, [
        { paralelo_id: 10, examen_id: 5 },
        { paralelo_id: 11, examen_id: 5 },
      ]);
      expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenEstudiante, {
        examen_id: 5,
      });
      expect(resultado).toEqual({
        modo_asignacion: 'paralelos',
        total_estudiantes: 4,
      });
    });

    it('rechaza un modo de asignación desconocido antes de abrir la transacción', async () => {
      await expect(
        montaje.servicio.guardarAsignacion(
          5,
          { modo_asignacion: 'todos', estudiante_ids: [100] },
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(montaje.dataSource.transaction).not.toHaveBeenCalled();
      expect(montaje.examen.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('rechaza una evaluación inexistente o de otro docente', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(null);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

      await expect(
        montaje.servicio.guardarAsignacion(
          5,
          { modo_asignacion: 'paralelos', paralelo_ids: [10] },
          99,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(bloqueo.where).toHaveBeenCalledWith(
        'examen.examen_id = :examenId',
        { examenId: 5 },
      );
      expect(bloqueo.andWhere).toHaveBeenCalledWith(
        'examen.docente_id = :docenteId',
        { docenteId: 99 },
      );
      expect(montaje.manager.insert).not.toHaveBeenCalled();
    });

    it('rechaza modificar la asignación de una evaluación publicada', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue({
        ...EXAMEN_BORRADOR,
        estado: 'publicado',
      });
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

      await expect(
        montaje.servicio.guardarAsignacion(
          5,
          { modo_asignacion: 'paralelos', paralelo_ids: [10] },
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(montaje.manager.insert).not.toHaveBeenCalled();
    });

    it('rechaza paralelos que no pertenecen al docente o al periodo', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10 }]);

      await expect(
        montaje.servicio.guardarAsignacion(
          5,
          { modo_asignacion: 'paralelos', paralelo_ids: [10, 99] },
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(montaje.manager.insert).not.toHaveBeenCalled();
    });

    it('rechaza selecciones vacías', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10 }]);

      await expect(
        montaje.servicio.guardarAsignacion(
          5,
          { modo_asignacion: 'paralelos', paralelo_ids: [] },
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        montaje.servicio.guardarAsignacion(
          5,
          { modo_asignacion: 'estudiantes', estudiante_ids: [] },
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(montaje.manager.insert).not.toHaveBeenCalled();
    });

    it('rechaza estudiantes inactivos o fuera del ámbito del docente', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10 }]);

      const inscripciones = queryBuilderMock();
      // La consulta filtra activos: el estudiante 100 no aparece.
      inscripciones.getRawMany.mockResolvedValue([]);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

      await expect(
        montaje.servicio.guardarAsignacion(
          5,
          { modo_asignacion: 'estudiantes', estudiante_ids: [100] },
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(inscripciones.andWhere).toHaveBeenCalledWith(
        'estudiante.activo = :activo',
        { activo: true },
      );
      expect(montaje.manager.insert).not.toHaveBeenCalled();
    });

    it('propaga errores de persistencia y revierte la transacción', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.paralelo.find.mockResolvedValue([{ paralelo_id: 10 }]);

      const conteo = queryBuilderMock();
      conteo.getRawOne.mockResolvedValue({ total: '2' });
      montaje.inscripcion.createQueryBuilder.mockReturnValue(conteo);

      montaje.manager.insert.mockRejectedValueOnce(
        new Error('fallo de persistencia'),
      );

      await expect(
        montaje.servicio.guardarAsignacion(
          5,
          { modo_asignacion: 'paralelos', paralelo_ids: [10] },
          7,
        ),
      ).rejects.toThrow('fallo de persistencia');

      expect(montaje.dataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('obtenerAsignacion', () => {
    it('devuelve solo los estudiantes activos y marca los seleccionados', async () => {
      montaje.examen.findOne.mockResolvedValue({
        ...EXAMEN_BORRADOR,
        modo_asignacion: 'estudiantes',
        materia: { materia_id: 1, nombre: 'Matemática' },
        semestre: { semestre_id: 2, gestion: '2026' },
        paralelos: [{ paralelo_id: 10 }],
        estudiantes: [{ estudiante_id: 100 }],
      });
      montaje.paralelo.find.mockResolvedValue([
        { paralelo_id: 10, nombre_paralelo: 'A' },
      ]);

      const inscripciones = queryBuilderMock();
      inscripciones.getMany.mockResolvedValue([
        {
          paralelo_id: 10,
          estudiante: {
            estudiante_id: 100,
            nombre_completo: 'Ana',
            correo_institucional: 'ana@x',
          },
        },
        {
          paralelo_id: 10,
          estudiante: {
            estudiante_id: 101,
            nombre_completo: 'Beto',
            correo_institucional: 'beto@x',
          },
        },
      ]);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

      const resultado = await montaje.servicio.obtenerAsignacion(5, 7);

      expect(montaje.examen.findOne).toHaveBeenCalledWith({
        where: { examen_id: 5, docente_id: 7 },
        relations: {
          materia: true,
          semestre: true,
          paralelos: true,
          estudiantes: true,
        },
      });
      expect(inscripciones.andWhere).toHaveBeenCalledWith(
        'estudiante.activo = :activo',
        { activo: true },
      );
      expect(resultado.modo_asignacion).toBe('estudiantes');
      expect(resultado.paralelos).toEqual([
        {
          paralelo_id: 10,
          nombre_paralelo: 'A',
          total_estudiantes: 2,
          seleccionado: true,
          estudiantes: [
            {
              estudiante_id: 100,
              nombre_completo: 'Ana',
              correo_institucional: 'ana@x',
              seleccionado: true,
            },
            {
              estudiante_id: 101,
              nombre_completo: 'Beto',
              correo_institucional: 'beto@x',
              seleccionado: false,
            },
          ],
        },
      ]);
    });

    it('rechaza una evaluación inexistente o de otro docente', async () => {
      montaje.examen.findOne.mockResolvedValue(null);

      await expect(
        montaje.servicio.obtenerAsignacion(5, 99),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(montaje.paralelo.find).not.toHaveBeenCalled();
    });

    it('rechaza una evaluación sin materia asociada', async () => {
      montaje.examen.findOne.mockResolvedValue({
        ...EXAMEN_BORRADOR,
        materia_id: null,
      });

      await expect(
        montaje.servicio.obtenerAsignacion(5, 7),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('no consulta inscripciones cuando el docente no tiene paralelos', async () => {
      montaje.examen.findOne.mockResolvedValue({
        ...EXAMEN_BORRADOR,
        materia: { materia_id: 1, nombre: 'Matemática' },
        semestre: { semestre_id: 2, gestion: '2026' },
        paralelos: [],
        estudiantes: [],
      });
      montaje.paralelo.find.mockResolvedValue([]);

      const resultado = await montaje.servicio.obtenerAsignacion(5, 7);

      expect(montaje.inscripcion.createQueryBuilder).not.toHaveBeenCalled();
      expect(resultado.paralelos).toEqual([]);
    });
  });

  describe('publicar', () => {
    function examenPublicable() {
      return {
        ...EXAMEN_BORRADOR,
        modo_asignacion: 'paralelos',
        modo_seleccion: 'manual',
        duracion_min: 60,
        puntaje_total: '10',
        disponible_desde: new Date(Date.now() + 60 * 60 * 1000),
        disponible_hasta: new Date(Date.now() + 3 * 60 * 60 * 1000),
        paralelos: [{ paralelo_id: 10 }],
      };
    }

    it('publica bloqueando el examen y condiciona la actualización a borrador', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.examen.findOne.mockResolvedValue(examenPublicable());

      montaje.examenPregunta.count.mockResolvedValue(1);

      const inscripciones = queryBuilderMock();
      inscripciones.getMany.mockResolvedValue([
        {
          estudiante: { estudiante_id: 100, nombre_completo: 'Ana' },
        },
      ]);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

      const resultado = await montaje.servicio.publicar(5, 7);

      expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(inscripciones.andWhere).toHaveBeenCalledWith(
        'estudiante.activo = :activo',
        { activo: true },
      );
      expect(montaje.manager.update).toHaveBeenCalledWith(
        Examen,
        { examen_id: 5, estado: 'borrador' },
        { estado: 'publicado' },
      );
      expect(resultado).toEqual({ examen_id: 5, estado: 'publicado' });
    });

    it('no publica si no quedan estudiantes activos asignados', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.examen.findOne.mockResolvedValue(examenPublicable());
      montaje.examenPregunta.count.mockResolvedValue(1);

      const inscripciones = queryBuilderMock();
      // El filtro de activos deja la lista vacía (todos inactivos).
      inscripciones.getMany.mockResolvedValue([]);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

      await expect(
        montaje.servicio.publicar(5, 7),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('en modo estudiantes solo considera seleccionados activos', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue({
        ...EXAMEN_BORRADOR,
        modo_asignacion: 'estudiantes',
      });
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.examen.findOne.mockResolvedValue({
        ...examenPublicable(),
        modo_asignacion: 'estudiantes',
        paralelos: [],
      });
      montaje.examenPregunta.count.mockResolvedValue(1);

      const seleccionados = queryBuilderMock();
      // El estudiante asignado está inactivo: el filtro lo excluye.
      seleccionados.getMany.mockResolvedValue([]);
      montaje.examenEstudiante.createQueryBuilder.mockReturnValue(
        seleccionados,
      );

      await expect(
        montaje.servicio.publicar(5, 7),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(seleccionados.innerJoinAndSelect).toHaveBeenCalledWith(
        'examenEstudiante.estudiante',
        'estudiante',
      );
      expect(seleccionados.andWhere).toHaveBeenCalledWith(
        'estudiante.activo = :activo',
        { activo: true },
      );
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('no publica si otra operación ya cambió el estado', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.examen.findOne.mockResolvedValue(examenPublicable());
      montaje.examenPregunta.count.mockResolvedValue(1);

      const inscripciones = queryBuilderMock();
      inscripciones.getMany.mockResolvedValue([
        { estudiante: { estudiante_id: 100, nombre_completo: 'Ana' } },
      ]);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

      montaje.manager.update.mockResolvedValueOnce({ affected: 0 });

      await expect(
        montaje.servicio.publicar(5, 7),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza una evaluación inexistente o de otro docente', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(null);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

      await expect(
        montaje.servicio.publicar(5, 99),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(montaje.examen.findOne).not.toHaveBeenCalled();
    });

    it('rechaza publicar una evaluación que ya no está en borrador', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue({
        ...EXAMEN_BORRADOR,
        estado: 'publicado',
      });
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

      await expect(
        montaje.servicio.publicar(5, 7),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(montaje.manager.update).not.toHaveBeenCalled();
    });
  });

  describe('publicar — validación de puntajes', () => {
    const PREGUNTA_BASE = {
      pregunta_id: '1',
      enunciado: 'Pregunta de prueba',
      dificultad: null,
      activo: true,
      tema_id: '1',
      nombre_tema: 'Algebra',
      materia_id: '1',
      materia_nombre: 'Matematica',
      puntos: '10',
      total_incisos: '2',
      incisos_sin_puntaje: '0',
      tipo_respuesta: 'opcion_unica',
    };

    function examenPublicable() {
      return {
        ...EXAMEN_BORRADOR,
        modo_asignacion: 'paralelos',
        modo_seleccion: 'manual',
        duracion_min: 60,
        puntaje_total: '10',
        disponible_desde: new Date(Date.now() + 60 * 60 * 1000),
        disponible_hasta: new Date(Date.now() + 3 * 60 * 60 * 1000),
        paralelos: [{ paralelo_id: 10 }],
      };
    }

    function prepararPublicacion(
      filaPregunta: Record<string, unknown> | null,
      puntajeTotal: string | null = '10',
    ) {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.examen.findOne.mockResolvedValue({
        ...examenPublicable(),
        puntaje_total: puntajeTotal,
      });

      montaje.examenPregunta.count.mockResolvedValue(
        filaPregunta ? 1 : 0,
      );
      montaje.examenPregunta.find.mockResolvedValue(
        filaPregunta
          ? [{ examen_id: 5, pregunta_id: 1, orden: 1 }]
          : [],
      );

      const preguntas = queryBuilderMock();
      preguntas.getRawMany.mockResolvedValue(
        filaPregunta ? [filaPregunta] : [],
      );
      montaje.pregunta.createQueryBuilder.mockReturnValue(preguntas);

      const usos = queryBuilderMock();
      usos.getRawMany.mockResolvedValue([]);
      montaje.examenPregunta.createQueryBuilder.mockReturnValue(usos);

      const inscripciones = queryBuilderMock();
      inscripciones.getMany.mockResolvedValue([
        {
          estudiante: { estudiante_id: 100, nombre_completo: 'Ana' },
        },
      ]);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

      return { bloqueo, preguntas, usos };
    }

    async function problemasDePublicacion() {
      try {
        await montaje.servicio.publicar(5, 7);
        throw new Error('La publicación debía bloquearse.');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const respuesta = (
          error as BadRequestException
        ).getResponse() as {
          problemas: { paso: number; mensaje: string }[];
        };
        return respuesta.problemas;
      }
    }

    it('publica si todas las preguntas tienen puntajes mayores que cero', async () => {
      prepararPublicacion({ ...PREGUNTA_BASE });

      const resultado = await montaje.servicio.publicar(5, 7);

      expect(resultado).toEqual({ examen_id: 5, estado: 'publicado' });
      expect(montaje.manager.update).toHaveBeenCalledWith(
        Examen,
        { examen_id: 5, estado: 'borrador' },
        { estado: 'publicado' },
      );
    });

    it('bloquea la publicación si una pregunta no tiene incisos', async () => {
      prepararPublicacion({
        ...PREGUNTA_BASE,
        puntos: '0',
        total_incisos: '0',
      });

      const problemas = await problemasDePublicacion();

      expect(problemas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paso: 2,
            mensaje: 'La pregunta #1 no tiene incisos.',
          }),
        ]),
      );
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('bloquea la publicación si un inciso tiene puntaje cero o negativo', async () => {
      prepararPublicacion({
        ...PREGUNTA_BASE,
        puntos: '5',
        total_incisos: '2',
        incisos_sin_puntaje: '1',
      });

      const problemas = await problemasDePublicacion();

      expect(problemas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paso: 2,
            mensaje: expect.stringContaining(
              'no es numérico, finito y mayor que cero',
            ),
          }),
        ]),
      );
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('bloquea la publicación si un puntaje no es numérico o no es finito', async () => {
      prepararPublicacion({
        ...PREGUNTA_BASE,
        puntos: 'NaN',
        total_incisos: '1',
      });

      const problemas = await problemasDePublicacion();

      expect(problemas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paso: 2,
            mensaje: expect.stringContaining(
              'no numérico o no finito',
            ),
          }),
        ]),
      );
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('bloquea una pregunta con varios incisos si uno de ellos es inválido', async () => {
      prepararPublicacion({
        ...PREGUNTA_BASE,
        puntos: '12',
        total_incisos: '3',
        incisos_sin_puntaje: '1',
      });

      const problemas = await problemasDePublicacion();

      expect(problemas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paso: 2,
            mensaje: expect.stringContaining('La pregunta #1'),
          }),
        ]),
      );
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('bloquea la publicación cuando el puntaje total es cero', async () => {
      prepararPublicacion({
        ...PREGUNTA_BASE,
        puntos: '0',
        total_incisos: '1',
      });

      const problemas = await problemasDePublicacion();

      expect(problemas.length).toBeGreaterThan(0);
      expect(problemas[0].paso).toBe(2);
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('bloquea la publicación si la suma no coincide con el puntaje total configurado', async () => {
      prepararPublicacion({
        ...PREGUNTA_BASE,
        puntos: '8',
      });

      const problemas = await problemasDePublicacion();

      expect(problemas).toEqual(
        expect.arrayContaining([
          {
            paso: 2,
            mensaje:
              'La suma de los puntajes de las preguntas (8) no coincide con el puntaje total configurado (10).',
          },
        ]),
      );
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('publica cuando la suma coincide con un total con decimales', async () => {
      prepararPublicacion(
        { ...PREGUNTA_BASE, puntaje: '12.5' },
        '12.5',
      );

      const resultado = await montaje.servicio.publicar(5, 7);

      expect(resultado).toEqual({ examen_id: 5, estado: 'publicado' });
      expect(montaje.manager.update).toHaveBeenCalledWith(
        Examen,
        { examen_id: 5, estado: 'borrador' },
        { estado: 'publicado' },
      );
    });

    it('bloquea la publicación si no hay puntaje total configurado', async () => {
      prepararPublicacion({ ...PREGUNTA_BASE }, null);

      const problemas = await problemasDePublicacion();

      expect(problemas).toEqual(
        expect.arrayContaining([
          {
            paso: 3,
            mensaje:
              'Define el puntaje total de la evaluación antes de publicarla.',
          },
        ]),
      );
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });
  });

  describe('publicar — instantánea del pool aleatorio', () => {
    function prepararPublicacionAleatoria({
      cantidad = 1,
      preguntas = [
        { pregunta_id: 1, tema_id: 1, enunciado: 'Pregunta 1', activo: true },
        { pregunta_id: 2, tema_id: 1, enunciado: 'Pregunta 2', activo: true },
      ],
      incisos = [
        { pregunta_id: 1, letra: 'a', puntaje_max: '2' },
        { pregunta_id: 2, letra: 'a', puntaje_max: '2' },
      ],
      totalValidacion = preguntas.filter((pregunta) => pregunta.activo).length,
      snapshotExistente = false,
      puntajeTotal = '2',
    }: {
      cantidad?: number;
      preguntas?: {
        pregunta_id: number;
        tema_id: number;
        enunciado: string;
        activo: boolean;
      }[];
      incisos?: {
        pregunta_id: number;
        letra: string;
        puntaje_max: string;
      }[];
      totalValidacion?: number;
      snapshotExistente?: boolean;
      puntajeTotal?: string;
    } = {}) {
      const examen = {
        ...EXAMEN_BORRADOR,
        modo_asignacion: 'paralelos',
        modo_seleccion: 'aleatorio',
        duracion_min: 60,
        puntaje_total: puntajeTotal,
        disponible_desde: new Date(Date.now() + 60 * 60 * 1000),
        disponible_hasta: new Date(Date.now() + 3 * 60 * 60 * 1000),
        paralelos: [{ paralelo_id: 10 }],
      };
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(examen);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.examen.findOne.mockResolvedValue(examen);

      const criterios = [{ examen_id: 5, tema_id: 1, cantidad }];
      montaje.examenTema.find.mockResolvedValue(criterios);
      const criteriosBloqueados = queryBuilderMock();
      criteriosBloqueados.getMany.mockResolvedValue(criterios);
      montaje.examenTema.createQueryBuilder.mockReturnValue(
        criteriosBloqueados,
      );

      const temas = [{ tema_id: 1, materia_id: 1, nombre_tema: 'Algebra' }];
      montaje.tema.find.mockResolvedValue(temas);
      const temasBloqueados = queryBuilderMock();
      temasBloqueados.getMany.mockResolvedValue(temas);
      montaje.tema.createQueryBuilder.mockReturnValue(temasBloqueados);

      const conteo = queryBuilderMock();
      conteo.getRawMany.mockResolvedValue([
        { tema_id: 1, total: String(totalValidacion) },
      ]);
      const poolBloqueado = queryBuilderMock();
      poolBloqueado.getMany.mockResolvedValue(preguntas);
      montaje.pregunta.createQueryBuilder
        .mockReturnValueOnce(conteo)
        .mockReturnValueOnce(poolBloqueado);

      const incisosBloqueados = queryBuilderMock();
      incisosBloqueados.getMany.mockResolvedValue(incisos);
      montaje.inciso.createQueryBuilder.mockReturnValue(incisosBloqueados);
      montaje.snapshot.findOne.mockResolvedValue(
        snapshotExistente ? { examen_id: 5 } : null,
      );

      const inscripciones = queryBuilderMock();
      inscripciones.getMany.mockResolvedValue([
        { estudiante: { estudiante_id: 100, nombre_completo: 'Ana' } },
      ]);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(inscripciones);

      return {
        bloqueo,
        criteriosBloqueados,
        temasBloqueados,
        poolBloqueado,
        incisosBloqueados,
      };
    }

    function problemasDeError(error: unknown) {
      expect(error).toBeInstanceOf(BadRequestException);
      return (error as BadRequestException).getResponse() as {
        problemas: { paso: number; mensaje: string }[];
      };
    }

    it('permite un pool parcial uniforme y conserva puntajes decimales', async () => {
      const bloqueos = prepararPublicacionAleatoria({
        cantidad: 1,
        preguntas: [
          { pregunta_id: 1, tema_id: 1, enunciado: 'Pregunta 1', activo: true },
          { pregunta_id: 2, tema_id: 1, enunciado: 'Pregunta 2', activo: true },
        ],
        incisos: [
          { pregunta_id: 1, letra: 'a', puntaje_max: '1.25' },
          { pregunta_id: 1, letra: 'b', puntaje_max: '0.75' },
          { pregunta_id: 2, letra: 'a', puntaje_max: '2.0' },
        ],
      });

      await montaje.servicio.publicar(5, 7);

      expect(bloqueos.criteriosBloqueados.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
      expect(bloqueos.temasBloqueados.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
      expect(bloqueos.poolBloqueado.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
      expect(bloqueos.incisosBloqueados.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
      expect(bloqueos.criteriosBloqueados.orderBy).toHaveBeenCalledWith(
        'examenTema.tema_id',
        'ASC',
      );
      expect(bloqueos.temasBloqueados.orderBy).toHaveBeenCalledWith(
        'tema.tema_id',
        'ASC',
      );
      expect(bloqueos.poolBloqueado.addOrderBy).toHaveBeenCalledWith(
        'pregunta.pregunta_id',
        'ASC',
      );
      expect(bloqueos.incisosBloqueados.addOrderBy).toHaveBeenCalledWith(
        'inciso.letra',
        'ASC',
      );
      expect(montaje.manager.insert).toHaveBeenNthCalledWith(
        1,
        ExamenPoolSnapshot,
        {
          examen_id: 5,
          version: 1,
          puntaje_maximo_garantizado: '2',
        },
      );
      expect(montaje.manager.insert).toHaveBeenNthCalledWith(
        2,
        ExamenPoolSnapshotTema,
        [
          {
            examen_id: 5,
            tema_id: 1,
            cantidad_seleccionada: 1,
            cantidad_candidatas: 2,
            puntaje_maximo_tema: '2',
          },
        ],
      );
      expect(montaje.manager.insert).toHaveBeenNthCalledWith(
        3,
        ExamenPoolSnapshotPregunta,
        [
          {
            examen_id: 5,
            tema_id: 1,
            pregunta_id: 1,
            puntaje_maximo_pregunta: '2',
          },
          {
            examen_id: 5,
            tema_id: 1,
            pregunta_id: 2,
            puntaje_maximo_pregunta: '2',
          },
        ],
      );
      expect(montaje.manager.insert).toHaveBeenNthCalledWith(
        4,
        ExamenPoolSnapshotInciso,
        expect.arrayContaining([
          expect.objectContaining({
            pregunta_id: 1,
            letra: 'a',
            puntaje_max: '1.25',
          }),
          expect.objectContaining({
            pregunta_id: 1,
            letra: 'b',
            puntaje_max: '0.75',
          }),
        ]),
      );
    });

    it('rechaza publicar si el total garantizado no coincide con el configurado', async () => {
      prepararPublicacionAleatoria({ puntajeTotal: '3' });

      try {
        await montaje.servicio.publicar(5, 7);
        throw new Error('La publicación debía bloquearse.');
      } catch (error) {
        const respuesta = problemasDeError(error);
        expect(respuesta.problemas[0]).toMatchObject({
          paso: 2,
          mensaje:
            'La suma de los puntajes de las preguntas aleatorias (2) no coincide con el puntaje total configurado (3).',
        });
      }

      expect(montaje.manager.insert).not.toHaveBeenCalled();
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('rechaza un pool parcial si sus preguntas tienen puntajes diferentes', async () => {      prepararPublicacionAleatoria({
        cantidad: 1,
        incisos: [
          { pregunta_id: 1, letra: 'a', puntaje_max: '2' },
          { pregunta_id: 2, letra: 'a', puntaje_max: '3' },
        ],
      });

      try {
        await montaje.servicio.publicar(5, 7);
        throw new Error('La publicación debía bloquearse.');
      } catch (error) {
        const respuesta = problemasDeError(error);
        expect(respuesta.problemas[0]).toMatchObject({
          paso: 2,
          mensaje: expect.stringContaining(
            'contiene preguntas con puntajes máximos diferentes',
          ),
        });
      }

      expect(montaje.manager.insert).not.toHaveBeenCalled();
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('permite puntajes diferentes cuando se selecciona todo el pool', async () => {
      prepararPublicacionAleatoria({
        cantidad: 2,
        incisos: [
          { pregunta_id: 1, letra: 'a', puntaje_max: '2' },
          { pregunta_id: 2, letra: 'a', puntaje_max: '3.5' },
        ],
        puntajeTotal: '5.5',
      });

      await montaje.servicio.publicar(5, 7);

      expect(montaje.manager.insert).toHaveBeenNthCalledWith(
        1,
        ExamenPoolSnapshot,
        expect.objectContaining({
          puntaje_maximo_garantizado: '5.5',
        }),
      );
      expect(montaje.manager.insert).toHaveBeenNthCalledWith(
        2,
        ExamenPoolSnapshotTema,
        [
          expect.objectContaining({
            cantidad_seleccionada: 2,
            cantidad_candidatas: 2,
            puntaje_maximo_tema: '5.5',
          }),
        ],
      );
    });

    it('solo incluye preguntas activas en las candidatas congeladas', async () => {
      prepararPublicacionAleatoria({
        cantidad: 1,
        preguntas: [
          { pregunta_id: 1, tema_id: 1, enunciado: 'Activa', activo: true },
          { pregunta_id: 2, tema_id: 1, enunciado: 'Inactiva', activo: false },
        ],
        incisos: [{ pregunta_id: 1, letra: 'a', puntaje_max: '2' }],
      });

      await montaje.servicio.publicar(5, 7);

      expect(montaje.manager.insert).toHaveBeenNthCalledWith(
        3,
        ExamenPoolSnapshotPregunta,
        [
          {
            examen_id: 5,
            tema_id: 1,
            pregunta_id: 1,
            puntaje_maximo_pregunta: '2',
          },
        ],
      );
    });

    it('revalida el pool bloqueado y rechaza una cantidad insuficiente', async () => {
      prepararPublicacionAleatoria({
        cantidad: 2,
        preguntas: [
          { pregunta_id: 1, tema_id: 1, enunciado: 'Pregunta 1', activo: true },
        ],
        incisos: [{ pregunta_id: 1, letra: 'a', puntaje_max: '2' }],
        totalValidacion: 2,
      });

      await expect(montaje.servicio.publicar(5, 7)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(montaje.manager.insert).not.toHaveBeenCalled();
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it.each([
      {
        incisos: [],
        mensaje: 'no tiene incisos',
      },
      {
        incisos: [{ pregunta_id: 1, letra: 'a', puntaje_max: 'NaN' }],
        mensaje: 'no es numérico, finito y mayor que cero',
      },
      {
        incisos: [{ pregunta_id: 1, letra: 'a', puntaje_max: '0' }],
        mensaje: 'no es numérico, finito y mayor que cero',
      },
      {
        incisos: [{ pregunta_id: 1, letra: 'a', puntaje_max: '-1' }],
        mensaje: 'no es numérico, finito y mayor que cero',
      },
    ])(
      'rechaza una candidata con puntaje inválido',
      async ({ incisos, mensaje }) => {
        prepararPublicacionAleatoria({
          cantidad: 1,
          preguntas: [
            {
              pregunta_id: 1,
              tema_id: 1,
              enunciado: 'Pregunta 1',
              activo: true,
            },
          ],
          incisos,
        });

        try {
          await montaje.servicio.publicar(5, 7);
          throw new Error('La publicación debía bloquearse.');
        } catch (error) {
          const respuesta = problemasDeError(error);
          expect(respuesta.problemas[0].mensaje).toContain(mensaje);
        }

        expect(montaje.manager.insert).not.toHaveBeenCalled();
        expect(montaje.manager.update).not.toHaveBeenCalled();
      },
    );

    it('no publica si falla la inserción de cualquier parte de la instantánea', async () => {
      prepararPublicacionAleatoria();
      montaje.manager.insert
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Fallo de persistencia'));

      await expect(montaje.servicio.publicar(5, 7)).rejects.toThrow(
        'Fallo de persistencia',
      );

      expect(montaje.manager.insert).toHaveBeenCalledTimes(3);
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('rechaza una segunda publicación con snapshot existente o estado publicado', async () => {
      const { bloqueo } = prepararPublicacionAleatoria({
        snapshotExistente: true,
      });

      await expect(montaje.servicio.publicar(5, 7)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(montaje.manager.insert).not.toHaveBeenCalled();
      expect(montaje.manager.update).not.toHaveBeenCalled();

      bloqueo.getOne.mockResolvedValueOnce({
        ...EXAMEN_BORRADOR,
        estado: 'publicado',
      });
      await expect(montaje.servicio.publicar(5, 7)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(montaje.manager.insert).not.toHaveBeenCalled();
    });

    it('solo una publicación concurrente inserta la instantánea', async () => {
      const { bloqueo } = prepararPublicacionAleatoria();
      bloqueo.getOne
        .mockResolvedValueOnce(EXAMEN_BORRADOR)
        .mockResolvedValueOnce({ ...EXAMEN_BORRADOR, estado: 'publicado' });

      const resultados = await Promise.allSettled([
        montaje.servicio.publicar(5, 7),
        montaje.servicio.publicar(5, 7),
      ]);

      expect(
        resultados.filter((resultado) => resultado.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        resultados.filter((resultado) => resultado.status === 'rejected'),
      ).toHaveLength(1);
      expect(montaje.manager.insert).toHaveBeenCalledTimes(4);
    });

    it('impide que un guardado concurrente cambie criterios después de publicar', async () => {
      const { bloqueo } = prepararPublicacionAleatoria();
      bloqueo.getOne
        .mockResolvedValueOnce(EXAMEN_BORRADOR)
        .mockResolvedValueOnce({ ...EXAMEN_BORRADOR, estado: 'publicado' });

      const resultados = await Promise.allSettled([
        montaje.servicio.publicar(5, 7),
        montaje.servicio.guardarSeleccion(
          5,
          {
            modo_seleccion: 'aleatorio',
            criterios: [{ tema_id: 1, cantidad: 2 }],
          },
          7,
        ),
      ]);

      expect(
        resultados.filter((resultado) => resultado.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        resultados.filter((resultado) => resultado.status === 'rejected'),
      ).toHaveLength(1);
      expect(montaje.manager.insert).toHaveBeenCalledTimes(4);
      expect(montaje.manager.insert).not.toHaveBeenCalledWith(
        ExamenTema,
        expect.anything(),
      );
    });
  });

  describe('guardarSeleccion', () => {
    it('bloquea el examen y guarda criterios dentro de la transacción', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.tema.find.mockResolvedValue([{ tema_id: 1, materia_id: 1 }]);

      const conteo = queryBuilderMock();
      conteo.getRawMany.mockResolvedValue([{ tema_id: 1, total: '3' }]);
      montaje.pregunta.createQueryBuilder.mockReturnValue(conteo);

      const resultado = await montaje.servicio.guardarSeleccion(
        5,
        {
          modo_seleccion: 'aleatorio',
          criterios: [{ tema_id: 1, cantidad: 2 }],
        },
        7,
      );

      expect(montaje.dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenTema, {
        examen_id: 5,
      });
      expect(montaje.manager.insert).toHaveBeenCalledWith(ExamenTema, [
        { examen_id: 5, tema_id: 1, cantidad: 2 },
      ]);
      expect(montaje.manager.update).toHaveBeenCalledWith(
        Examen,
        { examen_id: 5, docente_id: 7, estado: 'borrador' },
        { modo_seleccion: 'aleatorio' },
      );
      expect(resultado.total_preguntas).toBe(2);
    });

    it('no modifica criterios si el estado dejó de ser borrador', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue({
        ...EXAMEN_BORRADOR,
        estado: 'publicado',
      });
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

      await expect(
        montaje.servicio.guardarSeleccion(
          5,
          {
            modo_seleccion: 'aleatorio',
            criterios: [{ tema_id: 1, cantidad: 1 }],
          },
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(montaje.manager.delete).not.toHaveBeenCalled();
      expect(montaje.manager.insert).not.toHaveBeenCalled();
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    function prepararSeleccionManual(puntajesBanco: string[] = ['7.5', '3']) {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(EXAMEN_BORRADOR);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

      const validacion = queryBuilderMock();
      validacion.getCount.mockResolvedValue(puntajesBanco.length);
      montaje.pregunta.createQueryBuilder.mockReturnValue(validacion);

      const banco = queryBuilderMock();
      banco.getRawMany.mockResolvedValue(
        puntajesBanco.map((puntaje, indice) => ({
          pregunta_id: String(indice + 1),
          puntaje,
        })),
      );
      montaje.inciso.createQueryBuilder.mockReturnValue(banco);
    }

    it('inicializa cada pregunta con el puntaje del banco', async () => {
      prepararSeleccionManual();

      const resultado = await montaje.servicio.guardarSeleccion(
        5,
        { modo_seleccion: 'manual', pregunta_ids: [1, 2] },
        7,
      );

      expect(montaje.manager.insert).toHaveBeenCalledWith(ExamenPregunta, [
        { examen_id: 5, pregunta_id: 1, orden: 1, puntaje: '7.5' },
        { examen_id: 5, pregunta_id: 2, orden: 2, puntaje: '3' },
      ]);
      expect(resultado).toMatchObject({
        modo_seleccion: 'manual',
        pregunta_ids: [1, 2],
        total_preguntas: 2,
      });
    });

    it('respeta el puntaje propio enviado por el docente', async () => {
      prepararSeleccionManual();

      await montaje.servicio.guardarSeleccion(
        5,
        {
          modo_seleccion: 'manual',
          pregunta_ids: [1, 2],
          puntajes: [{ pregunta_id: 2, puntaje: 9.25 }],
        },
        7,
      );

      expect(montaje.manager.insert).toHaveBeenCalledWith(ExamenPregunta, [
        { examen_id: 5, pregunta_id: 1, orden: 1, puntaje: '7.5' },
        { examen_id: 5, pregunta_id: 2, orden: 2, puntaje: '9.25' },
      ]);
    });

    it('rechaza un puntaje para una pregunta que no está seleccionada', async () => {
      prepararSeleccionManual();

      await expect(
        montaje.servicio.guardarSeleccion(
          5,
          {
            modo_seleccion: 'manual',
            pregunta_ids: [1],
            puntajes: [{ pregunta_id: 99, puntaje: 2 }],
          },
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(montaje.manager.insert).not.toHaveBeenCalled();
    });
  });

  describe('guardarPuntajes', () => {
    type FilaPuntaje = {
      examen_id: number;
      pregunta_id: number;
      orden: number;
      puntaje: string | null;
    };

    function prepararGuardado({
      puntajeTotal = '20',
      estado = 'borrador',
      filas = [
        { examen_id: 5, pregunta_id: 1, orden: 1, puntaje: '4' },
        { examen_id: 5, pregunta_id: 2, orden: 2, puntaje: '6' },
      ],
      banco = [] as { pregunta_id: string; puntaje: string }[],
    }: {
      puntajeTotal?: string | null;
      estado?: string;
      filas?: FilaPuntaje[];
      banco?: { pregunta_id: string; puntaje: string }[];
    } = {}) {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue({
        ...EXAMEN_BORRADOR,
        estado,
        puntaje_total: puntajeTotal,
      });
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.examenPregunta.find.mockResolvedValue(filas);

      const consultaBanco = queryBuilderMock();
      consultaBanco.getRawMany.mockResolvedValue(banco);
      montaje.inciso.createQueryBuilder.mockReturnValue(consultaBanco);

      const detalle = { examen_id: 5, preguntas: [] };
      jest.spyOn(montaje.servicio, 'findOne').mockResolvedValue(detalle as never);

      return { bloqueo, detalle };
    }

    it('guarda los puntajes enviados y devuelve el detalle actualizado', async () => {
      const { bloqueo, detalle } = prepararGuardado();

      const resultado = await montaje.servicio.guardarPuntajes(
        5,
        {
          puntajes: [
            { pregunta_id: 1, puntaje: 5.5 },
            { pregunta_id: 2, puntaje: 7.25 },
          ],
        },
        7,
      );

      expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(montaje.manager.update).toHaveBeenCalledWith(
        ExamenPregunta,
        { examen_id: 5, pregunta_id: 1 },
        { puntaje: '5.5' },
      );
      expect(montaje.manager.update).toHaveBeenCalledWith(
        ExamenPregunta,
        { examen_id: 5, pregunta_id: 2 },
        { puntaje: '7.25' },
      );
      expect(montaje.manager.update).toHaveBeenCalledTimes(2);
      expect(montaje.servicio.findOne).toHaveBeenCalledWith(5, 7);
      expect(resultado).toBe(detalle);
    });

    it('permite que la suma sea exactamente el puntaje total configurado', async () => {
      prepararGuardado({ puntajeTotal: '10.5' });

      await montaje.servicio.guardarPuntajes(
        5,
        { puntajes: [{ pregunta_id: 1, puntaje: 4.5 }] },
        7,
      );

      expect(montaje.manager.update).toHaveBeenCalledWith(
        ExamenPregunta,
        { examen_id: 5, pregunta_id: 1 },
        { puntaje: '4.5' },
      );
      expect(montaje.manager.update).toHaveBeenCalledTimes(1);
    });

    it('rechaza la suma que supera el puntaje total configurado', async () => {
      prepararGuardado({ puntajeTotal: '10' });

      await expect(
        montaje.servicio.guardarPuntajes(
          5,
          { puntajes: [{ pregunta_id: 1, puntaje: 4.5 }] },
          7,
        ),
      ).rejects.toThrow(
        'La suma de los puntajes de las preguntas (10.5) no puede superar el puntaje total configurado (10)',
      );

      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('rechaza una pregunta que no pertenece a la evaluación', async () => {
      prepararGuardado();

      await expect(
        montaje.servicio.guardarPuntajes(
          5,
          { puntajes: [{ pregunta_id: 99, puntaje: 2 }] },
          7,
        ),
      ).rejects.toThrow('La pregunta #99 no pertenece a la evaluación.');

      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('rechaza el guardado si la evaluación no tiene puntaje total configurado', async () => {
      prepararGuardado({ puntajeTotal: null });

      await expect(
        montaje.servicio.guardarPuntajes(
          5,
          { puntajes: [{ pregunta_id: 1, puntaje: 2 }] },
          7,
        ),
      ).rejects.toThrow(
        'Configure el puntaje total de la evaluación antes de guardar los puntajes de las preguntas.',
      );

      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('rechaza el guardado si la evaluación dejó de ser borrador', async () => {
      prepararGuardado({ estado: 'publicado' });

      await expect(
        montaje.servicio.guardarPuntajes(
          5,
          { puntajes: [{ pregunta_id: 1, puntaje: 2 }] },
          7,
        ),
      ).rejects.toThrow(
        'Solo se pueden modificar los puntajes de una evaluación en borrador.',
      );

      expect(montaje.servicio.findOne).not.toHaveBeenCalled();
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('solo permite al docente propietario modificar los puntajes', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(null);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

      await expect(
        montaje.servicio.guardarPuntajes(
          5,
          { puntajes: [{ pregunta_id: 1, puntaje: 2 }] },
          99,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('valida la suma con el puntaje guardado o del banco de las preguntas omitidas', async () => {
      prepararGuardado({
        puntajeTotal: '10',
        filas: [
          { examen_id: 5, pregunta_id: 1, orden: 1, puntaje: '4' },
          { examen_id: 5, pregunta_id: 2, orden: 2, puntaje: null },
        ],
        banco: [{ pregunta_id: '2', puntaje: '6' }],
      });

      await montaje.servicio.guardarPuntajes(
        5,
        { puntajes: [{ pregunta_id: 1, puntaje: 4 }] },
        7,
      );

      expect(montaje.manager.update).toHaveBeenCalledTimes(1);
      expect(montaje.manager.update).toHaveBeenCalledWith(
        ExamenPregunta,
        { examen_id: 5, pregunta_id: 1 },
        { puntaje: '4' },
      );
    });

    it('rechaza el guardado si una pregunta existente no tiene puntaje válido', async () => {
      prepararGuardado({
        filas: [
          { examen_id: 5, pregunta_id: 1, orden: 1, puntaje: '4' },
          { examen_id: 5, pregunta_id: 2, orden: 2, puntaje: null },
        ],
      });

      await expect(
        montaje.servicio.guardarPuntajes(
          5,
          { puntajes: [{ pregunta_id: 1, puntaje: 4 }] },
          7,
        ),
      ).rejects.toThrow(
        'La pregunta #2 no tiene un puntaje válido. Asigne uno mayor que cero.',
      );

      expect(montaje.manager.update).not.toHaveBeenCalled();
    });
  });

  describe('obtenerResumen', () => {
    it('no carga preguntas actuales para una evaluación aleatoria publicada', async () => {
      Object.defineProperty(montaje.servicio, 'consultar', {
        value: jest.fn().mockResolvedValue([
          {
            ...EXAMEN_BORRADOR,
            estado: 'publicado',
            modo_seleccion: 'aleatorio',
          },
        ]),
      });

      const resultado = await montaje.servicio.findOne(5, 7);

      expect(resultado.pregunta_ids).toEqual([]);
      expect(resultado.preguntas).toEqual([]);
      expect(montaje.examenPregunta.find).not.toHaveBeenCalled();
      expect(montaje.pregunta.createQueryBuilder).not.toHaveBeenCalled();
      expect(montaje.inciso.createQueryBuilder).not.toHaveBeenCalled();
    });

    function prepararCriterios(
      filas: {
        tema_id: number;
        cantidad: number;
        tema: { nombre_tema: string };
      }[] = [
        {
          tema_id: 1,
          cantidad: 2,
          tema: { nombre_tema: 'Algebra' },
        },
      ],
    ) {
      const criterios = queryBuilderMock();
      criterios.getMany.mockResolvedValue(filas);
      montaje.examenTema.createQueryBuilder.mockReturnValue(criterios);
      return criterios;
    }

    function prepararPreguntasAleatorias(
      preguntas: {
        pregunta_id: number;
        tema_id: number;
        enunciado: string;
        activo: boolean;
      }[],
      incisos: {
        pregunta_id: number;
        letra: string;
        puntaje_max: string;
      }[],
    ) {
      const consultaPreguntas = queryBuilderMock();
      consultaPreguntas.getMany.mockResolvedValue(preguntas);
      montaje.pregunta.createQueryBuilder.mockReturnValue(consultaPreguntas);

      const consultaIncisos = queryBuilderMock();
      consultaIncisos.getMany.mockResolvedValue(incisos);
      montaje.inciso.createQueryBuilder.mockReturnValue(consultaIncisos);
    }

    function prepararInstantanea(
      datos: {
        total: string;
        temas: {
          tema_id: number;
          cantidad_seleccionada: number;
          cantidad_candidatas: number;
          puntaje_maximo_tema: string;
        }[];
        preguntas: {
          pregunta_id: number;
          tema_id: number;
          puntaje_maximo_pregunta: string;
        }[];
        incisos?: {
          pregunta_id: number;
          tema_id: number;
          letra: string;
          puntaje_max: string;
        }[];
      },
    ) {
      montaje.snapshot.findOne.mockResolvedValue({
        examen_id: 5,
        version: 1,
        puntaje_maximo_garantizado: datos.total,
      });
      montaje.snapshotTema.find.mockResolvedValue(
        datos.temas.map((tema) => ({ examen_id: 5, ...tema })),
      );
      montaje.snapshotPregunta.find.mockResolvedValue(
        datos.preguntas.map((pregunta) => ({
          examen_id: 5,
          ...pregunta,
        })),
      );
      montaje.snapshotInciso.find.mockResolvedValue(
        (datos.incisos ?? []).map((inciso) => ({
          examen_id: 5,
          ...inciso,
        })),
      );
    }

    it('deriva el total y la distribucion por tema de las preguntas guardadas', async () => {
      prepararCriterios();
      jest.spyOn(montaje.servicio, 'findOne').mockResolvedValue({
        ...EXAMEN_BORRADOR,
        modo_seleccion: 'manual',
        paralelos: [],
        total_preguntas: 2,
        preguntas: [
          {
            pregunta_id: 1,
            enunciado: 'Pregunta con tres incisos',
            puntos: 12,
            total_incisos: 3,
            incisos_sin_puntaje: 0,
            tema: { tema_id: 1, nombre_tema: 'Algebra' },
          },
          {
            pregunta_id: 2,
            enunciado: 'Pregunta con dos incisos',
            puntos: 7.5,
            total_incisos: 2,
            incisos_sin_puntaje: 0,
            tema: { tema_id: 1, nombre_tema: 'Algebra' },
          },
        ],
        criterios: [],
      } as never);

      const resultado = await montaje.servicio.obtenerResumen(5, 7);

      expect(resultado.puntajes.origen).toBe('seleccion');
      expect(resultado.puntajes.disponible).toBe(true);
      expect(resultado.puntajes.puntaje_total).toBe(19.5);
      expect(resultado.puntajes.temas).toEqual([
        {
          tema_id: 1,
          nombre_tema: 'Algebra',
          cantidad_candidatas: 2,
          cantidad_seleccionada: 2,
          puntaje_maximo: 19.5,
          garantizado: true,
          motivo: null,
          detalle: null,
        },
      ]);
      expect(resultado.puntajes.preguntas).toEqual([
        expect.objectContaining({ pregunta_id: 1, puntaje_maximo: 12 }),
        expect.objectContaining({ pregunta_id: 2, puntaje_maximo: 7.5 }),
      ]);
      expect(resultado.preguntas[0].puntos).toBe(12);
      expect(resultado.preguntas[1].puntos).toBe(7.5);
      expect(resultado.puntajes.preguntas_sin_puntaje).toEqual([]);
      expect(resultado.criterios).toEqual([
        { tema_id: 1, nombre_tema: 'Algebra', cantidad: 2 },
      ]);
    });

    it('usa el puntaje propio de cada pregunta guardada en la evaluación', async () => {
      prepararCriterios();
      jest.spyOn(montaje.servicio, 'findOne').mockResolvedValue({
        ...EXAMEN_BORRADOR,
        modo_seleccion: 'manual',
        paralelos: [],
        total_preguntas: 2,
        preguntas: [
          {
            pregunta_id: 1,
            enunciado: 'Pregunta del banco de 12',
            puntos: 12,
            puntaje: 4,
            total_incisos: 3,
            incisos_sin_puntaje: 0,
            tema: { tema_id: 1, nombre_tema: 'Algebra' },
          },
          {
            pregunta_id: 2,
            enunciado: 'Pregunta del banco de 7.5',
            puntos: 7.5,
            puntaje: 10,
            total_incisos: 2,
            incisos_sin_puntaje: 0,
            tema: { tema_id: 1, nombre_tema: 'Algebra' },
          },
        ],
        criterios: [],
      } as never);

      const resultado = await montaje.servicio.obtenerResumen(5, 7);

      expect(resultado.puntajes.puntaje_total).toBe(14);
      expect(resultado.puntajes.temas[0].puntaje_maximo).toBe(14);
      expect(resultado.puntajes.preguntas).toEqual([
        expect.objectContaining({ pregunta_id: 1, puntaje_maximo: 4 }),
        expect.objectContaining({ pregunta_id: 2, puntaje_maximo: 10 }),
      ]);
    });

    it('garantiza el puntaje de un borrador aleatorio parcial uniforme', async () => {
      prepararCriterios([
        {
          tema_id: 1,
          cantidad: 1,
          tema: { nombre_tema: 'Algebra' },
        },
      ]);
      prepararPreguntasAleatorias(
        [
          {
            pregunta_id: 1,
            tema_id: 1,
            enunciado: 'Pregunta A',
            activo: true,
          },
          {
            pregunta_id: 2,
            tema_id: 1,
            enunciado: 'Pregunta B',
            activo: true,
          },
        ],
        [
          { pregunta_id: 1, letra: 'a', puntaje_max: '5' },
          { pregunta_id: 2, letra: 'a', puntaje_max: '5' },
        ],
      );
      jest.spyOn(montaje.servicio, 'findOne').mockResolvedValue({
        ...EXAMEN_BORRADOR,
        modo_seleccion: 'aleatorio',
        paralelos: [],
        total_preguntas: 1,
        preguntas: [],
        criterios: [],
      } as never);

      const resultado = await montaje.servicio.obtenerResumen(5, 7);

      expect(resultado.puntajes).toMatchObject({
        origen: 'calculo_previo',
        disponible: true,
        puntaje_total: 5,
        motivo: null,
      });
      expect(resultado.puntajes.temas).toEqual([
        {
          tema_id: 1,
          nombre_tema: 'Algebra',
          cantidad_candidatas: 2,
          cantidad_seleccionada: 1,
          puntaje_maximo: 5,
          garantizado: true,
          motivo: null,
          detalle: null,
        },
      ]);
      expect(resultado.puntajes.preguntas).toHaveLength(2);
      expect(resultado.total_preguntas).toBe(1);
    });

    it('suma todo el pool cuando el borrador aleatorio selecciona todas las candidatas', async () => {
      prepararCriterios([
        {
          tema_id: 1,
          cantidad: 2,
          tema: { nombre_tema: 'Algebra' },
        },
      ]);
      prepararPreguntasAleatorias(
        [
          {
            pregunta_id: 1,
            tema_id: 1,
            enunciado: 'Pregunta A',
            activo: true,
          },
          {
            pregunta_id: 2,
            tema_id: 1,
            enunciado: 'Pregunta B',
            activo: true,
          },
        ],
        [
          { pregunta_id: 1, letra: 'a', puntaje_max: '3' },
          { pregunta_id: 2, letra: 'a', puntaje_max: '7' },
        ],
      );
      jest.spyOn(montaje.servicio, 'findOne').mockResolvedValue({
        ...EXAMEN_BORRADOR,
        modo_seleccion: 'aleatorio',
        paralelos: [],
        total_preguntas: 2,
        preguntas: [],
        criterios: [],
      } as never);

      const resultado = await montaje.servicio.obtenerResumen(5, 7);

      expect(resultado.puntajes.disponible).toBe(true);
      expect(resultado.puntajes.puntaje_total).toBe(10);
      expect(resultado.puntajes.temas[0]).toMatchObject({
        cantidad_candidatas: 2,
        cantidad_seleccionada: 2,
        puntaje_maximo: 10,
        garantizado: true,
      });
    });

    it('no presenta total en una seleccion parcial con puntajes diferentes', async () => {
      prepararCriterios([
        {
          tema_id: 1,
          cantidad: 1,
          tema: { nombre_tema: 'Algebra' },
        },
      ]);
      prepararPreguntasAleatorias(
        [
          {
            pregunta_id: 1,
            tema_id: 1,
            enunciado: 'Pregunta A',
            activo: true,
          },
          {
            pregunta_id: 2,
            tema_id: 1,
            enunciado: 'Pregunta B',
            activo: true,
          },
        ],
        [
          { pregunta_id: 1, letra: 'a', puntaje_max: '3' },
          { pregunta_id: 2, letra: 'a', puntaje_max: '7' },
        ],
      );
      jest.spyOn(montaje.servicio, 'findOne').mockResolvedValue({
        ...EXAMEN_BORRADOR,
        modo_seleccion: 'aleatorio',
        paralelos: [],
        total_preguntas: 1,
        preguntas: [],
        criterios: [],
      } as never);

      const resultado = await montaje.servicio.obtenerResumen(5, 7);

      expect(resultado.puntajes.disponible).toBe(false);
      expect(resultado.puntajes.puntaje_total).toBeNull();
      expect(resultado.puntajes.motivo).toBe('puntajes_no_uniformes');
      expect(resultado.puntajes.detalle).toContain('puntajes máximos diferentes');
      expect(resultado.puntajes.temas[0]).toMatchObject({
        cantidad_candidatas: 2,
        cantidad_seleccionada: 1,
        puntaje_maximo: null,
        garantizado: false,
        motivo: 'puntajes_no_uniformes',
      });
    });

    it('lee los valores definitivos de la instantanea al estar publicada', async () => {
      prepararCriterios([
        {
          tema_id: 1,
          cantidad: 2,
          tema: { nombre_tema: 'Algebra' },
        },
      ]);
      prepararInstantanea({
        total: '20',
        temas: [
          {
            tema_id: 1,
            cantidad_seleccionada: 2,
            cantidad_candidatas: 3,
            puntaje_maximo_tema: '20',
          },
        ],
        preguntas: [
          {
            pregunta_id: 11,
            tema_id: 1,
            puntaje_maximo_pregunta: '10',
          },
          {
            pregunta_id: 12,
            tema_id: 1,
            puntaje_maximo_pregunta: '10',
          },
          {
            pregunta_id: 13,
            tema_id: 1,
            puntaje_maximo_pregunta: '10',
          },
        ],
        incisos: [
          {
            pregunta_id: 11,
            tema_id: 1,
            letra: 'a',
            puntaje_max: '10',
          },
        ],
      });
      jest.spyOn(montaje.servicio, 'findOne').mockResolvedValue({
        ...EXAMEN_BORRADOR,
        estado: 'publicado',
        modo_seleccion: 'aleatorio',
        paralelos: [],
        total_preguntas: 99,
        preguntas: [],
        criterios: [],
      } as never);

      const resultado = await montaje.servicio.obtenerResumen(5, 7);

      expect(resultado.puntajes).toMatchObject({
        origen: 'instantanea',
        disponible: true,
        puntaje_total: 20,
        motivo: null,
      });
      expect(resultado.puntajes.temas).toEqual([
        {
          tema_id: 1,
          nombre_tema: 'Algebra',
          cantidad_candidatas: 3,
          cantidad_seleccionada: 2,
          puntaje_maximo: 20,
          garantizado: true,
          motivo: null,
          detalle: null,
        },
      ]);
      expect(resultado.puntajes.preguntas).toHaveLength(3);
      expect(resultado.puntajes.preguntas[0]).toMatchObject({
        pregunta_id: 11,
        puntaje_maximo: 10,
        incisos: [{ letra: 'a', puntaje_max: 10 }],
      });
      expect(resultado.total_preguntas).toBe(2);
      expect(resultado.criterios).toEqual([
        { tema_id: 1, nombre_tema: 'Algebra', cantidad: 2 },
      ]);
      // No se consultan las preguntas activas para reconstruir la instantánea.
      expect(montaje.pregunta.createQueryBuilder).not.toHaveBeenCalled();
      expect(montaje.inciso.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('no recalcula el resumen publicado cuando cambian los datos de origen', async () => {
      prepararCriterios();
      prepararInstantanea({
        total: '18',
        temas: [
          {
            tema_id: 1,
            cantidad_seleccionada: 2,
            cantidad_candidatas: 2,
            puntaje_maximo_tema: '18',
          },
        ],
        preguntas: [
          {
            pregunta_id: 11,
            tema_id: 1,
            puntaje_maximo_pregunta: '9',
          },
          {
            pregunta_id: 12,
            tema_id: 1,
            puntaje_maximo_pregunta: '9',
          },
        ],
      });
      jest.spyOn(montaje.servicio, 'findOne').mockResolvedValue({
        ...EXAMEN_BORRADOR,
        estado: 'publicado',
        modo_seleccion: 'aleatorio',
        paralelos: [],
        total_preguntas: 2,
        // Simula que el origen cambió después de publicar.
        preguntas: [
          {
            pregunta_id: 11,
            enunciado: 'Pregunta modificada',
            puntos: 100,
            total_incisos: 1,
            incisos_sin_puntaje: 0,
            tema: { tema_id: 1, nombre_tema: 'Algebra' },
          },
        ],
        criterios: [],
      } as never);

      const resultado = await montaje.servicio.obtenerResumen(5, 7);

      expect(resultado.puntajes.puntaje_total).toBe(18);
      expect(resultado.puntajes.temas[0].puntaje_maximo).toBe(18);
      expect(resultado.puntajes.preguntas).toEqual([
        expect.objectContaining({ pregunta_id: 11, puntaje_maximo: 9 }),
        expect.objectContaining({ pregunta_id: 12, puntaje_maximo: 9 }),
      ]);
    });

    it('no inventa un total publicado si falta la instantanea', async () => {
      prepararCriterios();
      montaje.snapshot.findOne.mockResolvedValue(null);
      jest.spyOn(montaje.servicio, 'findOne').mockResolvedValue({
        ...EXAMEN_BORRADOR,
        estado: 'publicado',
        modo_seleccion: 'aleatorio',
        paralelos: [],
        total_preguntas: 0,
        preguntas: [],
        criterios: [],
      } as never);

      const resultado = await montaje.servicio.obtenerResumen(5, 7);

      expect(resultado.puntajes).toMatchObject({
        origen: 'instantanea',
        disponible: false,
        puntaje_total: null,
        motivo: 'sin_instantanea',
      });
      expect(resultado.puntajes.temas).toEqual([]);
    });
  });

  describe('update', () => {
    function prepararEdicion(
      overrides: Partial<{
        examen: Record<string, unknown>;
        materiaId: number;
        paraleloId: number;
      }> = {},
    ) {
      const examen = {
        ...EXAMEN_BORRADOR,
        titulo: 'Parcial',
        instrucciones: null,
        modo_seleccion: 'manual',
        paralelos: [{ paralelo_id: 10 }],
        ...overrides.examen,
      };

      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(examen);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);
      montaje.examen.findOne.mockResolvedValue(examen);

      const materiaId = overrides.materiaId ?? 1;
      const paraleloId = overrides.paraleloId ?? 10;

      montaje.materia.findOne.mockResolvedValue({
        materia_id: materiaId,
        docente_id: 7,
      });
      montaje.semestre.findOne.mockResolvedValue({
        semestre_id: 2,
        docente_id: 7,
        materias: [{ materia_id: materiaId }],
      });
      montaje.paralelo.findOne.mockResolvedValue({
        paralelo_id: paraleloId,
        docente_id: 7,
        materia_id: materiaId,
        semestre_id: 2,
      });

      jest
        .spyOn(montaje.servicio, 'findOne')
        .mockResolvedValue({ examen_id: 5 } as never);

      return { bloqueo };
    }

    it('no reinicia la asignación si solo cambian título o instrucciones', async () => {
      const { bloqueo } = prepararEdicion();

      const resultado = await montaje.servicio.update(
        5,
        { titulo: 'Parcial actualizado', instrucciones: 'Nuevas' },
        7,
      );

      expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(bloqueo.andWhere).toHaveBeenCalledWith(
        'examen.docente_id = :docenteId',
        { docenteId: 7 },
      );
      expect(montaje.manager.delete).not.toHaveBeenCalled();
      expect(montaje.manager.insert).not.toHaveBeenCalled();
      expect(montaje.manager.update).toHaveBeenCalledTimes(1);
      expect(resultado.criterios_reiniciados).toBe(false);
    });

    it('reinicia la asignación al cambiar la materia y borra los criterios', async () => {
      prepararEdicion({ materiaId: 3 });

      const resultado = await montaje.servicio.update(5, { materia_id: 3 }, 7);

      expect(montaje.manager.delete).toHaveBeenCalledWith(ParaleloExamen, {
        examen_id: 5,
      });
      expect(montaje.manager.insert).toHaveBeenCalledWith(ParaleloExamen, {
        paralelo_id: 10,
        examen_id: 5,
      });
      expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenEstudiante, {
        examen_id: 5,
      });
      expect(montaje.manager.update).toHaveBeenCalledWith(
        Examen,
        { examen_id: 5 },
        { modo_asignacion: 'paralelos' },
      );
      expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenTema, {
        examen_id: 5,
      });
      expect(resultado.criterios_reiniciados).toBe(true);
    });

    it('reinicia la asignación al elegir un paralelo que no estaba asociado', async () => {
      prepararEdicion({ paraleloId: 11 });

      const resultado = await montaje.servicio.update(5, { paralelo_id: 11 }, 7);

      expect(montaje.manager.delete).toHaveBeenCalledWith(ParaleloExamen, {
        examen_id: 5,
      });
      expect(montaje.manager.insert).toHaveBeenCalledWith(ParaleloExamen, {
        paralelo_id: 11,
        examen_id: 5,
      });
      expect(montaje.manager.delete).toHaveBeenCalledWith(ExamenEstudiante, {
        examen_id: 5,
      });
      expect(montaje.manager.delete).not.toHaveBeenCalledWith(ExamenTema, {
        examen_id: 5,
      });
      expect(resultado.criterios_reiniciados).toBe(false);
    });

    it('rechaza editar una evaluación publicada dentro de la transacción', async () => {
      const { bloqueo } = prepararEdicion({
        examen: { estado: 'publicado' },
      });

      await expect(
        montaje.servicio.update(5, { titulo: 'Nuevo' }, 7),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(bloqueo.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });

    it('rechaza una evaluación inexistente o de otro docente', async () => {
      const bloqueo = queryBuilderMock();
      bloqueo.getOne.mockResolvedValue(null);
      montaje.examen.createQueryBuilder.mockReturnValue(bloqueo);

      await expect(
        montaje.servicio.update(5, { titulo: 'Nuevo' }, 99),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(montaje.examen.findOne).not.toHaveBeenCalled();
      expect(montaje.manager.update).not.toHaveBeenCalled();
    });
  });
});
