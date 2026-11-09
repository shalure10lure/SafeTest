import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

let RendicionService: typeof import('./rendicion.service').RendicionService;
let Rendicion: typeof import('./entity/rendicion.entity').Rendicion;
let AsignacionPregunta: typeof import('../asignacionpregunta/entity/asignacionpregunta.entity').AsignacionPregunta;
let ExamenPregunta: typeof import('../examenpregunta/entity/examenpregunta.entity').ExamenPregunta;
let ExamenTema: typeof import('../examentema/entity/examentema.entity').ExamenTema;
let Inciso: typeof import('../inciso/entity/inciso.entity').Inciso;
let Inscripcion: typeof import('../inscripcion/entity/inscripcion.entity').Inscripcion;
let Opcion: typeof import('../opcion/entity/opcion.entity').Opcion;
let OpcionMarcada: typeof import('../opcionmarcada/entity/opcionmarcada.entity').OpcionMarcada;
let ParaleloExamen: typeof import('../paraleloexamen/entity/paraleloexamen.entity').ParaleloExamen;
let Pregunta: typeof import('../pregunta/entity/pregunta.entity').Pregunta;
let RespuestaInciso: typeof import('../respuestainciso/entity/respuestainciso.entity').RespuestaInciso;

beforeAll(async () => {
  jest.unstable_mockModule('./entity/rendicion.entity', () => ({
    Rendicion: class Rendicion {},
  }));
  jest.unstable_mockModule(
    '../asignacionpregunta/entity/asignacionpregunta.entity',
    () => ({ AsignacionPregunta: class AsignacionPregunta {} }),
  );
  jest.unstable_mockModule(
    '../examenpregunta/entity/examenpregunta.entity',
    () => ({ ExamenPregunta: class ExamenPregunta {} }),
  );
  jest.unstable_mockModule('../examentema/entity/examentema.entity', () => ({
    ExamenTema: class ExamenTema {},
  }));
  jest.unstable_mockModule('../inciso/entity/inciso.entity', () => ({
    Inciso: class Inciso {},
  }));
  jest.unstable_mockModule('../inscripcion/entity/inscripcion.entity', () => ({
    Inscripcion: class Inscripcion {},
  }));
  jest.unstable_mockModule(
    '../paraleloexamen/entity/paraleloexamen.entity',
    () => ({ ParaleloExamen: class ParaleloExamen {} }),
  );
  jest.unstable_mockModule(
    '../opcionmarcada/entity/opcionmarcada.entity',
    () => ({ OpcionMarcada: class OpcionMarcada {} }),
  );
  jest.unstable_mockModule('../opcion/entity/opcion.entity', () => ({
    Opcion: class Opcion {},
  }));
  jest.unstable_mockModule('../pregunta/entity/pregunta.entity', () => ({
    Pregunta: class Pregunta {},
  }));
  jest.unstable_mockModule(
    '../respuestainciso/entity/respuestainciso.entity',
    () => ({ RespuestaInciso: class RespuestaInciso {} }),
  );
  jest.unstable_mockModule('../examen/examen-acceso.service', () => ({
    ExamenAccesoService: class ExamenAccesoService {},
  }));

  ({ RendicionService } = await import('./rendicion.service'));
  ({ Rendicion } = await import('./entity/rendicion.entity'));
  ({ AsignacionPregunta } =
    await import('../asignacionpregunta/entity/asignacionpregunta.entity'));
  ({ ExamenPregunta } =
    await import('../examenpregunta/entity/examenpregunta.entity'));
  ({ ExamenTema } = await import('../examentema/entity/examentema.entity'));
  ({ Inciso } = await import('../inciso/entity/inciso.entity'));
  ({ Inscripcion } = await import('../inscripcion/entity/inscripcion.entity'));
  ({ Opcion } = await import('../opcion/entity/opcion.entity'));
  ({ OpcionMarcada } =
    await import('../opcionmarcada/entity/opcionmarcada.entity'));
  ({ ParaleloExamen } =
    await import('../paraleloexamen/entity/paraleloexamen.entity'));
  ({ Pregunta } = await import('../pregunta/entity/pregunta.entity'));
  ({ RespuestaInciso } =
    await import('../respuestainciso/entity/respuestainciso.entity'));
});

