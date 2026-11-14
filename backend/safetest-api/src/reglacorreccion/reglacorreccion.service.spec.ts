import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';

import type { CrearReglaCorreccionDto } from './dto/crear-regla-correccion.dto';
import type { ReglaCorreccion } from './entity/reglacorreccion.entity';

/**
 * La entidad real arrastra ciclos entre módulos de TypeORM. El servicio solo
 * la usa como token de repositorio, así que se sustituye por una clase vacía.
 */
let ReglaCorreccionService: typeof import('./reglacorreccion.service').ReglaCorreccionService;

beforeAll(async () => {
  jest.unstable_mockModule('./entity/reglacorreccion.entity', () => ({
    ReglaCorreccion: class ReglaCorreccion {},
  }));

  ({ ReglaCorreccionService } = await import('./reglacorreccion.service'));
});

interface RepoMock {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
}

function repoMock(): RepoMock {
  return {
    create: jest.fn((datos: unknown) => datos),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
}

function regla(overrides: Partial<ReglaCorreccion> = {}): ReglaCorreccion {
  return {
    regla_id: 1,
    docente_id: 7,
    tipo_respuesta: 'opcion_unica',
    parametros: {},
    activo: true,
    creado_en: new Date('2026-01-01T00:00:00.000Z'),
    actualizado_en: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  } as ReglaCorreccion;
}

function montar() {
  const repo = repoMock();
  const servicio = new ReglaCorreccionService(
    repo as unknown as Repository<ReglaCorreccion>,
  );

  return { repo, servicio };
}

interface RepoEnMemoria extends RepoMock {
  filas: ReglaCorreccion[];
}

/**
 * Repositorio en memoria con las operaciones que usa el servicio.
 *
 * Permite comprobar que lo creado y actualizado se recupera en consultas
 * posteriores sin escribir en PostgreSQL ni depender de una base de datos.
 */
function repoEnMemoria(): RepoEnMemoria {
  const filas: ReglaCorreccion[] = [];
  let siguienteId = 1;

  return {
    filas,
    create: jest.fn(
      (datos: Partial<ReglaCorreccion>) => ({ ...datos }) as ReglaCorreccion,
    ),
    save: jest.fn(async (entidad: ReglaCorreccion) => {
      const duplicada = filas.some(
        (fila) =>
          fila.docente_id === entidad.docente_id &&
          fila.tipo_respuesta === entidad.tipo_respuesta &&
          fila.regla_id !== entidad.regla_id,
      );

      if (duplicada) {
        throw { code: '23505' };
      }

      if (entidad.regla_id === undefined) {
        entidad.regla_id = siguienteId;
        siguienteId += 1;
        entidad.creado_en = new Date('2026-03-01T00:00:00.000Z');
        filas.push(entidad);
      }

      entidad.actualizado_en = new Date('2026-03-02T00:00:00.000Z');

      return entidad;
    }),
    find: jest.fn(async (opciones: { where: { docente_id: number } }) =>
      filas
        .filter((fila) => fila.docente_id === opciones.where.docente_id)
        .sort((a, b) => a.tipo_respuesta.localeCompare(b.tipo_respuesta)),
    ),
    findOne: jest.fn(
      async (opciones: {
        where: { regla_id: number; docente_id: number };
      }) =>
        filas.find(
          (fila) =>
            fila.regla_id === opciones.where.regla_id &&
            fila.docente_id === opciones.where.docente_id,
        ) ?? null,
    ),
  };
}

function montarEnMemoria() {
  const repo = repoEnMemoria();
  const servicio = new ReglaCorreccionService(
    repo as unknown as Repository<ReglaCorreccion>,
  );

  return { repo, servicio };
}

describe('ReglaCorreccionService', () => {
  describe('crear', () => {
    it('guarda la regla con el docente recibido y la configuración validada', async () => {
      const { repo, servicio } = montar();
      const dto: CrearReglaCorreccionDto = {
        tipo_respuesta: 'opcion_multiple',
        parametros: {
          estrategia: 'automatica',
          puntaje_parcial: true,
        },
      };

      repo.save.mockImplementation(async (datos: ReglaCorreccion) => ({
        ...datos,
        regla_id: 10,
        creado_en: new Date('2026-02-01T00:00:00.000Z'),
        actualizado_en: new Date('2026-02-01T00:00:00.000Z'),
      }));

      await expect(servicio.crear(7, dto)).resolves.toMatchObject({
        regla_id: 10,
        tipo_respuesta: 'opcion_multiple',
        parametros: {
          estrategia: 'automatica',
          puntaje_parcial: true,
        },
        activo: true,
      });

      expect(repo.create).toHaveBeenCalledWith({
        docente_id: 7,
        tipo_respuesta: 'opcion_multiple',
        parametros: {
          estrategia: 'automatica',
          puntaje_parcial: true,
        },
        activo: true,
      });
    });

    it('ignora un docente_id enviado por el cliente', async () => {
      const { repo, servicio } = montar();
      const dto = {
        tipo_respuesta: 'opcion_unica',
        parametros: {},
        docente_id: 99,
      } as CrearReglaCorreccionDto;

      repo.save.mockImplementation(async (datos: ReglaCorreccion) => datos);

      await servicio.crear(7, dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ docente_id: 7 }),
      );
    });

    it('responde 409 cuando ya existe una regla del mismo tipo', async () => {
      const { repo, servicio } = montar();

      repo.save.mockRejectedValue({ code: '23505' });

      await expect(
        servicio.crear(7, {
          tipo_respuesta: 'numerica',
          parametros: {},
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('también detecta la violación de unicidad en driverError', async () => {
      const { repo, servicio } = montar();

      repo.save.mockRejectedValue({ driverError: { code: '23505' } });

      await expect(
        servicio.crear(7, {
          tipo_respuesta: 'numerica',
          parametros: {},
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza parámetros inválidos sin escribir en la base', async () => {
      const { repo, servicio } = montar();

      await expect(
        servicio.crear(7, {
          tipo_respuesta: 'desarrollo',
          parametros: { estrategia: 'automatica' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('propaga errores de base que no son de unicidad', async () => {
      const { repo, servicio } = montar();
      const error = new Error('conexión perdida');

      repo.save.mockRejectedValue(error);

      await expect(
        servicio.crear(7, {
          tipo_respuesta: 'opcion_unica',
          parametros: {},
        }),
      ).rejects.toBe(error);
    });
  });

  describe('listar', () => {
    it('solo consulta las reglas del docente autenticado', async () => {
      const { repo, servicio } = montar();
      const reglas = [
        regla({ regla_id: 1, tipo_respuesta: 'numerica' }),
        regla({ regla_id: 2, tipo_respuesta: 'opcion_unica' }),
      ];
      repo.find.mockResolvedValue(reglas);

      const resultado = await servicio.listar(7);

      expect(repo.find).toHaveBeenCalledWith({
        where: { docente_id: 7 },
        order: { tipo_respuesta: 'ASC' },
      });
      expect(resultado).toHaveLength(2);
      expect(resultado[0]).not.toHaveProperty('docente_id');
      expect(resultado[0]).not.toHaveProperty('docente');
    });
  });

  describe('obtener', () => {
    it('busca por regla_id y docente_id para aislar a otros docentes', async () => {
      const { repo, servicio } = montar();
      repo.findOne.mockResolvedValue(regla({ regla_id: 5 }));

      await servicio.obtener(7, 5);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { regla_id: 5, docente_id: 7 },
      });
    });

    it('responde 404 cuando la regla pertenece a otro docente', async () => {
      const { repo, servicio } = montar();
      repo.findOne.mockResolvedValue(null);

      await expect(servicio.obtener(8, 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza una regla propia y valida la configuración final', async () => {
      const { repo, servicio } = montar();
      const existente = regla({
        regla_id: 3,
        tipo_respuesta: 'opcion_multiple',
        parametros: { estrategia: 'automatica' },
      });
      repo.findOne.mockResolvedValue(existente);
      repo.save.mockImplementation(async (datos: ReglaCorreccion) => datos);

      const resultado = await servicio.actualizar(7, 3, {
        parametros: { puntaje_parcial: true },
        activo: false,
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { regla_id: 3, docente_id: 7 },
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          regla_id: 3,
          tipo_respuesta: 'opcion_multiple',
          parametros: { puntaje_parcial: true },
          activo: false,
        }),
      );
      expect(resultado.parametros).toEqual({ puntaje_parcial: true });
      expect(resultado.activo).toBe(false);
    });

    it('valida los parámetros existentes al cambiar de tipo', async () => {
      const { repo, servicio } = montar();
      repo.findOne.mockResolvedValue(
        regla({ tipo_respuesta: 'opcion_unica', parametros: {} }),
      );

      await expect(
        servicio.actualizar(7, 1, { tipo_respuesta: 'desarrollo' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('permite cambiar a desarrollo si se envía la configuración manual', async () => {
      const { repo, servicio } = montar();
      repo.findOne.mockResolvedValue(
        regla({ tipo_respuesta: 'opcion_unica', parametros: {} }),
      );
      repo.save.mockImplementation(async (datos: ReglaCorreccion) => datos);

      const resultado = await servicio.actualizar(7, 1, {
        tipo_respuesta: 'desarrollo',
        parametros: { estrategia: 'manual_rubrica' },
      });

      expect(resultado.tipo_respuesta).toBe('desarrollo');
      expect(resultado.parametros).toEqual({
        estrategia: 'manual_rubrica',
      });
    });

    it('responde 404 si la regla no pertenece al docente', async () => {
      const { repo, servicio } = montar();
      repo.findOne.mockResolvedValue(null);

      await expect(
        servicio.actualizar(8, 1, { activo: false }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('responde 409 si el nuevo tipo ya tiene otra regla', async () => {
      const { repo, servicio } = montar();
      repo.findOne.mockResolvedValue(
        regla({ tipo_respuesta: 'numerica', parametros: {} }),
      );
      repo.save.mockRejectedValue({ code: '23505' });

      await expect(
        servicio.actualizar(7, 1, {
          tipo_respuesta: 'opcion_unica',
          parametros: {},
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza una actualización vacía antes de consultar', async () => {
      const { repo, servicio } = montar();

      await expect(servicio.actualizar(7, 1, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('ignora un docente_id enviado dentro del cuerpo', async () => {
      const { repo, servicio } = montar();
      repo.findOne.mockResolvedValue(regla({ regla_id: 1 }));
      repo.save.mockImplementation(async (datos: ReglaCorreccion) => datos);

      await servicio.actualizar(7, 1, {
        activo: false,
        docente_id: 99,
      } as unknown as { activo: boolean });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { regla_id: 1, docente_id: 7 },
      });
    });
  });

  describe('persistencia del docente autenticado', () => {
    it('recupera en consultas posteriores las reglas creadas', async () => {
      const { servicio } = montarEnMemoria();

      await servicio.crear(7, {
        tipo_respuesta: 'opcion_unica',
        parametros: { estrategia: 'automatica' },
      });
      await servicio.crear(7, {
        tipo_respuesta: 'numerica',
        parametros: { estrategia: 'automatica', redondeo_decimales: 2 },
      });

      const reglas = await servicio.listar(7);

      expect(reglas.map((fila) => fila.tipo_respuesta)).toEqual([
        'numerica',
        'opcion_unica',
      ]);
      expect(reglas[0].parametros).toEqual({
        estrategia: 'automatica',
        redondeo_decimales: 2,
      });
      expect(reglas[0]).not.toHaveProperty('docente_id');
      expect(reglas[0]).not.toHaveProperty('docente');
    });

    it('refleja los cambios de una actualización en la siguiente consulta', async () => {
      const { servicio } = montarEnMemoria();

      const creada = await servicio.crear(7, {
        tipo_respuesta: 'opcion_multiple',
        parametros: { estrategia: 'automatica', puntaje_parcial: false },
      });

      const actualizada = await servicio.actualizar(7, creada.regla_id, {
        parametros: { puntaje_parcial: true, penalizar_incorrectas: true },
        activo: false,
      });

      expect(actualizada.parametros).toEqual({
        puntaje_parcial: true,
        penalizar_incorrectas: true,
      });
      expect(actualizada.activo).toBe(false);
      expect(actualizada.creado_en).toEqual(creada.creado_en);

      const [recuperada] = await servicio.listar(7);

      expect(recuperada).toMatchObject({
        regla_id: creada.regla_id,
        tipo_respuesta: 'opcion_multiple',
        activo: false,
        parametros: {
          puntaje_parcial: true,
          penalizar_incorrectas: true,
        },
      });

      await expect(
        servicio.obtener(7, creada.regla_id),
      ).resolves.toMatchObject({
        activo: false,
        parametros: {
          puntaje_parcial: true,
          penalizar_incorrectas: true,
        },
      });
    });

    it('no expone ni modifica las reglas de otro docente', async () => {
      const { servicio } = montarEnMemoria();

      const creada = await servicio.crear(7, {
        tipo_respuesta: 'verdadero_falso',
        parametros: {},
      });

      await expect(servicio.listar(8)).resolves.toEqual([]);
      await expect(
        servicio.actualizar(8, creada.regla_id, { activo: false }),
      ).rejects.toBeInstanceOf(NotFoundException);

      const [propia] = await servicio.listar(7);

      expect(propia.activo).toBe(true);
      expect(propia.parametros).toEqual({});
    });

    it('impide duplicar el tipo de regla del mismo docente', async () => {
      const { servicio } = montarEnMemoria();
      const dto: CrearReglaCorreccionDto = {
        tipo_respuesta: 'desarrollo',
        parametros: { estrategia: 'manual_rubrica' },
      };

      await servicio.crear(7, dto);

      await expect(servicio.crear(7, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );

      // Otro docente sí puede configurar el mismo tipo.
      await expect(servicio.crear(8, dto)).resolves.toMatchObject({
        tipo_respuesta: 'desarrollo',
      });
    });
  });
});
