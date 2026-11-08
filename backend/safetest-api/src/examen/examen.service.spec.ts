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
  execute: jest.Mock;
}

function queryBuilderMock(): QueryBuilderMock {
  const qb = {
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
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