function prepararServicio({
  existente = null,
  paraleloRelacionado = 1,
  inscripcion = 1,
  preguntasManual = [{ pregunta_id: 21, orden: 1 }],
  criterios = [],
  preguntasTema = [],
  rendicionActiva = {
    estudiante_id: 9,
    examen_id: 5,
    paralelo_id: 7,
    estado: 'en_curso',
    fecha_inicio: new Date('2026-11-08T14:00:00.000Z'),
  },
  asignacionesRendicion = [{ pregunta_id: 21, orden: 1 }],
  filasPreguntas = [
    {
      pregunta_id: 21,
      enunciado: 'Enunciado seguro',
      letra: 'a',
      enunciado_inciso: 'Inciso seguro',
      tipo_respuesta: 'opcion_unica',
      nro_opcion: 1,
      texto_opcion: 'Alternativa',
    },
  ],
  respuestas = [],
  opcionesMarcadas = [],
  inciso = {
    pregunta_id: 21,
    letra: 'a',
    tipo_respuesta: 'opcion_unica',
  },
  incisos = inciso ? [inciso] : [],
  opcionesDisponibles = [{ nro_opcion: 1, texto_opcion: 'Alternativa' }],
}: {
  existente?: Record<string, unknown> | null;
  paraleloRelacionado?: number;
  inscripcion?: number;
  preguntasManual?: { pregunta_id: number; orden: number }[];
  criterios?: { tema_id: number; cantidad: number }[];
  preguntasTema?: { pregunta_id: number }[];
  rendicionActiva?: Record<string, unknown> | null;
  asignacionesRendicion?: { pregunta_id: number; orden: number }[];
  filasPreguntas?: Record<string, unknown>[];
  respuestas?: Record<string, unknown>[];
  opcionesMarcadas?: Record<string, unknown>[];
  inciso?: Record<string, unknown> | null;
  incisos?: Record<string, unknown>[];
  opcionesDisponibles?: Record<string, unknown>[];
} = {}) {
  const builder = {
    insert: jest.fn(),
    values: jest.fn(),
    orIgnore: jest.fn(),
    returning: jest.fn(),
    execute: jest.fn(),
  };
  builder.insert.mockReturnValue(builder);
  builder.values.mockReturnValue(builder);
  builder.orIgnore.mockReturnValue(builder);
  builder.returning.mockReturnValue(builder);
  builder.execute.mockResolvedValue({ raw: [{ estudiante_id: 9 }] });

  const rendicionRepository = {
    findOneBy: jest
      .fn()
      .mockResolvedValueOnce(existente)
      .mockResolvedValue({
        estudiante_id: 9,
        examen_id: 5,
        paralelo_id: 7,
        estado: 'en_curso',
        fecha_inicio: new Date('2026-11-08T14:00:00.000Z'),
      }),
    findOne: jest.fn().mockResolvedValue(rendicionActiva),
    createQueryBuilder: jest.fn().mockReturnValue(builder),
  };
  const asignacionRepository = {
    insert: jest.fn(),
    find: jest.fn().mockResolvedValue(asignacionesRendicion),
    findOne: jest.fn().mockResolvedValue({ pregunta_id: 21 }),
  };
  const examenPreguntaRepository = {
    find: jest.fn().mockResolvedValue(preguntasManual),
  };
  const examenTemaRepository = {
    find: jest.fn().mockResolvedValue(criterios),
  };
  const paraleloExamenRepository = {
    count: jest.fn().mockResolvedValue(paraleloRelacionado),
  };
  const inscripcionRepository = {
    count: jest.fn().mockResolvedValue(inscripcion),
  };
  const preguntaQueryBuilder = {
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    getRawMany: jest.fn().mockResolvedValue(filasPreguntas),
  };
  for (const metodo of [
    'innerJoin',
    'leftJoin',
    'select',
    'addSelect',
    'where',
    'orderBy',
    'addOrderBy',
  ] as const) {
    preguntaQueryBuilder[metodo].mockReturnValue(preguntaQueryBuilder);
  }
  const preguntaRepository = {
    find: jest.fn().mockResolvedValue(preguntasTema),
    createQueryBuilder: jest.fn().mockReturnValue(preguntaQueryBuilder),
  };
  const respuestasGuardadas = [...respuestas];
  const respuestaRepository = {
    find: jest.fn().mockImplementation(async () => respuestasGuardadas),
    upsert: jest
      .fn()
      .mockImplementation(async (respuesta: Record<string, unknown>) => {
        const indice = respuestasGuardadas.findIndex(
          (existente) =>
            existente.estudiante_id === respuesta.estudiante_id &&
            existente.examen_id === respuesta.examen_id &&
            existente.pregunta_id === respuesta.pregunta_id &&
            existente.letra === respuesta.letra,
        );
        if (indice === -1) respuestasGuardadas.push(respuesta);
        else respuestasGuardadas[indice] = respuesta;
        return {};
      }),
  };
  const opcionesMarcadasGuardadas = [...opcionesMarcadas];
  const opcionMarcadaRepository = {
    find: jest.fn().mockImplementation(async () => opcionesMarcadasGuardadas),
    delete: jest.fn().mockImplementation(async (clave) => {
      for (
        let indice = opcionesMarcadasGuardadas.length - 1;
        indice >= 0;
        indice--
      ) {
        const opcion = opcionesMarcadasGuardadas[indice];
        if (
          opcion.estudiante_id === clave.estudiante_id &&
          opcion.examen_id === clave.examen_id &&
          opcion.pregunta_id === clave.pregunta_id &&
          opcion.letra === clave.letra
        ) {
          opcionesMarcadasGuardadas.splice(indice, 1);
        }
      }
      return { affected: 0 };
    }),
    insert: jest.fn().mockImplementation(async (nuevasOpciones) => {
      opcionesMarcadasGuardadas.push(...nuevasOpciones);
      return {};
    }),
  };
  const incisoRepository = {
    findOne: jest
      .fn()
      .mockImplementation(
        async ({ where }) =>
          incisos.find(
            (item) =>
              item.pregunta_id === where.pregunta_id &&
              item.letra === where.letra,
          ) ?? null,
      ),
    find: jest.fn().mockResolvedValue(incisos),
  };
  const opcionRepository = {
    find: jest.fn().mockResolvedValue(opcionesDisponibles),
  };
  const repositorios = new Map([
    [Rendicion, rendicionRepository],
    [AsignacionPregunta, asignacionRepository],
    [ExamenPregunta, examenPreguntaRepository],
    [ExamenTema, examenTemaRepository],
    [ParaleloExamen, paraleloExamenRepository],
    [Inscripcion, inscripcionRepository],
    [Pregunta, preguntaRepository],
    [RespuestaInciso, respuestaRepository],
    [OpcionMarcada, opcionMarcadaRepository],
    [Inciso, incisoRepository],
    [Opcion, opcionRepository],
  ]);
  const manager = {
    getRepository: jest.fn((entidad: unknown) => repositorios.get(entidad)),
  };
  const dataSource = {
    transaction: jest.fn(
      async (ejecutar: (manager: EntityManager) => Promise<unknown>) =>
        ejecutar(manager as unknown as EntityManager),
    ),
  };
  const examenAccesoService = {
    obtenerExamenParaRendicion: jest.fn().mockResolvedValue({
      modo_asignacion: 'estudiantes',
      modo_seleccion: criterios.length ? 'aleatorio' : 'manual',
      orden_preguntas: 'definido',
    }),
  };

  const service = new RendicionService(
    dataSource as unknown as DataSource,
    examenAccesoService as never,
  );

  return {
    service,
    dataSource,
    examenAccesoService,
    manager,
    builder,
    rendicionRepository,
    asignacionRepository,
    examenPreguntaRepository,
    examenTemaRepository,
    paraleloExamenRepository,
    inscripcionRepository,
    preguntaRepository,
    preguntaQueryBuilder,
    respuestaRepository,
    opcionMarcadaRepository,
    incisoRepository,
    opcionRepository,
  };
}

