import 'reflect-metadata';

import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import { cargarConfiguracionIa, type IaConfig } from '../config/ia.config';
import type { IaGeneracionMaterial } from '../iageneracionmaterial/entity/iageneracionmaterial.entity';
import type { IaPropuestaPregunta } from '../iapropuestapregunta/entity/iapropuestapregunta.entity';
import type { MaterialAcademico } from '../materialacademico/entity/materialacademico.entity';
import type { Materia } from '../materia/entity/materia.entity';
import type { CreatePreguntaDto } from '../pregunta/entity/dtos/create-pregunta.dto';
import type { OrigenPregunta } from '../pregunta/pregunta.service';
import type { Tema } from '../tema/entity/tema.entity';
import type { IaGeneracion } from './entity/iageneracion.entity';
import { MAX_LONGITUD_MENSAJE_ERROR } from './iageneracion.errores';

/**
 * Las entidades reales forman ciclos que, bajo ESM, fallan al evaluar
 * `design:type` (TDZ). El servicio solo las usa como tokens de TypeORM, así
 * que se sustituyen por clases vacías antes de importarlo.
 */
let IaGeneracionService: typeof import('./iageneracion.service').IaGeneracionService;
let PreguntaService: typeof import('../pregunta/pregunta.service').PreguntaService;

/**
 * `tsc` con `module: nodenext` exige extensión explícita en los `import()`
 * dinámicos, pero Jest resuelve las rutas de TypeScript sin extensión. Se
 * declaran como `string` para que el compilador no aplique la resolución ESM y
 * se conserva el tipo real del módulo con `typeof import(...)`.
 */
const RUTA_IA_GENERACION_SERVICE: string = './iageneracion.service';
const RUTA_PREGUNTA_SERVICE: string = '../pregunta/pregunta.service';

beforeAll(async () => {
  jest.unstable_mockModule('./entity/iageneracion.entity', () => ({
    IaGeneracion: class IaGeneracion {},
  }));
  jest.unstable_mockModule(
    '../iageneracionmaterial/entity/iageneracionmaterial.entity',
    () => ({ IaGeneracionMaterial: class IaGeneracionMaterial {} }),
  );
  jest.unstable_mockModule(
    '../iapropuestapregunta/entity/iapropuestapregunta.entity',
    () => ({ IaPropuestaPregunta: class IaPropuestaPregunta {} }),
  );
  jest.unstable_mockModule(
    '../materialacademico/entity/materialacademico.entity',
    () => ({ MaterialAcademico: class MaterialAcademico {} }),
  );
  jest.unstable_mockModule('../materia/entity/materia.entity', () => ({
    Materia: class Materia {},
  }));
  jest.unstable_mockModule('../tema/entity/tema.entity', () => ({
    Tema: class Tema {},
  }));
  jest.unstable_mockModule('../pregunta/pregunta.service', () => ({
    PreguntaService: class PreguntaService {},
  }));

  ({ PreguntaService } = (await import(
    RUTA_PREGUNTA_SERVICE
  )) as typeof import('../pregunta/pregunta.service'));
  ({ IaGeneracionService } = (await import(
    RUTA_IA_GENERACION_SERVICE
  )) as typeof import('./iageneracion.service'));
});

type RespuestaActualizacion = { affected: number | null };

interface QueryBuilderMock {
  update: jest.Mock<(...args: unknown[]) => QueryBuilderMock>;
  set: jest.Mock<(...args: unknown[]) => QueryBuilderMock>;
  where: jest.Mock<(...args: unknown[]) => QueryBuilderMock>;
  andWhere: jest.Mock<(...args: unknown[]) => QueryBuilderMock>;
  execute: jest.Mock<
    (...args: unknown[]) => Promise<RespuestaActualizacion>
  >;
}

/**
 * Vistas parciales de las entidades usadas como datos de prueba. Las relaciones
 * también se declaran parciales porque cada mock reproduce solo los campos que
 * el servicio consume en ese escenario.
 */
type MateriaParcial = Partial<Materia>;
type TemaParcial = Partial<Tema>;
type MaterialParcial = Partial<MaterialAcademico>;
type PropuestaParcial = Partial<IaPropuestaPregunta>;

interface GeneracionMaterialParcial
  extends Partial<Omit<IaGeneracionMaterial, 'material'>> {
  material?: MaterialParcial;
}

interface GeneracionParcial
  extends Partial<
    Omit<IaGeneracion, 'materia' | 'tema' | 'materiales' | 'propuestas'>
  > {
  materia?: MateriaParcial;
  tema?: TemaParcial | null;
  materiales?: GeneracionMaterialParcial[];
  propuestas?: PropuestaParcial[];
}

