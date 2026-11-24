import { HttpException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { DataSource, EntityManager } from 'typeorm';

import { Examen } from '../examen/entity/examen.entity';
import type { RevisionCalificacionesService } from '../examen/revision-calificaciones.service';
import { Inciso } from '../inciso/entity/inciso.entity';
import { IaSolucionReferencia } from '../iasolucionreferencia/entity/iasolucionreferencia.entity';
import { OpcionMarcada } from '../opcionmarcada/entity/opcionmarcada.entity';
import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';
import { CorreccionIa } from './entity/correccionia.entity';
import { CorreccionIaService } from './correccionia.service';

const ESTADOS_ACTIVOS = ['pendiente', 'procesando', 'generada', 'modificada'];

interface CandidatoLote {
  estudiante_id: number;
  pregunta_id: number;
  letra: string;
  estado_correccion?: string;
  puntaje_obtenido?: string | null;
  respuesta_texto?: string | null;
  tipo_respuesta?: string;
  puntaje_max?: string;
  opciones_marcadas?: number;
  solucion?: { valor_correcto: string; rubrica: string } | null;
  referencia?: boolean;
}

interface OpcionesContextoLote {
  examen?: Record<string, unknown> | null;
  rendiciones?: Array<{ estudiante_id: number; estado: string }>;
  respuestas?: CandidatoLote[];
  propuestasIniciales?: Array<Record<string, unknown>>;
  erroresGuardar?: Map<string, Error>;
}

function clave(
  estudianteId: number,
  preguntaId: number,
  letra: string,
): string {
  return `${estudianteId}:${preguntaId}:${letra}`;
}

function crearContextoLote(opciones: OpcionesContextoLote = {}) {
  const examen =
    opciones.examen === undefined
      ? {
          examen_id: 7,
          docente_id: 12,
          calificaciones_revisadas_en: null,
          resultados_publicados_en: null,
        }
      : opciones.examen;
  const respuestas = opciones.respuestas ?? [];
  const rendiciones =
    opciones.rendiciones ??
    [...new Set(respuestas.map((respuesta) => respuesta.estudiante_id))].map(
      (estudiante_id) => ({ estudiante_id, estado: 'enviada' }),
    );

  const incisos = new Map<string, Record<string, unknown>>();
  const soluciones = new Map<string, Record<string, unknown> | null>();
  const referencias = new Set<number>();
  const opcionesMarcadas = new Map<string, number>();
  for (const respuesta of respuestas) {
    const claveInciso = `${respuesta.pregunta_id}:${respuesta.letra}`;
    incisos.set(claveInciso, {
      pregunta_id: respuesta.pregunta_id,
      letra: respuesta.letra,
      tipo_respuesta: respuesta.tipo_respuesta ?? 'desarrollo',
      puntaje_max: respuesta.puntaje_max ?? '10.00',
    });
    soluciones.set(
      claveInciso,
      respuesta.solucion === undefined
        ? { valor_correcto: '10', rubrica: 'Criterios revisados' }
        : respuesta.solucion,
    );
    if (respuesta.referencia === true) {
      referencias.add(respuesta.pregunta_id);
    }
    opcionesMarcadas.set(
      clave(respuesta.estudiante_id, respuesta.pregunta_id, respuesta.letra),
      respuesta.opciones_marcadas ?? 0,
    );
  }

  const propuestas: Array<Record<string, unknown>> = (
    opciones.propuestasIniciales ?? []
  ).map((propuesta) => ({ ...propuesta }));
  let siguienteId = 100;

  const buscarPorClave = (where: Record<string, unknown>) =>
    propuestas.filter(
      (propuesta) =>
        propuesta.estudiante_id === where.estudiante_id &&
        propuesta.examen_id === where.examen_id &&
        propuesta.pregunta_id === where.pregunta_id &&
        propuesta.letra === where.letra,
    );

  const examenRepository = {
    findOne: jest.fn(async () => examen),
    save: jest.fn(),
    update: jest.fn(),
  };
  const rendicionRepository = {
    find: jest.fn(async () => rendiciones),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const respuestaRepository = {
    find: jest.fn(async (consulta?: { where?: Record<string, unknown> }) => {
      const estudiantes = consulta?.where?.estudiante_id as
        { _value?: number[] } | undefined;
      const ids = estudiantes?._value;
      return respuestas
        .filter(
          (respuesta) =>
            ids === undefined || ids.includes(respuesta.estudiante_id),
        )
        .map((respuesta) => ({
          examen_id: 7,
          estudiante_id: respuesta.estudiante_id,
          pregunta_id: respuesta.pregunta_id,
          letra: respuesta.letra,
          estado_correccion: respuesta.estado_correccion ?? 'pendiente',
          puntaje_obtenido: respuesta.puntaje_obtenido ?? null,
          respuesta_texto:
            respuesta.respuesta_texto === undefined
              ? 'Respuesta del estudiante'
              : respuesta.respuesta_texto,
        }));
    }),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const incisoRepository = {
    findOne: jest.fn(
      async (consulta?: { where?: { pregunta_id?: number; letra?: string } }) =>
        incisos.get(
          `${consulta?.where?.pregunta_id}:${consulta?.where?.letra}`,
        ) ?? null,
    ),
  };
  const opcionRepository = {
    countBy: jest.fn(
      async (where: {
        estudiante_id: number;
        pregunta_id: number;
        letra: string;
      }) =>
        opcionesMarcadas.get(
          clave(where.estudiante_id, where.pregunta_id, where.letra),
        ) ?? 0,
    ),
  };
  const solucionRepository = {
    findOne: jest.fn(
      async (consulta?: { where?: { pregunta_id?: number; letra?: string } }) =>
        soluciones.get(
          `${consulta?.where?.pregunta_id}:${consulta?.where?.letra}`,
        ) ?? null,
    ),
  };
  const referenciaRepository = {
    findOne: jest.fn(async (consulta?: { where?: { pregunta_id?: number } }) =>
      referencias.has(consulta?.where?.pregunta_id ?? 0)
        ? { revisada_en: new Date('2026-01-01T00:00:00.000Z') }
        : null,
    ),
  };
  const correccionRepository = {
    findOne: jest.fn(
      async (consulta?: {
        where?: Record<string, unknown>;
        order?: { intento?: string };
      }) => {
        const where = consulta?.where ?? {};
        const coincidencias = buscarPorClave(where);
        if (where.estado !== undefined) {
          return (
            coincidencias.find((propuesta) =>
              ESTADOS_ACTIVOS.includes(propuesta.estado as string),
            ) ?? null
          );
        }
        return (
          coincidencias.sort(
            (a, b) => (b.intento as number) - (a.intento as number),
          )[0] ?? null
        );
      },
    ),
    create: jest.fn((propuesta: Record<string, unknown>) => propuesta),
    save: jest.fn(async (propuesta: Record<string, unknown>) => {
      const error = opciones.erroresGuardar?.get(
        clave(
          propuesta.estudiante_id as number,
          propuesta.pregunta_id as number,
          propuesta.letra as string,
        ),
      );
      if (error) {
        throw error;
      }

      const guardada = {
        ...propuesta,
        propuesta_id:
          (propuesta.propuesta_id as number | undefined) ?? siguienteId++,
      };
      const indice = propuestas.findIndex(
        (existente) =>
          existente.propuesta_id !== undefined &&
          existente.propuesta_id === guardada.propuesta_id,
      );
      if (indice >= 0) {
        propuestas[indice] = guardada;
      } else {
        propuestas.push(guardada);
      }
      return guardada;
    }),
    delete: jest.fn(),
  };

  const repositorios = new Map<unknown, object>([
    [Examen, examenRepository],
    [Rendicion, rendicionRepository],
    [RespuestaInciso, respuestaRepository],
    [Inciso, incisoRepository],
    [OpcionMarcada, opcionRepository],
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
  const transaction = jest.fn(
    async (ejecutar: (manager: EntityManager) => Promise<unknown>) =>
      ejecutar(manager as unknown as EntityManager),
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
  const aplicarValoracionOficial = jest.fn();
  const revision = {
    aplicarValoracionOficial,
  } as unknown as RevisionCalificacionesService;

  return {
    servicio: new CorreccionIaService(dataSource, revision),
    propuestas,
    examenRepository,
    rendicionRepository,
    respuestaRepository,
    correccionRepository,
    transaction,
    aplicarValoracionOficial,
  };
}

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

const solicitarLote = (servicio: CorreccionIaService) =>
  servicio.solicitarLote(7, 12);

describe('CorreccionIaService.solicitarLote', () => {
  const entornoOriginal = process.env.IA_CORRECCION_LOTE_MAX;

  afterEach(() => {
    if (entornoOriginal === undefined) {
      delete process.env.IA_CORRECCION_LOTE_MAX;
    } else {
      process.env.IA_CORRECCION_LOTE_MAX = entornoOriginal;
    }
  });

  it('crea las propuestas asistibles y omite cada inciso con su motivo', async () => {
    const contexto = crearContextoLote({
      respuestas: [
        {
          estudiante_id: 21,
          pregunta_id: 31,
          letra: 'a',
          respuesta_texto: 'Respuesta válida',
        },
        {
          estudiante_id: 22,
          pregunta_id: 32,
          letra: 'a',
          respuesta_texto: 'Respuesta con propuesta activa',
        },
        {
          estudiante_id: 23,
          pregunta_id: 33,
          letra: 'a',
          respuesta_texto: '',
        },
        {
          estudiante_id: 24,
          pregunta_id: 34,
          letra: 'a',
          solucion: null,
        },
        {
          estudiante_id: 25,
          pregunta_id: 35,
          letra: 'a',
          puntaje_max: 'NaN',
        },
        {
          estudiante_id: 26,
          pregunta_id: 36,
          letra: 'a',
          estado_correccion: 'manual',
          puntaje_obtenido: '5.00',
        },
      ],
      propuestasIniciales: [
        {
          propuesta_id: 90,
          estudiante_id: 22,
          examen_id: 7,
          pregunta_id: 32,
          letra: 'a',
          estado: 'pendiente',
          intento: 1,
        },
      ],
    });

    const resultado = await solicitarLote(contexto.servicio);

    // El inciso 34 no tiene rúbrica ni solución, pero es de desarrollo: se
    // corrige con el criterio predeterminado y por tanto se solicita.
    expect(resultado.solicitadas).toBe(2);
    expect(resultado.omitidas).toBe(4);
    expect(resultado.detalle_omitidas).toEqual([
      {
        estudiante_id: 22,
        pregunta_id: 32,
        letra: 'a',
        motivo: expect.stringContaining('propuesta activa'),
      },
      {
        estudiante_id: 23,
        pregunta_id: 33,
        letra: 'a',
        motivo: expect.stringContaining('vacía'),
      },
      {
        estudiante_id: 25,
        pregunta_id: 35,
        letra: 'a',
        motivo: expect.stringContaining('puntaje máximo'),
      },
      {
        estudiante_id: 26,
        pregunta_id: 36,
        letra: 'a',
        motivo: expect.stringContaining('ya fue corregido'),
      },
    ]);
    expect(contexto.propuestas).toHaveLength(3);
    expect(contexto.propuestas[1]).toMatchObject({
      estudiante_id: 21,
      examen_id: 7,
      pregunta_id: 31,
      letra: 'a',
      docente_id: 12,
      estado: 'pendiente',
      intento: 1,
      puntaje_sugerido: null,
      confianza: null,
    });
    expect(contexto.correccionRepository.save).toHaveBeenCalledTimes(2);
    expect(contexto.aplicarValoracionOficial).not.toHaveBeenCalled();
    expect(contexto.examenRepository.save).not.toHaveBeenCalled();
    expect(contexto.examenRepository.update).not.toHaveBeenCalled();
    expect(contexto.rendicionRepository.save).not.toHaveBeenCalled();
    expect(contexto.rendicionRepository.update).not.toHaveBeenCalled();
    expect(contexto.respuestaRepository.save).not.toHaveBeenCalled();
    expect(contexto.respuestaRepository.update).not.toHaveBeenCalled();
  });

  it('es idempotente: una segunda llamada no duplica propuestas activas', async () => {
    const contexto = crearContextoLote({
      respuestas: [
        {
          estudiante_id: 21,
          pregunta_id: 31,
          letra: 'a',
          respuesta_texto: 'Respuesta válida',
        },
      ],
    });

    await expect(solicitarLote(contexto.servicio)).resolves.toMatchObject({
      solicitadas: 1,
      omitidas: 0,
    });
    await expect(solicitarLote(contexto.servicio)).resolves.toMatchObject({
      solicitadas: 0,
      omitidas: 1,
    });

    expect(contexto.propuestas).toHaveLength(1);
    expect(contexto.correccionRepository.save).toHaveBeenCalledTimes(1);
  });

  it('devuelve 404 cuando el examen no pertenece al docente', async () => {
    const contexto = crearContextoLote({ examen: null });

    await esperarErrorCodigo(
      solicitarLote(contexto.servicio),
      404,
      'EXAMEN_NO_ENCONTRADO',
    );
    expect(contexto.rendicionRepository.find).not.toHaveBeenCalled();
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    [{ calificaciones_revisadas_en: new Date() }, 'REVISION_CERRADA'],
    [{ resultados_publicados_en: new Date() }, 'RESULTADOS_PUBLICADOS'],
  ])(
    'devuelve 409 con el código existente si el examen está cerrado',
    async (cierre, codigo) => {
      const contexto = crearContextoLote({
        examen: {
          examen_id: 7,
          docente_id: 12,
          calificaciones_revisadas_en: null,
          resultados_publicados_en: null,
          ...cierre,
        },
        respuestas: [
          {
            estudiante_id: 21,
            pregunta_id: 31,
            letra: 'a',
          },
        ],
      });

      await esperarErrorCodigo(solicitarLote(contexto.servicio), 409, codigo);
      expect(contexto.rendicionRepository.find).not.toHaveBeenCalled();
      expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
    },
  );

  it('crea hasta el límite configurado e informa las omisiones restantes', async () => {
    process.env.IA_CORRECCION_LOTE_MAX = '2';
    const contexto = crearContextoLote({
      respuestas: [21, 22, 23].map((estudiante_id) => ({
        estudiante_id,
        pregunta_id: 31,
        letra: 'a',
        respuesta_texto: `Respuesta ${estudiante_id}`,
      })),
    });

    const resultado = await solicitarLote(contexto.servicio);

    expect(resultado.solicitadas).toBe(2);
    expect(resultado.omitidas).toBe(1);
    expect(resultado.detalle_omitidas).toEqual([
      {
        estudiante_id: 23,
        pregunta_id: 31,
        letra: 'a',
        motivo: expect.stringContaining('límite'),
      },
    ]);
    expect(contexto.propuestas).toHaveLength(2);
  });

  it('acota la consulta de rendiciones al estudiante indicado', async () => {
    const contexto = crearContextoLote({
      respuestas: [
        {
          estudiante_id: 21,
          pregunta_id: 31,
          letra: 'a',
          respuesta_texto: 'Respuesta válida',
        },
      ],
    });

    await contexto.servicio.solicitarLote(7, 12, 21);

    const consulta = (
      contexto.rendicionRepository.find.mock.calls as unknown as Array<
        [{ where: Record<string, unknown> }]
      >
    )[0][0];
    expect(consulta.where).toMatchObject({ examen_id: 7, estudiante_id: 21 });
  });

  it('sin estudiante consulta todas las rendiciones del examen', async () => {
    const contexto = crearContextoLote({ respuestas: [] });

    await solicitarLote(contexto.servicio);

    const consulta = (
      contexto.rendicionRepository.find.mock.calls as unknown as Array<
        [{ where: Record<string, unknown> }]
      >
    )[0][0];
    expect(consulta.where).not.toHaveProperty('estudiante_id');
  });

  it('aplica el límite por defecto de 500 incisos', async () => {
    delete process.env.IA_CORRECCION_LOTE_MAX;
    const contexto = crearContextoLote({
      respuestas: Array.from({ length: 501 }, (_, indice) => ({
        estudiante_id: 1000 + indice,
        pregunta_id: 31,
        letra: 'a',
        respuesta_texto: `Respuesta ${indice}`,
      })),
    });

    const resultado = await solicitarLote(contexto.servicio);

    expect(resultado.solicitadas).toBe(500);
    expect(resultado.omitidas).toBe(1);
    expect(resultado.detalle_omitidas).toEqual([
      {
        estudiante_id: 1500,
        pregunta_id: 31,
        letra: 'a',
        motivo: expect.stringContaining('límite'),
      },
    ]);
    expect(contexto.propuestas).toHaveLength(500);
  });

  it('continúa con los demás incisos cuando falla el guardado de uno', async () => {
    const contexto = crearContextoLote({
      respuestas: [
        {
          estudiante_id: 21,
          pregunta_id: 31,
          letra: 'a',
        },
        {
          estudiante_id: 22,
          pregunta_id: 31,
          letra: 'a',
        },
      ],
      erroresGuardar: new Map([['21:31:a', new Error('fallo aislado')]]),
    });

    const resultado = await solicitarLote(contexto.servicio);

    expect(resultado.solicitadas).toBe(1);
    expect(resultado.omitidas).toBe(1);
    expect(resultado.detalle_omitidas[0]).toMatchObject({
      estudiante_id: 21,
      pregunta_id: 31,
      letra: 'a',
      motivo: expect.stringContaining('No se pudo crear'),
    });
    expect(contexto.propuestas).toHaveLength(1);
    expect(contexto.propuestas[0]).toMatchObject({ estudiante_id: 22 });
  });

  it('no consulta rendiciones cuando no hay respuestas en rendiciones enviadas', async () => {
    const contexto = crearContextoLote({ respuestas: [], rendiciones: [] });

    await expect(solicitarLote(contexto.servicio)).resolves.toEqual({
      solicitadas: 0,
      omitidas: 0,
      detalle_omitidas: [],
    });
    expect(contexto.correccionRepository.save).not.toHaveBeenCalled();
  });
});