describe('RendicionService.iniciarORecuperar', () => {
  it('inicia un intento asignado y devuelve solo el contexto de preguntas', async () => {
    const montaje = prepararServicio();

    const resultado = await montaje.service.iniciarORecuperar(5, 9, {
      paralelo_id: 7,
    });

    expect(
      montaje.examenAccesoService.obtenerExamenParaRendicion,
    ).toHaveBeenCalledWith(5, 9);
    expect(montaje.builder.values).toHaveBeenCalledWith(
      expect.objectContaining({
        estudiante_id: 9,
        examen_id: 5,
        paralelo_id: 7,
        estado: 'en_curso',
      }),
    );
    expect(montaje.builder.orIgnore).toHaveBeenCalledTimes(1);
    expect(montaje.asignacionRepository.insert).toHaveBeenCalledWith([
      {
        estudiante_id: 9,
        examen_id: 5,
        pregunta_id: 21,
        orden: 1,
      },
    ]);
    expect(resultado).toEqual({
      examen_id: 5,
      paralelo_id: 7,
      estado: 'en_curso',
      fecha_inicio: expect.any(Date),
      preguntas: [{ pregunta_id: 21, orden: 1 }],
      recuperada: false,
    });
    expect(JSON.stringify(resultado)).not.toMatch(
      /respuesta|correcta|explicacion|calificacion|nota|puntaje/i,
    );
  });

  describe('RendicionService.guardarRespuesta', () => {
    it('guarda una opción válida asociada al inciso y a la rendición del estudiante', async () => {
      const montaje = prepararServicio();

      const resultado = await montaje.service.guardarRespuesta(5, 9, 21, 'a', {
        opciones: [1],
      });

      expect(montaje.rendicionRepository.findOne).toHaveBeenCalledWith({
        where: { examen_id: 5, estudiante_id: 9 },
        select: { examen_id: true, estudiante_id: true, estado: true },
        lock: { mode: 'pessimistic_write' },
      });
      expect(montaje.asignacionRepository.findOne).toHaveBeenCalledWith({
        where: { examen_id: 5, estudiante_id: 9, pregunta_id: 21 },
        select: { pregunta_id: true },
      });
      expect(montaje.respuestaRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          estudiante_id: 9,
          examen_id: 5,
          pregunta_id: 21,
          letra: 'a',
          respuesta_texto: null,
        }),
        ['estudiante_id', 'examen_id', 'pregunta_id', 'letra'],
      );
      expect(montaje.opcionMarcadaRepository.insert).toHaveBeenCalledWith([
        {
          estudiante_id: 9,
          examen_id: 5,
          pregunta_id: 21,
          letra: 'a',
          nro_opcion: 1,
        },
      ]);
      expect(resultado).toMatchObject({
        examen_id: 5,
        pregunta_id: 21,
        letra: 'a',
        estado_respuesta: 'respondida',
        guardado_en: expect.any(Date),
      });
      expect(JSON.stringify(resultado)).not.toMatch(
        /correcta|solucion|puntaje|retroalimentacion|calificacion|respuesta_texto/i,
      );
    });

    it('reemplaza las opciones marcadas en una modificación', async () => {
      const montaje = prepararServicio({
        inciso: {
          pregunta_id: 21,
          letra: 'a',
          tipo_respuesta: 'opcion_multiple',
        },
        opcionesDisponibles: [
          { nro_opcion: 1, texto_opcion: 'Primera' },
          { nro_opcion: 2, texto_opcion: 'Segunda' },
        ],
      });

      await montaje.service.guardarRespuesta(5, 9, 21, 'a', {
        opciones: [2, 1],
      });

      expect(montaje.opcionMarcadaRepository.delete).toHaveBeenCalledWith({
        estudiante_id: 9,
        examen_id: 5,
        pregunta_id: 21,
        letra: 'a',
      });
      expect(montaje.opcionMarcadaRepository.insert).toHaveBeenCalledWith([
        expect.objectContaining({ nro_opcion: 2 }),
        expect.objectContaining({ nro_opcion: 1 }),
      ]);
    });

    it('valida una opción única y las etiquetas de verdadero/falso', async () => {
      const multipleSingle = prepararServicio({
        opcionesDisponibles: [
          { nro_opcion: 1, texto_opcion: 'Una' },
          { nro_opcion: 2, texto_opcion: 'Dos' },
        ],
      });
      await expect(
        multipleSingle.service.guardarRespuesta(5, 9, 21, 'a', {
          opciones: [1, 2],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      const verdaderoFalso = prepararServicio({
        inciso: {
          pregunta_id: 21,
          letra: 'a',
          tipo_respuesta: 'verdadero_falso',
        },
        opcionesDisponibles: [{ nro_opcion: 2, texto_opcion: 'Falso' }],
      });
      const resultado = await verdaderoFalso.service.guardarRespuesta(
        5,
        9,
        21,
        'a',
        { opciones: [2] },
      );
      expect(resultado.estado_respuesta).toBe('respondida');

      verdaderoFalso.opcionRepository.find.mockResolvedValue([
        { nro_opcion: 2, texto_opcion: 'Alternativa inválida' },
      ]);
      await expect(
        verdaderoFalso.service.guardarRespuesta(5, 9, 21, 'a', {
          opciones: [2],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('guarda desarrollo y valida que las respuestas numéricas sean finitas', async () => {
      const desarrollo = prepararServicio({
        inciso: {
          pregunta_id: 21,
          letra: 'a',
          tipo_respuesta: 'desarrollo',
        },
      });
      await desarrollo.service.guardarRespuesta(5, 9, 21, 'a', {
        respuesta_texto: '  Texto de respuesta  ',
      });
      expect(desarrollo.respuestaRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ respuesta_texto: 'Texto de respuesta' }),
        expect.any(Array),
      );

      const numerica = prepararServicio({
        inciso: {
          pregunta_id: 21,
          letra: 'a',
          tipo_respuesta: 'numerica',
        },
      });
      await expect(
        numerica.service.guardarRespuesta(5, 9, 21, 'a', {
          respuesta_texto: 'no numérico',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(numerica.respuestaRepository.upsert).not.toHaveBeenCalled();

      const numericaValida = prepararServicio({
        inciso: {
          pregunta_id: 21,
          letra: 'a',
          tipo_respuesta: 'numerica',
        },
      });
      const resultado = await numericaValida.service.guardarRespuesta(
        5,
        9,
        21,
        'a',
        { respuesta_texto: '-1.25e2' },
      );
      expect(resultado.estado_respuesta).toBe('respondida');
    });

    it('mantiene pendiente la pregunta hasta responder todos sus incisos', async () => {
      const montaje = prepararServicio({
        inciso: {
          pregunta_id: 21,
          letra: 'a',
          tipo_respuesta: 'desarrollo',
        },
        incisos: [
          {
            pregunta_id: 21,
            letra: 'a',
            tipo_respuesta: 'desarrollo',
          },
          {
            pregunta_id: 21,
            letra: 'b',
            tipo_respuesta: 'numerica',
          },
        ],
      });

      const primeraRespuesta = await montaje.service.guardarRespuesta(
        5,
        9,
        21,
        'a',
        { respuesta_texto: 'Respuesta del primer inciso' },
      );
      expect(primeraRespuesta.estado_respuesta).toBe('pendiente');

      const ultimaRespuesta = await montaje.service.guardarRespuesta(
        5,
        9,
        21,
        'b',
        { respuesta_texto: '42' },
      );
      expect(ultimaRespuesta.estado_respuesta).toBe('respondida');
    });

    it('rechaza rendiciones inexistentes o cerradas y preguntas no asignadas', async () => {
      const inexistente = prepararServicio({ rendicionActiva: null });
      await expect(
        inexistente.service.guardarRespuesta(5, 99, 21, 'a', { opciones: [1] }),
      ).rejects.toBeInstanceOf(NotFoundException);

      const cerrada = prepararServicio({
        rendicionActiva: { estudiante_id: 9, examen_id: 5, estado: 'enviada' },
      });
      await expect(
        cerrada.service.guardarRespuesta(5, 9, 21, 'a', { opciones: [1] }),
      ).rejects.toBeInstanceOf(NotFoundException);

      const preguntaNoAsignada = prepararServicio();
      preguntaNoAsignada.asignacionRepository.findOne.mockResolvedValue(null);
      await expect(
        preguntaNoAsignada.service.guardarRespuesta(5, 9, 21, 'a', {
          opciones: [1],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(
        preguntaNoAsignada.respuestaRepository.upsert,
      ).not.toHaveBeenCalled();
    });

    it('rechaza incisos ajenos y opciones que no pertenecen al inciso', async () => {
      const incisoNoRelacionado = prepararServicio({ inciso: null });
      await expect(
        incisoNoRelacionado.service.guardarRespuesta(5, 9, 21, 'z', {
          opciones: [1],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      const opcionNoRelacionada = prepararServicio({ opcionesDisponibles: [] });
      await expect(
        opcionNoRelacionada.service.guardarRespuesta(5, 9, 21, 'a', {
          opciones: [999],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        opcionNoRelacionada.respuestaRepository.upsert,
      ).not.toHaveBeenCalled();
    });

    it('permite limpiar una respuesta de opción múltiple y la marca pendiente', async () => {
      const montaje = prepararServicio({
        inciso: {
          pregunta_id: 21,
          letra: 'a',
          tipo_respuesta: 'opcion_multiple',
        },
      });

      const resultado = await montaje.service.guardarRespuesta(5, 9, 21, 'a', {
        opciones: [],
      });

      expect(montaje.opcionRepository.find).not.toHaveBeenCalled();
      expect(montaje.opcionMarcadaRepository.delete).toHaveBeenCalled();
      expect(montaje.opcionMarcadaRepository.insert).not.toHaveBeenCalled();
      expect(resultado.estado_respuesta).toBe('pendiente');
    });
  });

  it('recupera un intento activo sin insertar otra rendición', async () => {
    const existente = {
      estudiante_id: 9,
      examen_id: 5,
      paralelo_id: 7,
      estado: 'en_curso',
      fecha_inicio: new Date('2026-11-08T14:00:00.000Z'),
    };
    const montaje = prepararServicio({ existente });
    montaje.asignacionRepository.find.mockResolvedValue([
      { pregunta_id: 31, orden: 1 },
    ]);

    const resultado = await montaje.service.iniciarORecuperar(5, 9, {
      paralelo_id: 7,
    });

    expect(montaje.builder.insert).not.toHaveBeenCalled();
    expect(montaje.asignacionRepository.insert).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({
      preguntas: [{ pregunta_id: 31, orden: 1 }],
      recuperada: true,
    });
  });

  describe('RendicionService.consultarPreguntasActivas', () => {
    it('consulta solo la rendición propia activa y conserva orden con estado de respuesta', async () => {
      const montaje = prepararServicio({
        asignacionesRendicion: [
          { pregunta_id: 31, orden: 1 },
          { pregunta_id: 21, orden: 2 },
        ],
        filasPreguntas: [
          {
            pregunta_id: 21,
            enunciado: 'Pregunta dos',
            letra: 'a',
            enunciado_inciso: 'Inciso',
            tipo_respuesta: 'opcion_unica',
            nro_opcion: 1,
            texto_opcion: 'Alternativa',
            explicacion: 'No debe salir',
            solucion_nro_opcion: 1,
            valor_correcto: '42',
          },
          {
            pregunta_id: 31,
            enunciado: 'Pregunta uno',
            letra: 'a',
            enunciado_inciso: 'Inciso',
            tipo_respuesta: 'desarrollo',
            nro_opcion: null,
            texto_opcion: null,
          },
        ],
        respuestas: [
          {
            pregunta_id: 31,
            letra: 'a',
            respuesta_texto: 'Respuesta escrita',
          },
        ],
        opcionesMarcadas: [
          {
            pregunta_id: 21,
            letra: 'a',
            nro_opcion: 1,
          },
        ],
      });

      const resultado = await montaje.service.consultarPreguntasActivas(5, 9);

      expect(montaje.rendicionRepository.findOne).toHaveBeenCalledWith({
        where: { examen_id: 5, estudiante_id: 9, estado: 'en_curso' },
        select: { examen_id: true, estudiante_id: true },
      });
      expect(montaje.asignacionRepository.find).toHaveBeenCalledWith({
        where: { examen_id: 5, estudiante_id: 9 },
        select: { pregunta_id: true, orden: true },
        order: { orden: 'ASC' },
      });
      expect(
        resultado.preguntas.map((pregunta) => pregunta.pregunta_id),
      ).toEqual([31, 21]);
      expect(
        resultado.preguntas.map((pregunta) => pregunta.estado_respuesta),
      ).toEqual(['respondida', 'respondida']);
      expect(montaje.examenPreguntaRepository.find).not.toHaveBeenCalled();

      const consultaTexto = JSON.stringify(resultado);
      expect(consultaTexto).not.toMatch(
        /correcta|explicacion|solucion|retroalimentacion|puntaje|calificacion|nota_final/i,
      );
      // La respuesta guardada es del propio estudiante y sí se devuelve.
      const [primera, segunda] = resultado.preguntas;
      expect(primera.incisos[0].respuesta).toEqual({
        respuesta_texto: 'Respuesta escrita',
      });
      expect(segunda.incisos[0].respuesta).toEqual({ opciones: [1] });
      const selections = montaje.preguntaQueryBuilder.select.mock.calls
        .flat()
        .concat(montaje.preguntaQueryBuilder.addSelect.mock.calls.flat())
        .join(' ');
      expect(selections).not.toMatch(
        /explicacion|solucion|correcta|puntaje|respuesta_texto/i,
      );
    });

    it('no incluye respuesta en los incisos que el estudiante aún no contestó', async () => {
      const montaje = prepararServicio({
        filasPreguntas: [
          {
            pregunta_id: 21,
            enunciado: 'Pregunta',
            letra: 'a',
            enunciado_inciso: 'Inciso',
            tipo_respuesta: 'desarrollo',
            nro_opcion: null,
            texto_opcion: null,
          },
        ],
        respuestas: [{ pregunta_id: 21, letra: 'a', respuesta_texto: '   ' }],
        opcionesMarcadas: [],
      });

      const resultado = await montaje.service.consultarPreguntasActivas(5, 9);

      expect(resultado.preguntas[0].incisos[0]).not.toHaveProperty('respuesta');
      expect(resultado.preguntas[0].estado_respuesta).toBe('pendiente');
    });

    it('rechaza una rendición inexistente o perteneciente a otro estudiante', async () => {
      const montaje = prepararServicio({ rendicionActiva: null });

      await expect(
        montaje.service.consultarPreguntasActivas(5, 99),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(montaje.rendicionRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { examen_id: 5, estudiante_id: 99, estado: 'en_curso' },
        }),
      );
      expect(montaje.asignacionRepository.find).not.toHaveBeenCalled();
    });

    it('rechaza las rendiciones que no están en curso', async () => {
      const montaje = prepararServicio({
        rendicionActiva: null,
      });

      await expect(
        montaje.service.consultarPreguntasActivas(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('no recurre a ExamenPregunta si faltan asignaciones para la rendición', async () => {
      const montaje = prepararServicio({ asignacionesRendicion: [] });

      await expect(
        montaje.service.consultarPreguntasActivas(5, 9),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(montaje.examenPreguntaRepository.find).not.toHaveBeenCalled();
      expect(
        montaje.preguntaRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
    });

    it('marca pendiente una pregunta con un inciso sin respuesta válida', async () => {
      const montaje = prepararServicio({
        filasPreguntas: [
          {
            pregunta_id: 21,
            enunciado: 'Pregunta',
            letra: 'a',
            enunciado_inciso: 'Inciso A',
            tipo_respuesta: 'desarrollo',
            nro_opcion: null,
            texto_opcion: null,
          },
          {
            pregunta_id: 21,
            enunciado: 'Pregunta',
            letra: 'b',
            enunciado_inciso: 'Inciso B',
            tipo_respuesta: 'numerica',
            nro_opcion: null,
            texto_opcion: null,
          },
        ],
        respuestas: [
          { pregunta_id: 21, letra: 'a', respuesta_texto: 'Texto listo' },
          { pregunta_id: 21, letra: 'b', respuesta_texto: 'no es numérico' },
        ],
      });

      const resultado = await montaje.service.consultarPreguntasActivas(5, 9);

      expect(resultado.preguntas[0].estado_respuesta).toBe('pendiente');
    });
  });

  it('recupera la rendición ganadora cuando otra solicitud ya creó la clave única', async () => {
    const existente = {
      estudiante_id: 9,
      examen_id: 5,
      paralelo_id: 7,
      estado: 'en_curso',
      fecha_inicio: new Date('2026-11-08T14:00:00.000Z'),
    };
    const montaje = prepararServicio();
    montaje.builder.execute.mockResolvedValueOnce({ raw: [] });
    montaje.rendicionRepository.findOneBy.mockReset();
    montaje.rendicionRepository.findOneBy
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existente);
    montaje.asignacionRepository.find.mockResolvedValue([
      { pregunta_id: 21, orden: 1 },
    ]);

    const resultado = await montaje.service.iniciarORecuperar(5, 9, {
      paralelo_id: 7,
    });

    expect(resultado.recuperada).toBe(true);
    expect(resultado.preguntas).toEqual([{ pregunta_id: 21, orden: 1 }]);
    expect(montaje.asignacionRepository.insert).not.toHaveBeenCalled();
  });

  it('rechaza un paralelo que no pertenece a la evaluación', async () => {
    const montaje = prepararServicio({ paraleloRelacionado: 0 });

    await expect(
      montaje.service.iniciarORecuperar(5, 9, { paralelo_id: 77 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(montaje.builder.insert).not.toHaveBeenCalled();
  });

  it('conserva las preguntas aleatorias materializadas al recuperar el intento', async () => {
    const montaje = prepararServicio({
      criterios: [{ tema_id: 4, cantidad: 2 }],
      preguntasTema: [
        { pregunta_id: 10 },
        { pregunta_id: 11 },
        { pregunta_id: 12 },
      ],
    });
    const asignadas: { pregunta_id: number; orden: number }[] = [];
    montaje.asignacionRepository.insert.mockImplementation(
      async (filas: { pregunta_id: number; orden: number }[]) => {
        asignadas.push(...filas);
      },
    );

    const primera = await montaje.service.iniciarORecuperar(5, 9, {
      paralelo_id: 7,
    });
    montaje.rendicionRepository.findOneBy.mockResolvedValueOnce({
      estudiante_id: 9,
      examen_id: 5,
      paralelo_id: 7,
      estado: 'en_curso',
      fecha_inicio: primera.fecha_inicio,
    });
    montaje.asignacionRepository.find.mockResolvedValue(
      asignadas.map(({ pregunta_id, orden }) => ({ pregunta_id, orden })),
    );

    const recuperada = await montaje.service.iniciarORecuperar(5, 9, {
      paralelo_id: 7,
    });

    expect(primera.preguntas).toEqual(recuperada.preguntas);
    expect(montaje.examenTemaRepository.find).toHaveBeenCalledTimes(1);
    expect(recuperada.recuperada).toBe(true);
  });

  it('no recupera rendiciones que ya no están en curso', async () => {
    const montaje = prepararServicio({
      existente: {
        estudiante_id: 9,
        examen_id: 5,
        paralelo_id: 7,
        estado: 'enviada',
        fecha_inicio: new Date(),
      },
    });

    await expect(
      montaje.service.iniciarORecuperar(5, 9, { paralelo_id: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