interface RepoMock<T> {
  find: jest.Mock<(...args: unknown[]) => Promise<T[]>>;
  findOne: jest.Mock<(...args: unknown[]) => Promise<T | null>>;
  findOneBy: jest.Mock<(...args: unknown[]) => Promise<T | null>>;
  create: jest.Mock<(datos: T) => T>;
  update: jest.Mock<
    (...args: unknown[]) => Promise<RespuestaActualizacion>
  >;
  createQueryBuilder: jest.Mock<(...args: unknown[]) => QueryBuilderMock>;
}

function repoMock<T>(): RepoMock<T> {
  return {
    find: jest.fn<(...args: unknown[]) => Promise<T[]>>(),
    findOne: jest.fn<(...args: unknown[]) => Promise<T | null>>(),
    findOneBy: jest.fn<(...args: unknown[]) => Promise<T | null>>(),
    create: jest.fn((datos: T) => datos),
    update: jest.fn<
      (...args: unknown[]) => Promise<RespuestaActualizacion>
    >(),
    createQueryBuilder: jest.fn<
      (...args: unknown[]) => QueryBuilderMock
    >(),
  };
}

function queryBuilder(resultado: RespuestaActualizacion): QueryBuilderMock {
  const qb: QueryBuilderMock = {
    update: jest.fn<(...args: unknown[]) => QueryBuilderMock>(() => qb),
    set: jest.fn<(...args: unknown[]) => QueryBuilderMock>(() => qb),
    where: jest.fn<(...args: unknown[]) => QueryBuilderMock>(() => qb),
    andWhere: jest.fn<(...args: unknown[]) => QueryBuilderMock>(() => qb),
    execute: jest.fn<
      (...args: unknown[]) => Promise<RespuestaActualizacion>
    >(async () => resultado),
  };

  return qb;
}

interface PreguntaGeneradaMock {
  pregunta_id: number;
  materia_id: number;
  tema_id: number;
}

interface PreguntaServiceMock {
  crearEnTransaccion: jest.Mock<
    (
      manager: object,
      dto: CreatePreguntaDto,
      docenteId: number,
      origen: OrigenPregunta,
    ) => Promise<PreguntaGeneradaMock>
  >;
}

type TransactionCallback = (manager: object) => unknown;

interface DataSourceMock {
  transaction: jest.Mock<
    (callback: TransactionCallback) => Promise<unknown>
  >;
}

function montarServicio(configuracion: Partial<IaConfig> = {}) {
  const generacion = repoMock<GeneracionParcial>();
  const generacionMaterial = repoMock<GeneracionMaterialParcial>();
  const propuesta = repoMock<PropuestaParcial>();
  const material = repoMock<MaterialParcial>();
  const materia = repoMock<MateriaParcial>();
  const tema = repoMock<TemaParcial>();
  const dataSource: DataSourceMock = {
    transaction: jest.fn<
      (callback: TransactionCallback) => Promise<unknown>
    >(),
  };
  const preguntaService: PreguntaServiceMock = {
    crearEnTransaccion: jest.fn<
      (
        manager: object,
        dto: CreatePreguntaDto,
        docenteId: number,
        origen: OrigenPregunta,
      ) => Promise<PreguntaGeneradaMock>
    >(),
  };

  const servicio = new IaGeneracionService(
    generacion as unknown as Repository<IaGeneracion>,
    generacionMaterial as unknown as Repository<IaGeneracionMaterial>,
    propuesta as unknown as Repository<IaPropuestaPregunta>,
    material as unknown as Repository<MaterialAcademico>,
    materia as unknown as Repository<Materia>,
    tema as unknown as Repository<Tema>,
    { ...cargarConfiguracionIa({ IA_PROVIDER: 'fake' }), ...configuracion },
    dataSource as unknown as DataSource,
    preguntaService as unknown as InstanceType<typeof PreguntaService>,
  );

  return {
    servicio,
    generacion,
    generacionMaterial,
    propuesta,
    material,
    materia,
    tema,
    dataSource,
    preguntaService,
  };
}

const ENTRADA_BASE = {
  materia_id: 1,
  tema_id: 2,
  tipo_respuesta: 'opcion_unica' as const,
  cantidad: 2,
  dificultad: 'media' as const,
};

