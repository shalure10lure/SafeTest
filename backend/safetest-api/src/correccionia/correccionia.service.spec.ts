import { HttpException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';

import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';
import { Examen } from '../examen/entity/examen.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { IaSolucionReferencia } from '../iasolucionreferencia/entity/iasolucionreferencia.entity';
import { OpcionMarcada } from '../opcionmarcada/entity/opcionmarcada.entity';
import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';
import { CorreccionIa } from './entity/correccionia.entity';
import { CorreccionIaService } from './correccionia.service';

interface OpcionesServicio {
  examen?: Record<string, unknown> | null;
  rendicion?: Record<string, unknown> | null;
  inciso?: Record<string, unknown> | null;
  respuesta?: Record<string, unknown> | null;
  soluciones?: Record<string, unknown> | null;
  intentosAnteriores?: Array<Record<string, unknown> | null>;
  errorGuardar?: Error;
  propuestas?: CorreccionIa[];
  detalle?: CorreccionIa | null;
}

function crearServicio(opciones: OpcionesServicio = {}) {
  const orden: string[] = [];
  const examen =
    opciones.examen === undefined
      ? {
          examen_id: 7,
          docente_id: 12,
          estado: 'publicado',
          calificaciones_revisadas_en: null,
          resultados_publicados_en: null,
        }
      : opciones.examen;
  const respuesta =
    opciones.respuesta === undefined
      ? {
          examen_id: 7,
          estudiante_id: 21,
          pregunta_id: 31,
          letra: 'a',
          estado_correccion: 'pendiente',
          puntaje_obtenido: null,
          respuesta_texto: 'Respuesta del estudiante',
        }
      : opciones.respuesta;
  const soluciones =
    opciones.soluciones === undefined
      ? { valor_correcto: '10', rubrica: 'Criterios revisados' }
      : opciones.soluciones;
  const inciso =
    opciones.inciso === undefined
      ? { tipo_respuesta: 'desarrollo', puntaje_max: '10.00' }
      : opciones.inciso;
  const intentos = [...(opciones.intentosAnteriores ?? [null, null])];

  const rendicion =
    opciones.rendicion === undefined
      ? { estado: 'enviada' }
      : opciones.rendicion;

  const examenRepository = {
    findOne: jest.fn(async () => {
      orden.push('examen');
      return examen;
    }),
  };
  const rendicionRepository = {
    findOne: jest.fn(async () => {
      orden.push('rendicion');
      return rendicion;
    }),
  };
  const asignacionRepository = {
    findOne: jest.fn(async () => {
      orden.push('asignacion');
      return { pregunta_id: 31 };
    }),
  };
  const incisoRepository = {
    findOne: jest.fn(async () => {
      orden.push('inciso');
      return inciso;
    }),
  };
  const respuestaRepository = {
    findOne: jest.fn(async () => {
      orden.push('respuesta');
      return respuesta;
    }),
  };
  const opcionesRepository = {
    countBy: jest.fn(async () => {
      orden.push('opciones');
      return 0;
    }),
  };
  const solucionRepository = {
    findOne: jest.fn(async () => {
      orden.push('solucion');
      return soluciones;
    }),
  };
  const referenciaRepository = {
    findOne: jest.fn(async () => {
      orden.push('referencia');
      return null;
    }),
  };
  const correccionRepository = {
    findOne: jest.fn(async (consulta?: { where?: Record<string, unknown> }) => {
      orden.push('correccion');
      if (typeof consulta?.where?.propuesta_id === 'number') {
        return opciones.detalle ?? null;
      }
      return intentos.shift() ?? null;
    }),
    find: jest.fn(async () => opciones.propuestas ?? []),
    findAndCount: jest.fn(async () => [
      opciones.propuestas ?? [],
      opciones.propuestas?.length ?? 0,
    ]),
    create: jest.fn((propuesta: Record<string, unknown>) => propuesta),
    save: jest.fn(async (propuesta: Record<string, unknown>) => {
      orden.push('guardar');
      if (opciones.errorGuardar) {
        throw opciones.errorGuardar;
      }
      return { ...propuesta, propuesta_id: 44 };
    }),
  };

  const repositorios = new Map<unknown, object>([
    [Examen, examenRepository],
    [Rendicion, rendicionRepository],
    [AsignacionPregunta, asignacionRepository],
    [Inciso, incisoRepository],
    [RespuestaInciso, respuestaRepository],
    [OpcionMarcada, opcionesRepository],
    [SolucionInciso, solucionRepository],
    [IaSolucionReferencia, referenciaRepository],
    [CorreccionIa, correccionRepository],
  ]);
  const manager = {
    getRepository: jest.fn((entidad: unknown) => {
      const repository = repositorios.get(entidad);
      if (!repository) {
        throw new Error('Repositorio inesperado en la prueba.');
      }
      return repository;
    }),
  };
  const dataSource = {
    getRepository: jest.fn((entidad: unknown) => {
      const repository = repositorios.get(entidad);
      if (!repository) {
        throw new Error('Repositorio inesperado en la prueba.');
      }
      return repository;
    }),
    transaction: async <T>(
      ejecutar: (manager: EntityManager) => Promise<T>,
    ): Promise<T> => ejecutar(manager as unknown as EntityManager),
  } as unknown as DataSource;

  return {
    servicio: new CorreccionIaService(dataSource),
    correccionRepository,
    examenRepository,
    rendicionRepository,
    respuestaRepository,
    orden,
  };
}

function crearPropuesta(cambios: Partial<CorreccionIa> = {}): CorreccionIa {
  return Object.assign(new CorreccionIa(), {
    propuesta_id: 44,
    estudiante_id: 21,
    examen_id: 7,
    pregunta_id: 31,
    letra: 'a',
    docente_id: 12,
    estado: 'generada',
    puntaje_sugerido: '8.00',
    puntaje_max_inciso: '10.00',
    valoracion: 'Correcta',
    explicacion: 'Explicación',
    errores: [{ tipo: 'omision', descripcion: 'Falta un paso' }],
    confianza: '0.90',
    criterio_fuente: 'rubrica',
    criterio_hash: 'hash',
    modelo: 'modelo',
    proveedor: 'fake',
    intento: 2,
    reintentos_worker: 3,
    version: 1,
    creada_en: new Date('2026-01-01T00:00:00.000Z'),
    iniciada_en: new Date('2026-01-01T00:01:00.000Z'),
    finalizada_en: new Date('2026-01-01T00:02:00.000Z'),
    actualizada_en: new Date('2026-01-01T00:02:00.000Z'),
    revisada_en: null,
    revisada_por_docente_id: null,
    reemplazada_por_id: null,
    error_codigo: null,
    error_mensaje: null,
    motivo: null,
    ...cambios,
  });
}

const solicitar = (servicio: CorreccionIaService) =>
  servicio.solicitarPropuesta(7, 21, 31, 'a', 12);

async function esperarErrorCodigo(
  promesa: Promise<unknown>,
  status: number,
  codigo: string,
): Promise<void> {
  let error: unknown;
  try {
    await promesa;
  } catch (capturado) {
    error = capturado;
  }

  expect(error).toBeInstanceOf(HttpException);
  if (error instanceof HttpException) {
    expect(error.getStatus()).toBe(status);
    expect(error.getResponse()).toMatchObject({ codigo });
  }
}

describe('CorreccionIaService.solicitarPropuesta', () => {
  it('no persiste una propuesta cuando el inciso ya fue corregido', async () => {
    const contexto = crearServicio({
      respuesta: {
        examen_id: 7,
        estudiante_id: 21,
        pregunta_id: 31,
        letra: 'a',
        estado_correccion: 'manual',
        puntaje_obtenido: '7.00',
        respuesta_texto: 'Respuesta del estudiante',
      },
    });

    await esperarErrorCodigo(
      solicitar(contexto.servicio),
      409,
      'INCISO_NO_PENDIENTE',
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('no persiste una propuesta cuando la rendición no fue enviada', async () => {
    const contexto = crearServicio({ rendicion: { estado: 'en_curso' } });

    await esperarErrorCodigo(
      solicitar(contexto.servicio),
      409,
      'RENDICION_NO_ENVIADA',
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    [
      'respuesta vacía',
      {
        respuesta: {
          examen_id: 7,
          estudiante_id: 21,
          pregunta_id: 31,
          letra: 'a',
          estado_correccion: 'pendiente',
          respuesta_texto: '',
        },
      },
      400,
      'RESPUESTA_VACIA',
    ],
    ['criterios insuficientes', { soluciones: null }, 400, 'SIN_CRITERIOS'],
    [
      'puntaje máximo inválido',
      { inciso: { tipo_respuesta: 'desarrollo', puntaje_max: 'NaN' } },
      400,
      'PUNTAJE_MAX_INVALIDO',
    ],
  ])(
    'no persiste una propuesta si la solicitud tiene %s',
    async (_caso, opciones, status, codigo) => {
      const contexto = crearServicio(opciones);

      await esperarErrorCodigo(solicitar(contexto.servicio), status, codigo);
      expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
    },
  );

  it('persiste una propuesta pendiente con el siguiente intento', async () => {
    const contexto = crearServicio({
      intentosAnteriores: [null, { intento: 3 }],
    });

    await expect(solicitar(contexto.servicio)).resolves.toEqual({
      propuesta_id: 44,
      estado: 'pendiente',
      intento: 4,
    });
    expect(contexto.correccionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        examen_id: 7,
        estudiante_id: 21,
        pregunta_id: 31,
        letra: 'a',
        docente_id: 12,
        estado: 'pendiente',
        intento: 4,
        puntaje_max_inciso: '10.00',
        puntaje_sugerido: null,
        confianza: null,
      }),
    );
    expect(contexto.orden).toEqual([
      'examen',
      'rendicion',
      'asignacion',
      'inciso',
      'respuesta',
      'correccion',
      'opciones',
      'solucion',
      'referencia',
      'correccion',
      'guardar',
    ]);
    expect(contexto.examenRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(contexto.rendicionRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(contexto.respuestaRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        lock: { mode: 'pessimistic_write' },
      }),
    );
  });

  it('devuelve 404 si el docente no es propietario y no consulta la rendición', async () => {
    const contexto = crearServicio({ examen: null });

    await esperarErrorCodigo(
      solicitar(contexto.servicio),
      404,
      'EXAMEN_NO_ENCONTRADO',
    );
    expect(contexto.examenRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { examen_id: 7, docente_id: 12 },
      }),
    );
    expect(contexto.rendicionRepository.findOne).not.toHaveBeenCalled();
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('traduce la colisión del índice único activo a un conflicto estable', async () => {
    const error = new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'UX_correccion_ia_activa',
      }),
    );
    const contexto = crearServicio({
      errorGuardar: error,
      intentosAnteriores: [null, null],
    });

    await esperarErrorCodigo(
      solicitar(contexto.servicio),
      409,
      'PROPUESTA_ACTIVA_EXISTENTE',
    );
  });

  it('no convierte otras colisiones únicas en propuestas activas', async () => {
    const error = new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'UX_correccion_ia_intento',
      }),
    );
    const contexto = crearServicio({
      errorGuardar: error,
      intentosAnteriores: [null, null],
    });

    await expect(solicitar(contexto.servicio)).rejects.toBe(error);
  });
});

