import { BadRequestException, HttpException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';

import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';
import { Examen } from '../examen/entity/examen.entity';
import type { RevisionCalificacionesService } from '../examen/revision-calificaciones.service';
import { Inciso } from '../inciso/entity/inciso.entity';
import { IaSolucionReferencia } from '../iasolucionreferencia/entity/iasolucionreferencia.entity';
import { OpcionMarcada } from '../opcionmarcada/entity/opcionmarcada.entity';
import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';
import { cargarConfiguracionIa } from '../config/ia.config';
import { FakeAiProvider } from '../ia/providers/fake-ai.provider';
import { CorreccionIa } from './entity/correccionia.entity';
import type {
  AlmacenCorreccionIa,
  ContextoCorreccionIa,
  ResultadoPersistenciaCorreccionIa,
  ResultadoRecuperacionCorreccionIa,
} from './correccionia.types';
import { crearHashCriterioActual } from './correccionia.criterio';
import { CorreccionIaService } from './correccionia.service';
import { CorreccionIaWorker } from './correccionia.worker';

interface OpcionesServicio {
  examen?: Record<string, unknown> | null;
  rendicion?: Record<string, unknown> | null;
  inciso?: Record<string, unknown> | null;
  respuesta?: Record<string, unknown> | null;
  soluciones?: Record<string, unknown> | null;
  intentosAnteriores?: Array<Record<string, unknown> | null>;
  propuestaActiva?: CorreccionIa | Record<string, unknown> | null;
  ultimaPropuesta?: Record<string, unknown> | null;
  errorGuardar?: Error;
  errorValoracion?: Error;
  propuestas?: CorreccionIa[];
  detalle?: CorreccionIa | null;
  detalleBajoBloqueo?: CorreccionIa | null;
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
      ? {
          valor_correcto: '10',
          tolerancia: '0',
          rubrica: 'Criterios revisados',
        }
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
    save: jest.fn(),
    update: jest.fn(),
  };
  const rendicionRepository = {
    findOne: jest.fn(async () => {
      orden.push('rendicion');
      return rendicion;
    }),
    save: jest.fn(),
    update: jest.fn(),
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
    save: jest.fn(),
    update: jest.fn(),
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
    findOne: jest.fn(
      async (consulta?: {
        where?: Record<string, unknown>;
        lock?: { mode?: string };
      }) => {
        orden.push('correccion');
        if (typeof consulta?.where?.propuesta_id === 'number') {
          if (
            consulta.lock?.mode === 'pessimistic_write' &&
            opciones.detalleBajoBloqueo !== undefined
          ) {
            return opciones.detalleBajoBloqueo;
          }
          return opciones.detalle ?? null;
        }
        if (consulta?.where?.estado !== undefined) {
          return opciones.propuestaActiva ?? null;
        }
        if (opciones.ultimaPropuesta !== undefined) {
          return opciones.ultimaPropuesta;
        }
        return intentos.shift() ?? null;
      },
    ),
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
    delete: jest.fn(),
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
  const notaOficial = {
    puntaje_obtenido: null as string | null,
    estado_correccion: 'pendiente',
    nota_final: null as string | null,
    estado_rendicion: 'enviada',
    pendientes_revision: 1,
  };
  const aplicarValoracionOficial = jest.fn(
    async (
      _manager: unknown,
      _examenId: number,
      _estudianteId: number,
      _preguntaId: number,
      _letra: string,
      _docenteId: number,
      datos: { puntaje: number; retroalimentacion?: string | null },
    ) => {
      const maximo = Number(
        (opciones.detalle?.puntaje_max_inciso ?? '10.00') as string,
      );
      if (
        !Number.isFinite(datos.puntaje) ||
        datos.puntaje < 0 ||
        datos.puntaje > maximo
      ) {
        throw new BadRequestException(
          `El puntaje debe estar entre 0 y ${maximo}.`,
        );
      }

      notaOficial.puntaje_obtenido = datos.puntaje.toFixed(2);
      notaOficial.estado_correccion = 'manual';
      notaOficial.nota_final = '16.00';
      notaOficial.estado_rendicion = 'corregida';
      notaOficial.pendientes_revision = 0;

      if (opciones.errorValoracion) {
        throw opciones.errorValoracion;
      }

      return {
        examen_id: 7,
        estudiante_id: 21,
        pregunta_id: 31,
        letra: 'a',
        estado_correccion: notaOficial.estado_correccion,
        puntaje_obtenido: notaOficial.puntaje_obtenido,
        nota_final: notaOficial.nota_final,
        estado_rendicion: notaOficial.estado_rendicion,
        pendientes_revision: notaOficial.pendientes_revision,
      };
    },
  );
  const revision = {
    aplicarValoracionOficial,
  } as unknown as RevisionCalificacionesService;

  const transaction = jest.fn(
    async (ejecutar: (manager: EntityManager) => Promise<unknown>) => {
      const notaAntes = { ...notaOficial };
      const detalleAntes = opciones.detalle ? { ...opciones.detalle } : null;
      try {
        return await ejecutar(manager as unknown as EntityManager);
      } catch (error) {
        Object.assign(notaOficial, notaAntes);
        if (opciones.detalle && detalleAntes) {
          Object.assign(opciones.detalle, detalleAntes);
        }
        throw error;
      }
    },
  );
  const dataSource = {
    getRepository: jest.fn((entidad: unknown) => {
      const repository = repositorios.get(entidad);
      if (!repository) {
        throw new Error('Repositorio inesperado en la prueba.');
      }
      return repository;
    }),
    transaction,
  } as unknown as DataSource;

  return {
    servicio: new CorreccionIaService(dataSource, revision),
    correccionRepository,
    examenRepository,
    rendicionRepository,
    respuestaRepository,
    manager,
    transaction,
    aplicarValoracionOficial,
    notaOficial,
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
    criterio_hash:
      crearHashCriterioActual(
        'desarrollo',
        {
          valor_correcto: '10',
          tolerancia: '0',
          rubrica: 'Criterios revisados',
        },
        null,
      ) ?? 'hash',
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

async function esperarStatus(
  promesa: Promise<unknown>,
  status: number,
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
  }
}

function examenConCierre(
  cierre: Record<string, unknown>,
): Record<string, unknown> {
  return {
    examen_id: 7,
    docente_id: 12,
    estado: 'publicado',
    calificaciones_revisadas_en: null,
    resultados_publicados_en: null,
    ...cierre,
  };
}

const sinEscriturasOficiales = (contexto: {
  examenRepository: { save: jest.Mock; update: jest.Mock };
  rendicionRepository: { save: jest.Mock; update: jest.Mock };
  respuestaRepository: { save: jest.Mock; update: jest.Mock };
}): void => {
  expect(contexto.examenRepository.save).not.toHaveBeenCalled();
  expect(contexto.examenRepository.update).not.toHaveBeenCalled();
  expect(contexto.rendicionRepository.save).not.toHaveBeenCalled();
  expect(contexto.rendicionRepository.update).not.toHaveBeenCalled();
  expect(contexto.respuestaRepository.save).not.toHaveBeenCalled();
  expect(contexto.respuestaRepository.update).not.toHaveBeenCalled();
};

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
    [
      'criterios insuficientes en un inciso numérico',
      {
        soluciones: null,
        inciso: { tipo_respuesta: 'numerica', puntaje_max: '10.00' },
        respuesta: {
          examen_id: 7,
          estudiante_id: 21,
          pregunta_id: 31,
          letra: 'a',
          estado_correccion: 'pendiente',
          respuesta_texto: '42',
        },
      },
      400,
      'SIN_CRITERIOS',
    ],
    [
      'puntaje máximo inválido',
      { inciso: { tipo_respuesta: 'desarrollo', puntaje_max: 'NaN' } },
      400,
      'PUNTAJE_MAX_INVALIDO',
    ],
  ])(
    '[I12/I13] no persiste una propuesta si la solicitud tiene %s',
    async (_caso, opciones, status, codigo) => {
      const contexto = crearServicio(opciones);

      await esperarErrorCodigo(solicitar(contexto.servicio), status, codigo);
      expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
    },
  );

  it('[I1] persiste una propuesta pendiente con el siguiente intento', async () => {
    const contexto = crearServicio({
      ultimaPropuesta: { intento: 3 },
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
    sinEscriturasOficiales(contexto);
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

  it('[I9] traduce la colisión del índice único activo a un conflicto estable', async () => {
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

  it('devuelve conflicto si ya existe una propuesta activa', async () => {
    const contexto = crearServicio({
      propuestaActiva: crearPropuesta({ estado: 'pendiente' }),
    });

    await esperarErrorCodigo(
      solicitar(contexto.servicio),
      409,
      'PROPUESTA_ACTIVA_EXISTENTE',
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
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

  it('[I7] no consulta propuestas de un examen ajeno', async () => {
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

describe('CorreccionIaService.modificarPropuesta', () => {
  it('[I2] modifica solo los campos editables y pasa a modificada', async () => {
    const contexto = crearServicio({ detalle: crearPropuesta() });

    const resultado = await contexto.servicio.modificarPropuesta(44, 12, {
      puntaje: 7.5,
      valoracion: 'Ajustada por el docente',
      explicacion: 'Falta un detalle en el procedimiento',
      errores: [
        {
          tipo: 'omision',
          descripcion: 'No declara la restricción',
          ubicacion: 'paso 2',
        },
      ],
    });

    expect(resultado).toMatchObject({
      propuesta_id: 44,
      estado: 'modificada',
      puntaje_sugerido: '7.50',
      valoracion: 'Ajustada por el docente',
      version: 2,
      errores: [
        {
          tipo: 'omision',
          descripcion: 'No declara la restricción',
          ubicacion: 'paso 2',
        },
      ],
    });
    expect(contexto.correccionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'modificada',
        puntaje_sugerido: '7.50',
        version: 2,
      }),
    );
    expect(contexto.correccionRepository.delete).not.toHaveBeenCalled();
    sinEscriturasOficiales(contexto);
  });

  it.each([
    'pendiente',
    'procesando',
    'modificada',
    'aceptada',
    'descartada',
    'error',
    'reemplazada',
  ])('rechaza modificar una propuesta en estado %s', async (estado) => {
    const contexto = crearServicio({
      detalle: crearPropuesta({ estado: estado as CorreccionIa['estado'] }),
    });

    await esperarErrorCodigo(
      contexto.servicio.modificarPropuesta(44, 12, { valoracion: 'Otra' }),
      409,
      'ESTADO_NO_PERMITE_OPERACION',
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza campos no permitidos', async () => {
    const contexto = crearServicio({ detalle: crearPropuesta() });

    await esperarStatus(
      contexto.servicio.modificarPropuesta(44, 12, {
        confianza: '0.50',
      } as never),
      400,
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it.each([[{}], [{ valoracion: null, explicacion: undefined }]])(
    'rechaza un cuerpo sin cambios con SIN_CAMBIOS',
    async (cambios) => {
      const contexto = crearServicio({ detalle: crearPropuesta() });

      await esperarErrorCodigo(
        contexto.servicio.modificarPropuesta(44, 12, cambios),
        400,
        'SIN_CAMBIOS',
      );
      expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['negativo', -0.01],
    ['mayor al máximo', '10.01'],
    ['con 3 decimales', 7.555],
    ['no numérico', 'abc'],
  ])('rechaza un puntaje %s', async (_, puntaje) => {
    const contexto = crearServicio({ detalle: crearPropuesta() });

    await esperarErrorCodigo(
      contexto.servicio.modificarPropuesta(44, 12, {
        puntaje: puntaje as number | string,
      }),
      400,
      'PUNTAJE_FUERA_DE_RANGO',
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('oculta la propuesta si el examen no pertenece al docente', async () => {
    const contexto = crearServicio({
      examen: null,
      detalle: crearPropuesta(),
    });

    await esperarErrorCodigo(
      contexto.servicio.modificarPropuesta(44, 99, { valoracion: 'Otra' }),
      404,
      'PROPUESTA_NO_ENCONTRADA',
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    [{ calificaciones_revisadas_en: new Date() }, 'REVISION_CERRADA'],
    [{ resultados_publicados_en: new Date() }, 'RESULTADOS_PUBLICADOS'],
  ])('rechaza modificar con el examen cerrado', async (cierre, codigo) => {
    const contexto = crearServicio({
      examen: examenConCierre(cierre),
      detalle: crearPropuesta(),
    });

    await esperarErrorCodigo(
      contexto.servicio.modificarPropuesta(44, 12, { valoracion: 'Otra' }),
      409,
      codigo,
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });
});

describe('CorreccionIaService.descartarPropuesta', () => {
  it.each(['pendiente', 'generada', 'modificada'])(
    '[I3] descarta una propuesta en estado %s y normaliza el motivo',
    async (estado) => {
      const contexto = crearServicio({
        detalle: crearPropuesta({
          estado: estado as CorreccionIa['estado'],
        }),
      });

      const resultado = await contexto.servicio.descartarPropuesta(
        44,
        12,
        '  Respuesta duplicada  ',
      );

      expect(resultado).toEqual({
        propuesta_id: 44,
        estado: 'descartada',
      });
      expect(contexto.correccionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: 'descartada',
          motivo: 'Respuesta duplicada',
          version: 2,
        }),
      );
      expect(contexto.correccionRepository.delete).not.toHaveBeenCalled();
      sinEscriturasOficiales(contexto);
    },
  );

  it.each(['procesando', 'aceptada', 'descartada', 'error', 'reemplazada'])(
    'no descarta una propuesta en estado %s',
    async (estado) => {
      const contexto = crearServicio({
        detalle: crearPropuesta({
          estado: estado as CorreccionIa['estado'],
        }),
      });

      await esperarErrorCodigo(
        contexto.servicio.descartarPropuesta(44, 12),
        409,
        'ESTADO_NO_PERMITE_OPERACION',
      );
      expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
    },
  );

  it('acepta el motivo opcional y lo deja nulo', async () => {
    const contexto = crearServicio({ detalle: crearPropuesta() });

    await contexto.servicio.descartarPropuesta(44, 12);

    expect(contexto.correccionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'descartada', motivo: null }),
    );
  });

  it('rechaza un motivo de más de 300 caracteres', async () => {
    const contexto = crearServicio({ detalle: crearPropuesta() });

    await esperarStatus(
      contexto.servicio.descartarPropuesta(44, 12, 'x'.repeat(301)),
      400,
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('oculta la propuesta si el examen no pertenece al docente', async () => {
    const contexto = crearServicio({
      examen: null,
      detalle: crearPropuesta(),
    });

    await esperarErrorCodigo(
      contexto.servicio.descartarPropuesta(44, 99),
      404,
      'PROPUESTA_NO_ENCONTRADA',
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    [{ calificaciones_revisadas_en: new Date() }, 'REVISION_CERRADA'],
    [{ resultados_publicados_en: new Date() }, 'RESULTADOS_PUBLICADOS'],
  ])('rechaza descartar con el examen cerrado', async (cierre, codigo) => {
    const contexto = crearServicio({
      examen: examenConCierre(cierre),
      detalle: crearPropuesta(),
    });

    await esperarErrorCodigo(
      contexto.servicio.descartarPropuesta(44, 12),
      409,
      codigo,
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });
});

describe('CorreccionIaService.regenerarPropuesta', () => {
  const regenerar = (servicio: CorreccionIaService) =>
    servicio.regenerarPropuesta(7, 21, 31, 'a', 12);

  it('[I8] reemplaza la propuesta activa, enlaza el reemplazo y conserva el historial', async () => {
    const activa = crearPropuesta({
      propuesta_id: 43,
      estado: 'generada',
      intento: 2,
      version: 3,
    });
    const contexto = crearServicio({
      propuestaActiva: activa,
      ultimaPropuesta: { intento: 2 },
    });

    const resultado = await regenerar(contexto.servicio);

    expect(resultado).toEqual({
      propuesta_id: 44,
      estado: 'pendiente',
      intento: 3,
    });
    expect(activa.estado).toBe('reemplazada');
    expect(activa.reemplazada_por_id).toBe(44);
    expect(activa.version).toBe(4);
    expect(contexto.correccionRepository.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        propuesta_id: 43,
        estado: 'reemplazada',
        version: 4,
      }),
    );
    expect(contexto.correccionRepository.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        estado: 'pendiente',
        intento: 3,
        puntaje_sugerido: null,
        confianza: null,
      }),
    );
    expect(contexto.correccionRepository.save).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        propuesta_id: 43,
        estado: 'reemplazada',
        reemplazada_por_id: 44,
      }),
    );
    expect(contexto.correccionRepository.delete).not.toHaveBeenCalled();
    sinEscriturasOficiales(contexto);
  });

  it.each(['pendiente', 'modificada'])(
    'reemplaza también una propuesta activa en estado %s',
    async (estado) => {
      const activa = crearPropuesta({
        propuesta_id: 43,
        estado: estado as CorreccionIa['estado'],
        intento: 1,
      });
      const contexto = crearServicio({
        propuestaActiva: activa,
        ultimaPropuesta: { intento: 1 },
      });

      await expect(regenerar(contexto.servicio)).resolves.toMatchObject({
        estado: 'pendiente',
        intento: 2,
      });
      expect(activa.estado).toBe('reemplazada');
      expect(activa.reemplazada_por_id).toBe(44);
    },
  );

  it('permite regenerar tras aceptada sin alterar la nota oficial', async () => {
    const contexto = crearServicio({
      propuestaActiva: null,
      ultimaPropuesta: { intento: 5 },
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

    const resultado = await regenerar(contexto.servicio);

    expect(resultado).toEqual({
      propuesta_id: 44,
      estado: 'pendiente',
      intento: 6,
    });
    expect(contexto.correccionRepository.save).toHaveBeenCalledTimes(1);
    expect(contexto.correccionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'pendiente',
        intento: 6,
        puntaje_sugerido: null,
      }),
    );
    expect(contexto.correccionRepository.delete).not.toHaveBeenCalled();
    sinEscriturasOficiales(contexto);
  });

  it('no regenera mientras la propuesta activa está procesando', async () => {
    const contexto = crearServicio({
      propuestaActiva: crearPropuesta({ estado: 'procesando' }),
    });

    await esperarErrorCodigo(
      regenerar(contexto.servicio),
      409,
      'PROPUESTA_EN_PROCESO',
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el examen no pertenece al docente', async () => {
    const contexto = crearServicio({ examen: null });

    await esperarErrorCodigo(
      contexto.servicio.regenerarPropuesta(7, 21, 31, 'a', 99),
      404,
      'EXAMEN_NO_ENCONTRADO',
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    [{ calificaciones_revisadas_en: new Date() }, 'REVISION_CERRADA'],
    [{ resultados_publicados_en: new Date() }, 'RESULTADOS_PUBLICADOS'],
  ])('rechaza regenerar con el examen cerrado', async (cierre, codigo) => {
    const contexto = crearServicio({ examen: examenConCierre(cierre) });

    await esperarErrorCodigo(regenerar(contexto.servicio), 409, codigo);
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza regenerar cuando la rendición no fue enviada', async () => {
    const contexto = crearServicio({ rendicion: { estado: 'en_curso' } });

    await esperarErrorCodigo(
      regenerar(contexto.servicio),
      409,
      'RENDICION_NO_ENVIADA',
    );
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });
});

describe('CorreccionIaService.aceptarPropuesta', () => {
  const propuestaAceptable = (
    cambios: Partial<CorreccionIa> = {},
  ): CorreccionIa =>
    crearPropuesta({
      estado: 'generada',
      version: 3,
      puntaje_sugerido: '8.00',
      puntaje_max_inciso: '10.00',
      ...cambios,
    });

  const aceptar = (
    servicio: CorreccionIaService,
    entrada: { version: number; puntaje_confirmado: number | string } = {
      version: 3,
      puntaje_confirmado: '8.00',
    },
  ) => servicio.aceptarPropuesta(44, 12, entrada);

  it('[I5] aplica la valoración oficial y marca la propuesta como aceptada', async () => {
    const propuesta = propuestaAceptable();
    const contexto = crearServicio({ detalle: propuesta });

    const resultado = await contexto.servicio.aceptarPropuesta(44, 12, {
      version: 3,
      puntaje_confirmado: '8.00',
      retroalimentacion: 'Buen razonamiento',
    });

    expect(resultado).toEqual({
      propuesta: { propuesta_id: 44, estado: 'aceptada' },
      calificacion: {
        puntaje_obtenido: '8.00',
        estado_correccion: 'manual',
        nota_final: '16.00',
        estado_rendicion: 'corregida',
        pendientes_revision: 0,
      },
      advertencias: [],
    });
    expect(propuesta).toMatchObject({
      estado: 'aceptada',
      version: 4,
      revisada_por_docente_id: 12,
      puntaje_sugerido: '8.00',
    });
    expect(propuesta.revisada_en).toBeInstanceOf(Date);
    expect(contexto.transaction).toHaveBeenCalledTimes(1);
    expect(contexto.aplicarValoracionOficial).toHaveBeenCalledWith(
      contexto.manager,
      7,
      21,
      31,
      'a',
      12,
      { puntaje: 8, retroalimentacion: 'Buen razonamiento' },
    );
    expect(contexto.correccionRepository.save).toHaveBeenCalledTimes(1);
    expect(contexto.correccionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'aceptada', version: 4 }),
    );
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
    expect(contexto.correccionRepository.delete).not.toHaveBeenCalled();
    sinEscriturasOficiales(contexto);
  });

  it('[I20] acepta con advertencia si cambió el criterio vigente', async () => {
    const contexto = crearServicio({
      detalle: propuestaAceptable(),
      soluciones: {
        valor_correcto: '0',
        tolerancia: '0',
        rubrica: 'Criterios modificados después',
      },
    });

    await expect(aceptar(contexto.servicio)).resolves.toMatchObject({
      propuesta: { estado: 'aceptada' },
      advertencias: [
        {
          codigo: 'CRITERIO_ACTUALIZADO',
          mensaje:
            'El criterio del inciso cambió después de generar la propuesta.',
        },
      ],
    });
    expect(contexto.aplicarValoracionOficial).toHaveBeenCalledTimes(1);
  });

  it('no avisa de cambio de criterio si el valor correcto de relleno (0) no cambió el criterio de desarrollo', async () => {
    const contexto = crearServicio({
      detalle: propuestaAceptable(),
      soluciones: {
        valor_correcto: '0',
        tolerancia: '0',
        rubrica: 'Criterios revisados',
      },
    });

    await expect(aceptar(contexto.servicio)).resolves.toMatchObject({
      advertencias: [],
    });
  });

  it('no altera la retroalimentación existente si se omite', async () => {
    const contexto = crearServicio({ detalle: propuestaAceptable() });

    await aceptar(contexto.servicio);

    expect(contexto.aplicarValoracionOficial).toHaveBeenCalledWith(
      contexto.manager,
      7,
      21,
      31,
      'a',
      12,
      { puntaje: 8 },
    );
  });

  it('[I16] rechaza una versión antigua', async () => {
    const propuesta = propuestaAceptable();
    const contexto = crearServicio({ detalle: propuesta });

    await esperarErrorCodigo(
      aceptar(contexto.servicio, {
        version: 2,
        puntaje_confirmado: '8.00',
      }),
      409,
      'PROPUESTA_DESACTUALIZADA',
    );
    expect(contexto.aplicarValoracionOficial).not.toHaveBeenCalled();
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
    expect(propuesta.estado).toBe('generada');
  });

  it.each([
    ['version', propuestaAceptable({ version: 4 }), 'PROPUESTA_DESACTUALIZADA'],
    [
      'estado',
      propuestaAceptable({
        estado: 'descartada',
        version: 3,
      }),
      'ESTADO_NO_PERMITE_OPERACION',
    ],
  ])(
    '[I16] relee estado y version bajo bloqueo antes de validar %s',
    async (_cambio, actualizada, codigo) => {
      const inicial = propuestaAceptable({ version: 3 });
      const contexto = crearServicio({
        detalle: inicial,
        detalleBajoBloqueo: actualizada,
      });

      await esperarErrorCodigo(
        aceptar(contexto.servicio, {
          version: 3,
          puntaje_confirmado: '8.00',
        }),
        409,
        codigo,
      );

      expect(contexto.correccionRepository.findOne).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { propuesta_id: 44 },
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(contexto.aplicarValoracionOficial).not.toHaveBeenCalled();
      expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
      expect(actualizada).toMatchObject({
        estado:
          codigo === 'ESTADO_NO_PERMITE_OPERACION' ? 'descartada' : 'generada',
        version: codigo === 'ESTADO_NO_PERMITE_OPERACION' ? 3 : 4,
      });
    },
  );

  it('[I17] rechaza un puntaje confirmado que no coincide', async () => {
    const contexto = crearServicio({ detalle: propuestaAceptable() });

    await esperarErrorCodigo(
      aceptar(contexto.servicio, {
        version: 3,
        puntaje_confirmado: '7.99',
      }),
      409,
      'PUNTAJE_CONFIRMADO_NO_COINCIDE',
    );
    expect(contexto.aplicarValoracionOficial).not.toHaveBeenCalled();
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('acepta el puntaje confirmado comparado numéricamente con 2 decimales', async () => {
    const contexto = crearServicio({
      detalle: propuestaAceptable({ puntaje_sugerido: '8' }),
    });

    await expect(
      aceptar(contexto.servicio, {
        version: 3,
        puntaje_confirmado: 8.0,
      }),
    ).resolves.toMatchObject({
      propuesta: { estado: 'aceptada' },
    });
    expect(contexto.aplicarValoracionOficial).toHaveBeenCalledWith(
      contexto.manager,
      7,
      21,
      31,
      'a',
      12,
      { puntaje: 8 },
    );
  });

  it('rechaza una propuesta sin puntaje sugerido', async () => {
    const contexto = crearServicio({
      detalle: propuestaAceptable({ puntaje_sugerido: null }),
    });

    await esperarErrorCodigo(
      aceptar(contexto.servicio),
      409,
      'SIN_PUNTAJE_SUGERIDO',
    );
    expect(contexto.aplicarValoracionOficial).not.toHaveBeenCalled();
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    'pendiente',
    'procesando',
    'descartada',
    'aceptada',
    'error',
    'reemplazada',
  ])('rechaza aceptar una propuesta en estado %s', async (estado) => {
    const contexto = crearServicio({
      detalle: propuestaAceptable({
        estado: estado as CorreccionIa['estado'],
      }),
    });

    await esperarErrorCodigo(
      aceptar(contexto.servicio),
      409,
      'ESTADO_NO_PERMITE_OPERACION',
    );
    expect(contexto.aplicarValoracionOficial).not.toHaveBeenCalled();
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('acepta una propuesta previamente modificada', async () => {
    const contexto = crearServicio({
      detalle: propuestaAceptable({ estado: 'modificada', version: 5 }),
    });

    await expect(
      aceptar(contexto.servicio, {
        version: 5,
        puntaje_confirmado: '8.00',
      }),
    ).resolves.toMatchObject({
      propuesta: { estado: 'aceptada' },
    });
  });

  it.each([
    [{ calificaciones_revisadas_en: new Date() }, 'REVISION_CERRADA'],
    [{ resultados_publicados_en: new Date() }, 'RESULTADOS_PUBLICADOS'],
  ])('[I6] rechaza aceptar con el examen cerrado', async (cierre, codigo) => {
    const contexto = crearServicio({
      examen: examenConCierre(cierre),
      detalle: propuestaAceptable(),
    });

    await esperarErrorCodigo(aceptar(contexto.servicio), 409, codigo);
    expect(contexto.aplicarValoracionOficial).not.toHaveBeenCalled();
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el examen no pertenece al docente', async () => {
    const contexto = crearServicio({
      examen: null,
      detalle: propuestaAceptable(),
    });

    await esperarErrorCodigo(
      contexto.servicio.aceptarPropuesta(44, 99, {
        version: 3,
        puntaje_confirmado: '8.00',
      }),
      404,
      'PROPUESTA_NO_ENCONTRADA',
    );
    expect(contexto.aplicarValoracionOficial).not.toHaveBeenCalled();
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza un puntaje superior al máximo mediante la validación oficial', async () => {
    const contexto = crearServicio({
      detalle: propuestaAceptable({
        puntaje_sugerido: '12.00',
        puntaje_max_inciso: '10.00',
      }),
    });

    await esperarStatus(
      aceptar(contexto.servicio, {
        version: 3,
        puntaje_confirmado: '12.00',
      }),
      400,
    );
    expect(contexto.aplicarValoracionOficial).toHaveBeenCalledTimes(1);
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
    expect(contexto.notaOficial.puntaje_obtenido).toBeNull();
  });

  it('revierte la propuesta si falla la valoración oficial', async () => {
    const error = new Error('falló la valoración oficial');
    const propuesta = propuestaAceptable();
    const contexto = crearServicio({
      detalle: propuesta,
      errorValoracion: error,
    });

    await expect(aceptar(contexto.servicio)).rejects.toBe(error);

    expect(contexto.aplicarValoracionOficial).toHaveBeenCalledTimes(1);
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
    expect(propuesta.estado).toBe('generada');
    expect(propuesta.version).toBe(3);
    expect(contexto.notaOficial.puntaje_obtenido).toBeNull();
  });

  it('no confirma la nota si falla el cambio de estado de la propuesta', async () => {
    const error = new Error('falló el guardado de la propuesta');
    const propuesta = propuestaAceptable();
    const contexto = crearServicio({
      detalle: propuesta,
      errorGuardar: error,
    });

    await expect(aceptar(contexto.servicio)).rejects.toBe(error);

    expect(contexto.transaction).toHaveBeenCalledTimes(1);
    expect(contexto.aplicarValoracionOficial).toHaveBeenCalledWith(
      contexto.manager,
      7,
      21,
      31,
      'a',
      12,
      { puntaje: 8 },
    );
    expect(contexto.notaOficial.puntaje_obtenido).toBeNull();
    expect(contexto.notaOficial.estado_correccion).toBe('pendiente');
    expect(propuesta.estado).toBe('generada');
    expect(propuesta.version).toBe(3);
  });

  it('[I15] solo la aceptación usa la vía oficial; servicio y worker preservan los datos oficiales', async () => {
    const respuesta = {
      examen_id: 7,
      estudiante_id: 21,
      pregunta_id: 31,
      letra: 'a',
      estado_correccion: 'pendiente',
      puntaje_obtenido: null,
      respuesta_texto: 'Respuesta del estudiante',
      ia_estado: 'sin_propuesta',
      ia_puntaje_sugerido: '4.25',
      ia_valoracion: 'valoración previa',
      ia_explicacion: 'explicación previa',
      ia_errores: [{ tipo: 'previo' }],
      ia_confianza: '0.75',
      ia_generado_en: '2026-01-01T00:00:00.000Z',
    };
    const respuestaAntes = { ...respuesta };
    const rendicion = { estado: 'enviada', nota_final: '16.00' };
    const rendicionAntes = { ...rendicion };

    const solicitud = crearServicio({ respuesta, rendicion });
    await solicitar(solicitud.servicio);

    const modificacion = crearServicio({
      respuesta,
      rendicion,
      detalle: propuestaAceptable(),
    });
    await modificacion.servicio.modificarPropuesta(44, 12, {
      puntaje: '7.50',
    });

    const descarte = crearServicio({
      respuesta,
      rendicion,
      detalle: propuestaAceptable(),
    });
    await descarte.servicio.descartarPropuesta(44, 12);

    const regeneracion = crearServicio({
      respuesta,
      rendicion,
      propuestaActiva: propuestaAceptable(),
    });
    await regeneracion.servicio.regenerarPropuesta(7, 21, 31, 'a', 12);

    const almacen: AlmacenCorreccionIa = {
      reclamar: jest
        .fn<AlmacenCorreccionIa['reclamar']>()
        .mockResolvedValueOnce(45)
        .mockResolvedValueOnce(null),
      cargarContexto: jest
        .fn<AlmacenCorreccionIa['cargarContexto']>()
        .mockResolvedValue({
          propuesta_id: 45,
          examen_cerrado: false,
          enunciado: 'Enunciado',
          tipo_respuesta: 'desarrollo',
          respuesta_estudiante: 'Respuesta',
          criterio: { rubrica: 'Criterios' },
          criterio_fuente: 'rubrica',
          puntaje_max: 10,
        } satisfies ContextoCorreccionIa),
      guardarGenerada: jest
        .fn<AlmacenCorreccionIa['guardarGenerada']>()
        .mockResolvedValue(
          'generada' satisfies ResultadoPersistenciaCorreccionIa,
        ),
      marcarError: jest
        .fn<AlmacenCorreccionIa['marcarError']>()
        .mockResolvedValue(true),
      recuperarAbandonadas: jest
        .fn<AlmacenCorreccionIa['recuperarAbandonadas']>()
        .mockResolvedValue({
          reencoladas: 0,
          agotadas: 0,
          cerradas: 0,
        } satisfies ResultadoRecuperacionCorreccionIa),
    };
    const worker = new CorreccionIaWorker(
      almacen,
      new FakeAiProvider({ modelo: 'fake-invariants' }),
      cargarConfiguracionIa({ IA_PROVIDER: 'fake' }),
    );
    await worker.procesarCiclo();
    await worker.esperarInactividad();

    const aceptacion = crearServicio({
      respuesta,
      rendicion,
      detalle: propuestaAceptable(),
    });
    await aceptar(aceptacion.servicio);

    for (const contexto of [
      solicitud,
      modificacion,
      descarte,
      regeneracion,
      aceptacion,
    ]) {
      sinEscriturasOficiales(contexto);
    }
    expect(aceptacion.aplicarValoracionOficial).toHaveBeenCalledTimes(1);
    expect(almacen.guardarGenerada).toHaveBeenCalledTimes(1);
    expect(almacen.guardarGenerada).toHaveBeenCalledWith(
      45,
      expect.objectContaining({ criterio_hash: expect.any(String) }),
      expect.any(Date),
    );
    expect(respuesta).toEqual(respuestaAntes);
    expect(rendicion).toEqual(rendicionAntes);
    await worker.onModuleDestroy();
  });
});