describe('IaGeneracionService', () => {
  describe('crear', () => {
    it('crea la generación en estado pendiente y guarda sus materiales', async () => {
      const { servicio, generacion, materia, tema, material, dataSource } =
        montarServicio();

      materia.findOneBy.mockResolvedValue({
        materia_id: 1,
        docente_id: 7,
        activo: true,
      });
      tema.findOneBy.mockResolvedValue({
        tema_id: 2,
        materia_id: 1,
        nombre_tema: 'Derivadas',
      });
      material.find.mockResolvedValue([
        {
          material_id: 5,
          activo: true,
          autorizado_ia: true,
          texto_extraido: 'Contenido del material',
        },
      ]);

      const manager = {
        save: jest.fn(async (_entidad: unknown, datos: object) => ({
          ...datos,
          generacion_id: 9,
        })),
        insert: jest.fn<
          (...args: unknown[]) => Promise<void>
        >().mockResolvedValue(undefined),
      };
      dataSource.transaction.mockImplementation(async (callback) =>
        callback(manager),
      );

      const resultado = await servicio.crear(7, {
        ...ENTRADA_BASE,
        material_ids: [5],
      });

      expect(resultado).toEqual({ generacion_id: 9, estado: 'pendiente' });
      expect(generacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          docente_id: 7,
          materia_id: 1,
          tema_id: 2,
          estado: 'pendiente',
        }),
      );
      expect(manager.insert).toHaveBeenCalledWith(expect.any(Function), [
        { generacion_id: 9, material_id: 5 },
      ]);
    });

    it.each(['facil', 'media', 'dificil'] as const)(
      'persiste la dificultad %s elegida por el docente',
      async (dificultad) => {
        const { servicio, generacion, materia, tema, material, dataSource } =
          montarServicio();

        materia.findOneBy.mockResolvedValue({
          materia_id: 1,
          docente_id: 7,
          activo: true,
        });
        tema.findOneBy.mockResolvedValue({
          tema_id: 2,
          materia_id: 1,
          nombre_tema: 'Derivadas',
        });
        material.find.mockResolvedValue([
          {
            material_id: 5,
            activo: true,
            autorizado_ia: true,
            texto_extraido: 'Contenido del material',
          },
        ]);

        const manager = {
          save: jest.fn(async (_entidad: unknown, datos: object) => ({
            ...datos,
            generacion_id: 9,
          })),
          insert: jest.fn<
            (...args: unknown[]) => Promise<void>
          >().mockResolvedValue(undefined),
        };
        dataSource.transaction.mockImplementation(async (callback) =>
          callback(manager),
        );

        await servicio.crear(7, {
          ...ENTRADA_BASE,
          dificultad,
          material_ids: [5],
        });

        expect(generacion.create).toHaveBeenCalledWith(
          expect.objectContaining({ dificultad }),
        );
      },
    );

    it('rechaza una dificultad desconocida antes de consultar la base', async () => {
      const { servicio, materia } = montarServicio();

      await expect(
        servicio.crear(7, {
          ...ENTRADA_BASE,
          dificultad: 'extrema' as never,
          material_ids: [5],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(materia.findOneBy).not.toHaveBeenCalled();
    });

    it('rechaza una cantidad fuera de rango antes de consultar la base', async () => {
      const { servicio, materia } = montarServicio();

      await expect(
        servicio.crear(7, { ...ENTRADA_BASE, cantidad: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(materia.findOneBy).not.toHaveBeenCalled();
    });

    it('rechaza generar sin material documental', async () => {
      const { servicio, materia } = montarServicio();

      await expect(servicio.crear(7, ENTRADA_BASE)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(materia.findOneBy).not.toHaveBeenCalled();
    });

    it('rechaza más materiales que IA_MAX_MATERIALES', async () => {
      const { servicio, materia, tema } = montarServicio({ maxMateriales: 1 });

      materia.findOneBy.mockResolvedValue({ materia_id: 1, activo: true });
      tema.findOneBy.mockResolvedValue({ tema_id: 2, materia_id: 1 });

      await expect(
        servicio.crear(7, { ...ENTRADA_BASE, material_ids: [1, 2] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza materiales sin autorización vigente para IA', async () => {
      const { servicio, materia, tema, material } = montarServicio();

      materia.findOneBy.mockResolvedValue({ materia_id: 1, activo: true });
      tema.findOneBy.mockResolvedValue({ tema_id: 2, materia_id: 1 });
      material.find.mockResolvedValue([
        {
          material_id: 5,
          activo: true,
          autorizado_ia: false,
          texto_extraido: 'Contenido',
        },
      ]);

      await expect(
        servicio.crear(7, { ...ENTRADA_BASE, material_ids: [5] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza materiales que no pertenecen al docente', async () => {
      const { servicio, materia, tema, material } = montarServicio();

      materia.findOneBy.mockResolvedValue({ materia_id: 1, activo: true });
      tema.findOneBy.mockResolvedValue({ tema_id: 2, materia_id: 1 });
      material.find.mockResolvedValue([]);

      await expect(
        servicio.crear(7, { ...ENTRADA_BASE, material_ids: [99] }),
      ).rejects.toBeInstanceOf(BadRequestException);

      const [consulta] = material.find.mock.calls[0] as [
        { where: { docente_id: number } },
      ];

      expect(consulta.where.docente_id).toBe(7);
      expect(materia.findOneBy).toHaveBeenCalledWith(
        expect.objectContaining({ docente_id: 7, activo: true }),
      );
    });
  });

  describe('reclamar', () => {
    it('devuelve true solo cuando actualiza una generación pendiente', async () => {
      const { servicio, generacion } = montarServicio();
      const qb = queryBuilder({ affected: 1 });
      generacion.createQueryBuilder.mockReturnValue(qb);

      expect(await servicio.reclamar(5, new Date())).toBe(true);
      expect(qb.andWhere).toHaveBeenCalledWith('estado = :estado', {
        estado: 'pendiente',
      });
    });

    it('devuelve false si otra ejecución ya la tomó', async () => {
      const { servicio, generacion } = montarServicio();
      generacion.createQueryBuilder.mockReturnValue(
        queryBuilder({ affected: 0 }),
      );

      expect(await servicio.reclamar(5, new Date())).toBe(false);
    });
  });

  describe('cargarContexto', () => {
    it('detiene la generación si un material perdió la autorización', async () => {
      const { servicio, generacion, generacionMaterial } = montarServicio();

      generacion.findOne.mockResolvedValue({
        generacion_id: 1,
        docente_id: 7,
        materia_id: 1,
        materia: { nombre: 'Matemática' },
        tema: { nombre_tema: 'Derivadas' },
        tipo_respuesta: 'numerica',
        dificultad: 'facil',
        cantidad: 2,
      });

      generacionMaterial.find.mockResolvedValue([
        {
          material: {
            material_id: 1,
            docente_id: 7,
            titulo: 'A',
            texto_extraido: 'a'.repeat(10),
            activo: true,
            autorizado_ia: true,
          },
        },
        {
          material: {
            material_id: 2,
            docente_id: 7,
            titulo: 'Revocado',
            texto_extraido: 'secreto',
            activo: true,
            autorizado_ia: false,
          },
        },
      ]);

      await expect(servicio.cargarContexto(1)).rejects.toMatchObject({
        motivo: 'materiales_no_disponibles',
        reintentable: false,
      });
    });

    it('respeta los límites configurados cuando todo está autorizado', async () => {
      const { servicio, generacion, generacionMaterial } = montarServicio({
        maxMateriales: 2,
        maxCaracteresTotales: 12,
      });

      generacion.findOne.mockResolvedValue({
        generacion_id: 1,
        docente_id: 7,
        materia_id: 1,
        materia: { nombre: 'Matemática' },
        tema: { nombre_tema: 'Derivadas' },
        tipo_respuesta: 'numerica',
        dificultad: 'facil',
        cantidad: 2,
      });

      generacionMaterial.find.mockResolvedValue([
        {
          material: {
            material_id: 1,
            docente_id: 7,
            titulo: 'A',
            texto_extraido: 'a'.repeat(10),
            activo: true,
            autorizado_ia: true,
          },
        },
        {
          material: {
            material_id: 3,
            docente_id: 7,
            titulo: 'C',
            texto_extraido: 'c'.repeat(10),
            activo: true,
            autorizado_ia: true,
          },
        },
      ]);

      const contexto = await servicio.cargarContexto(1);

      expect(contexto.materiales).toEqual([
        { titulo: 'A', texto: 'a'.repeat(10) },
        { titulo: 'C', texto: 'cc' },
      ]);
      expect(contexto.materia).toBe('Matemática');
      expect(contexto.tema).toBe('Derivadas');
    });

    it('no envía materiales pertenecientes a otro docente', async () => {
      const { servicio, generacion, generacionMaterial } = montarServicio();

      generacion.findOne.mockResolvedValue({
        generacion_id: 1,
        docente_id: 7,
        materia_id: 1,
        tipo_respuesta: 'opcion_unica',
        dificultad: 'media',
        cantidad: 1,
      });
      generacionMaterial.find.mockResolvedValue([
        {
          material: {
            material_id: 2,
            docente_id: 9,
            titulo: 'Ajeno',
            texto_extraido: 'Contenido ajeno',
            activo: true,
            autorizado_ia: true,
          },
        },
      ]);

      await expect(servicio.cargarContexto(1)).rejects.toMatchObject({
        motivo: 'materiales_no_disponibles',
      });
    });
  });

  describe('recuperarInterrumpidas', () => {
    it('devuelve las generaciones procesando más antiguas que el margen', async () => {
      const { servicio, generacion } = montarServicio();
      const qb = queryBuilder({ affected: 3 });
      generacion.createQueryBuilder.mockReturnValue(qb);

      expect(await servicio.recuperarInterrumpidas(new Date(), 60_000)).toBe(3);
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'pendiente' }),
      );
      expect(qb.where).toHaveBeenCalledWith('estado = :estado', {
        estado: 'procesando',
      });
    });
  });

  describe('marcarError', () => {
    it('guarda un mensaje sanitizado sin credenciales', async () => {
      const { servicio, generacion } = montarServicio();
      generacion.update.mockResolvedValue({ affected: 1 });

      await servicio.marcarError(
        1,
        'Fallo con la clave AIzaSyABCDEFGHIJKLMNOPQRSTUV',
        new Date(),
      );

      const [, cambios] = generacion.update.mock.calls[0];
      const mensaje = (cambios as { error_mensaje: string }).error_mensaje;

      expect(mensaje).not.toContain('AIza');
      expect(mensaje).toContain('[clave-oculta]');
      expect(mensaje.length).toBeLessThanOrEqual(MAX_LONGITUD_MENSAJE_ERROR);
    });
  });

  describe('actualizarPropuesta', () => {
    const DTO_OPCIONES = {
      enunciado: '  ¿Cuál es la derivada de x²?  ',
      dificultad: 'media' as const,
      puntaje_max: 2,
      opciones: [
        { texto_opcion: '2x', es_correcta: true },
        { texto_opcion: 'x', es_correcta: false },
      ],
      explicacion: '  Regla de la potencia.  ',
    };

    function prepararPropuesta(
      opciones: {
        estado?: string;
        tipoRespuesta?: string | null;
        propuesta?: PropuestaParcial | null;
      } = {},
    ) {
      const { servicio, generacion, propuesta, dataSource } = montarServicio();

      generacion.findOne.mockResolvedValue({
        generacion_id: 9,
        docente_id: 7,
        tipo_respuesta:
          opciones.tipoRespuesta === undefined
            ? 'opcion_unica'
            : opciones.tipoRespuesta,
      });

      propuesta.findOne.mockResolvedValue(
        opciones.propuesta === undefined
          ? {
              propuesta_id: 3,
              generacion_id: 9,
              estado: opciones.estado ?? 'pendiente',
              contenido: {},
              pregunta_id: null,
            }
          : opciones.propuesta,
      );

      propuesta.update.mockResolvedValue({ affected: 1 });

      return { servicio, generacion, propuesta, dataSource };
    }

    it('actualiza solo el contenido de una propuesta pendiente', async () => {
      const { servicio, propuesta, dataSource } = prepararPropuesta();

      const resultado = await servicio.actualizarPropuesta(
        7,
        9,
        3,
        DTO_OPCIONES,
      );

      expect(propuesta.update).toHaveBeenCalledWith(
        {
          propuesta_id: 3,
          generacion_id: 9,
          estado: 'pendiente',
        },
        {
          contenido: expect.objectContaining({
            enunciado: '¿Cuál es la derivada de x²?',
            dificultad: 'media',
            puntaje_max: 2,
            explicacion: 'Regla de la potencia.',
            opciones: [
              { texto_opcion: '2x', es_correcta: true },
              { texto_opcion: 'x', es_correcta: false },
            ],
          }),
        },
      );
      expect(resultado).toEqual({
        propuesta_id: 3,
        contenido: expect.objectContaining({
          enunciado: '¿Cuál es la derivada de x²?',
        }),
        estado: 'pendiente',
        pregunta_id: null,
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rechaza una configuración inválida sin tocar la base', async () => {
      const { servicio, propuesta } = prepararPropuesta();

      await expect(
        servicio.actualizarPropuesta(7, 9, 3, {
          ...DTO_OPCIONES,
          opciones: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(propuesta.update).not.toHaveBeenCalled();
    });

    it('rechaza editar una propuesta que ya no está pendiente', async () => {
      const { servicio, propuesta } = prepararPropuesta({
        estado: 'aceptada',
      });

      await expect(
        servicio.actualizarPropuesta(7, 9, 3, DTO_OPCIONES),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(propuesta.update).not.toHaveBeenCalled();
    });

    it('oculta generaciones de otros docentes con 404', async () => {
      const { servicio, generacion, propuesta } = prepararPropuesta();
      generacion.findOne.mockResolvedValue(null);

      await expect(
        servicio.actualizarPropuesta(7, 9, 3, DTO_OPCIONES),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(propuesta.findOne).not.toHaveBeenCalled();
    });

    it('rechaza propuestas que no pertenecen a la generación indicada', async () => {
      const { servicio, propuesta } = prepararPropuesta({ propuesta: null });

      await expect(
        servicio.actualizarPropuesta(7, 9, 3, DTO_OPCIONES),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(propuesta.findOne).toHaveBeenCalledWith({
        where: { propuesta_id: 3, generacion_id: 9 },
      });
    });
  });

  describe('aceptar y descartar propuestas', () => {
    function preparar(estado = 'pendiente', preguntaId: number | null = null) {
      const { servicio, generacion, propuesta, dataSource } = montarServicio();

      generacion.findOne.mockResolvedValue({
        generacion_id: 9,
        docente_id: 7,
        tipo_respuesta: 'opcion_unica',
      });
      propuesta.findOne.mockResolvedValue({
        propuesta_id: 3,
        generacion_id: 9,
        estado,
        contenido: { enunciado: 'Pregunta' },
        pregunta_id: preguntaId,
      });
      propuesta.update.mockResolvedValue({ affected: 1 });

      return { servicio, propuesta, dataSource };
    }

    describe('insertarPropuesta', () => {
        const preguntaGenerada = {
          pregunta_id: 101,
          materia_id: 1,
          tema_id: 2,
        };

        function prepararInsercion(
          opciones: {
            estado?: string;
            preguntaId?: number | null;
            tipo?: string | null;
            contenido?: Record<string, unknown>;
            docenteId?: number;
            propuestaExiste?: boolean;
          } = {},
        ) {
          const { servicio, dataSource, preguntaService } = montarServicio();
          const manager = {
            findOne: jest.fn<
              (entidad: unknown, opciones?: unknown) => Promise<unknown>
            >(),
            update: jest.fn<
              (...args: unknown[]) => Promise<RespuestaActualizacion>
            >().mockResolvedValue({ affected: 1 }),
          };
          const generacion = {
            generacion_id: 9,
            docente_id: opciones.docenteId ?? 7,
            materia_id: 1,
            tema_id: 2,
            tipo_respuesta: opciones.tipo ?? 'opcion_unica',
            dificultad: 'media',
          };
          const propuesta = {
            propuesta_id: 3,
            generacion_id: 9,
            estado: opciones.estado ?? 'aceptada',
            pregunta_id: opciones.preguntaId ?? null,
            contenido: opciones.contenido ?? {
              enunciado: 'Pregunta IA',
              dificultad: 'dificil',
              puntaje_max: 3.5,
              opciones: [
                { texto_opcion: 'Respuesta A', es_correcta: true },
                { texto_opcion: 'Respuesta B', es_correcta: false },
              ],
              explicacion: 'Se aplica la regla.',
            },
          };

          manager.findOne
            .mockResolvedValueOnce(opciones.docenteId === 8 ? null : generacion)
            .mockResolvedValueOnce(
              opciones.propuestaExiste === false ? null : propuesta,
            );
          preguntaService.crearEnTransaccion.mockResolvedValue(preguntaGenerada);
          dataSource.transaction.mockImplementation(async (callback) =>
            callback(manager),
          );

          return {
            servicio,
            dataSource,
            manager,
            preguntaService,
            generacion,
            propuesta,
          };
        }

        it('inserta la propuesta aceptada a través del servicio de preguntas', async () => {
          const { servicio, dataSource, manager, preguntaService } =
            prepararInsercion();

          await expect(servicio.insertarPropuesta(7, 9, 3)).resolves.toEqual({
            propuesta_id: 3,
            pregunta_id: 101,
            estado: 'aceptada',
            insertada: true,
            ya_estaba_insertada: false,
          });

          expect(dataSource.transaction).toHaveBeenCalledTimes(1);
          expect(manager.findOne).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            expect.objectContaining({
              where: { propuesta_id: 3, generacion_id: 9 },
              lock: { mode: 'pessimistic_write' },
            }),
          );
          expect(preguntaService.crearEnTransaccion).toHaveBeenCalledWith(
            manager,
            expect.objectContaining({
              materia_id: 1,
              tema_id: 2,
              tipo_respuesta: 'opcion_unica',
              enunciado: 'Pregunta IA',
              dificultad: 'dificil',
              puntaje_max: 3.5,
              explicacion: 'Se aplica la regla.',
            }),
            7,
            'ia',
          );
          expect(manager.update).toHaveBeenCalledWith(
            expect.anything(),
            {
              propuesta_id: 3,
              generacion_id: 9,
              estado: 'aceptada',
              pregunta_id: expect.anything(),
            },
            { pregunta_id: 101 },
          );
        });

        it.each(['pendiente', 'descartada'])(
          'rechaza propuestas %s',
          async (estado) => {
            const { servicio, preguntaService } = prepararInsercion({ estado });

            await expect(
              servicio.insertarPropuesta(7, 9, 3),
            ).rejects.toBeInstanceOf(ConflictException);
            expect(preguntaService.crearEnTransaccion).not.toHaveBeenCalled();
          },
        );

        it('devuelve el ID existente sin crear una segunda pregunta', async () => {
          const { servicio, preguntaService, manager } = prepararInsercion({
            preguntaId: 88,
          });

          await expect(servicio.insertarPropuesta(7, 9, 3)).resolves.toEqual({
            propuesta_id: 3,
            pregunta_id: 88,
            estado: 'aceptada',
            insertada: false,
            ya_estaba_insertada: true,
          });
          expect(preguntaService.crearEnTransaccion).not.toHaveBeenCalled();
          expect(manager.update).not.toHaveBeenCalled();
        });

        it('responde 404 para generación ajena y propuestas de otra generación', async () => {
          const ajena = prepararInsercion({ docenteId: 8 });
          await expect(
            ajena.servicio.insertarPropuesta(8, 9, 3),
          ).rejects.toBeInstanceOf(NotFoundException);
          expect(ajena.preguntaService.crearEnTransaccion).not.toHaveBeenCalled();

          const propuestaAjena = prepararInsercion({ propuestaExiste: false });
          await expect(
            propuestaAjena.servicio.insertarPropuesta(7, 9, 30),
          ).rejects.toBeInstanceOf(NotFoundException);
          expect(
            propuestaAjena.preguntaService.crearEnTransaccion,
          ).not.toHaveBeenCalled();
        });

        it.each([
          [
            'opcion_unica',
            {
              opciones: [
                { texto_opcion: 'A', es_correcta: true },
                { texto_opcion: 'B', es_correcta: false },
              ],
            },
          ],
          [
            'opcion_multiple',
            {
              opciones: [
                { texto_opcion: 'A', es_correcta: true },
                { texto_opcion: 'B', es_correcta: true },
              ],
            },
          ],
          [
            'verdadero_falso',
            {
              opciones: [
                { texto_opcion: 'Verdadero', es_correcta: true },
                { texto_opcion: 'Falso', es_correcta: false },
              ],
            },
          ],
          ['numerica', { valor_correcto: 42, tolerancia: 0.5 }],
          ['desarrollo', { solucion_referencia: 'Respuesta de referencia' }],
        ])('valida y entrega al banco la configuración %s', async (tipo, config) => {
          const { servicio, preguntaService } = prepararInsercion({
            tipo,
            contenido: {
              enunciado: 'Pregunta IA',
              dificultad: 'media',
              puntaje_max: 2,
              ...config,
            },
          });

          await expect(servicio.insertarPropuesta(7, 9, 3)).resolves.toMatchObject({
            pregunta_id: 101,
          });
          expect(preguntaService.crearEnTransaccion).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ tipo_respuesta: tipo }),
            7,
            'ia',
          );
        });

        it('rechaza contenido inválido sin crear pregunta', async () => {
          const { servicio, preguntaService } = prepararInsercion({
            contenido: {
              enunciado: 'Pregunta IA',
              dificultad: 'media',
              puntaje_max: 2,
              opciones: [],
            },
          });

          await expect(
            servicio.insertarPropuesta(7, 9, 3),
          ).rejects.toBeInstanceOf(BadRequestException);
          expect(preguntaService.crearEnTransaccion).not.toHaveBeenCalled();
        });

        it('revierte el intento si falla la creación de la pregunta', async () => {
          const { servicio, dataSource, preguntaService, manager } =
            prepararInsercion();
          preguntaService.crearEnTransaccion.mockRejectedValue(
            new Error('Error guardando opciones'),
          );

          await expect(servicio.insertarPropuesta(7, 9, 3)).rejects.toThrow(
            'Error guardando opciones',
          );
          expect(dataSource.transaction).toHaveBeenCalledTimes(1);
          expect(manager.update).not.toHaveBeenCalled();
        });
    });

    it('acepta sin insertar preguntas y deja pregunta_id en null', async () => {
      const { servicio, propuesta, dataSource } = preparar('pendiente', 42);

      const resultado = await servicio.aceptarPropuesta(7, 9, 3);

      expect(propuesta.update).toHaveBeenCalledWith(
        { propuesta_id: 3, generacion_id: 9, estado: 'pendiente' },
        { estado: 'aceptada', pregunta_id: null },
      );
      expect(resultado).toEqual({
        propuesta_id: 3,
        contenido: { enunciado: 'Pregunta' },
        estado: 'aceptada',
        pregunta_id: null,
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('descarta sin insertar preguntas ni modificar pregunta_id', async () => {
      const { servicio, propuesta, dataSource } = preparar();

      const resultado = await servicio.descartarPropuesta(7, 9, 3);

      expect(propuesta.update).toHaveBeenCalledWith(
        { propuesta_id: 3, generacion_id: 9, estado: 'pendiente' },
        { estado: 'descartada' },
      );
      expect(resultado).toEqual({
        propuesta_id: 3,
        contenido: { enunciado: 'Pregunta' },
        estado: 'descartada',
        pregunta_id: null,
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('no permite aceptar una propuesta ya revisada', async () => {
      const { servicio, propuesta } = preparar('descartada');

      await expect(
        servicio.aceptarPropuesta(7, 9, 3),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(propuesta.update).not.toHaveBeenCalled();
    });

    it('no permite descartar una propuesta ya aceptada', async () => {
      const { servicio, propuesta } = preparar('aceptada');

      await expect(
        servicio.descartarPropuesta(7, 9, 3),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(propuesta.update).not.toHaveBeenCalled();
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando la generación no pertenece al docente', async () => {
      const { servicio, generacion } = montarServicio();
      generacion.findOne.mockResolvedValue(null);

      await expect(servicio.obtener(7, 99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('incluye solo id y título de los materiales utilizados', async () => {
      const { servicio, generacion } = montarServicio();

      generacion.findOne.mockResolvedValue({
        generacion_id: 9,
        estado: 'completada',
        tipo_respuesta: 'opcion_unica',
        dificultad: 'media',
        cantidad: 1,
        cantidad_generada: 1,
        materia_id: 1,
        materia: { nombre: 'Matemática' },
        tema_id: 2,
        tema: { nombre_tema: 'Derivadas' },
        proveedor: 'fake',
        modelo: 'fake',
        tokens_entrada: 1,
        tokens_salida: 1,
        tokens_total: 2,
        error_mensaje: null,
        iniciada_en: null,
        finalizada_en: null,
        fecha: new Date('2026-01-01'),
        materiales: [
          {
            material_id: 2,
            material: {
              material_id: 2,
              titulo: 'Material B',
              texto_extraido: 'secreto',
            },
          },
          {
            material_id: 1,
            material: {
              material_id: 1,
              titulo: 'Material A',
              texto_extraido: 'secreto',
            },
          },
        ],
        propuestas: [
          {
            propuesta_id: 3,
            contenido: { enunciado: 'Pregunta' },
            estado: 'pendiente',
            pregunta_id: null,
          },
        ],
      });

      const resultado = await servicio.obtener(7, 9);

      expect(generacion.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: expect.objectContaining({
            materiales: { material: true },
          }),
        }),
      );
      expect(resultado.materiales).toEqual([
        { material_id: 1, titulo: 'Material A' },
        { material_id: 2, titulo: 'Material B' },
      ]);
      expect(resultado.propuestas).toEqual([
        {
          propuesta_id: 3,
          tipo_respuesta: 'opcion_unica',
          contenido: { enunciado: 'Pregunta' },
          estado: 'pendiente',
          pregunta_id: null,
        },
      ]);
      expect(JSON.stringify(resultado.materiales)).not.toContain('secreto');
    });
  });

  describe('listar', () => {
    it('consulta solo las generaciones del docente y aplica los filtros', async () => {
      const { servicio, generacion } = montarServicio();

      generacion.find.mockResolvedValue([
        {
          generacion_id: 3,
          estado: 'completada',
          tipo_respuesta: 'opcion_unica',
          dificultad: 'media',
          cantidad: 2,
          cantidad_generada: 2,
          materia_id: 1,
          materia: { nombre: 'Matemática' },
          tema_id: 2,
          tema: { nombre_tema: 'Derivadas' },
          proveedor: 'fake',
          modelo: 'fake',
          error_mensaje: null,
          fecha: new Date('2026-01-01'),
          iniciada_en: null,
          finalizada_en: null,
        },
      ]);

      const resultado = await servicio.listar(7, {
        estado: 'completada',
        materia_id: 1,
      });

      expect(generacion.find).toHaveBeenCalledWith({
        where: {
          docente_id: 7,
          estado: 'completada',
          materia_id: 1,
        },
        relations: { materia: true, tema: true },
        order: { fecha: 'DESC', generacion_id: 'DESC' },
      });
      expect(resultado[0]).toEqual(
        expect.objectContaining({
          generacion_id: 3,
          materia: 'Matemática',
          tema: 'Derivadas',
          cantidad_generada: 2,
        }),
      );
    });

    it('sin filtros devuelve todas las generaciones del docente', async () => {
      const { servicio, generacion } = montarServicio();
      generacion.find.mockResolvedValue([]);

      await servicio.listar(7);

      expect(generacion.find).toHaveBeenCalledWith({
        where: { docente_id: 7 },
        relations: { materia: true, tema: true },
        order: { fecha: 'DESC', generacion_id: 'DESC' },
      });
    });
  });
});