describe('consultas de propuestas de CorreccionIa', () => {
  it('lista por examen propio, aplica filtros y excluye campos internos', async () => {
    const propuesta = crearPropuesta();
    const contexto = crearServicio({ propuestas: [propuesta] });

    const resultado = await contexto.servicio.listarPorExamen(7, 12, {
      estado: 'generada',
      estudiante_id: 21,
      pregunta_id: 31,
      solo_pendientes_revision: true,
      limite: 20,
      desplazamiento: 5,
    });

    expect(resultado.total).toBe(1);
    expect(resultado.propuestas[0]).toMatchObject({
      propuesta_id: 44,
      examen_id: 7,
      estudiante_id: 21,
      estado: 'generada',
      intento: 2,
      errores: [{ tipo: 'omision', descripcion: 'Falta un paso' }],
      creada_en: '2026-01-01T00:00:00.000Z',
    });
    expect(resultado.propuestas[0]).not.toHaveProperty('docente_id');
    expect(resultado.propuestas[0]).not.toHaveProperty('reintentos_worker');
    expect(contexto.examenRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { examen_id: 7, docente_id: 12 },
      }),
    );
    expect(contexto.correccionRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          examen_id: 7,
          estudiante_id: 21,
          pregunta_id: 31,
          estado: 'generada',
        }),
        order: { creada_en: 'DESC' },
        take: 20,
        skip: 5,
      }),
    );
  });

  it('no consulta propuestas de un examen ajeno', async () => {
    const contexto = crearServicio({ examen: null });

    await esperarErrorCodigo(
      contexto.servicio.listarPorExamen(7, 99),
      404,
      'EXAMEN_NO_ENCONTRADO',
    );
    expect(contexto.correccionRepository.findAndCount).not.toHaveBeenCalled();
  });

  it('oculta el detalle si la propuesta no pertenece a un examen propio', async () => {
    const contexto = crearServicio({
      examen: null,
      detalle: crearPropuesta(),
    });

    await esperarErrorCodigo(
      contexto.servicio.obtenerDetalle(44, 99),
      404,
      'PROPUESTA_NO_ENCONTRADA',
    );
  });

  it('responde 404 para una propuesta inexistente', async () => {
    const contexto = crearServicio();

    await esperarErrorCodigo(
      contexto.servicio.obtenerDetalle(999, 12),
      404,
      'PROPUESTA_NO_ENCONTRADA',
    );
    expect(contexto.examenRepository.findOne).not.toHaveBeenCalled();
  });

  it('lista intentos del inciso propio con el filtro y orden del contrato', async () => {
    const contexto = crearServicio({ propuestas: [crearPropuesta()] });

    const resultado = await contexto.servicio.listarHistorial(
      7,
      21,
      31,
      'a',
      12,
      { estado: 'generada', limite: 25 },
    );

    expect(resultado).toHaveLength(1);
    expect(contexto.correccionRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          examen_id: 7,
          estudiante_id: 21,
          pregunta_id: 31,
          letra: 'a',
          estado: 'generada',
        },
        order: { creada_en: 'DESC' },
        take: 25,
      }),
    );
  });
});
