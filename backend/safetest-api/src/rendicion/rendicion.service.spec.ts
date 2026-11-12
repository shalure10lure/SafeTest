import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';
import { Examen } from '../examen/entity/examen.entity';
import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { ExamenTema } from '../examentema/entity/examentema.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';
import { Opcion } from '../opcion/entity/opcion.entity';
import { OpcionMarcada } from '../opcionmarcada/entity/opcionmarcada.entity';
import { ParaleloExamen } from '../paraleloexamen/entity/paraleloexamen.entity';
import { Pregunta } from '../pregunta/entity/pregunta.entity';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import type { GuardarRespuestaEstudianteDto } from './dto/guardar-respuesta-estudiante.dto';
import { Rendicion } from './entity/rendicion.entity';
import { RendicionService } from './rendicion.service';

/**
 * Las entidades solo se usan como tokens de repositorio. Se trabaja con
 * repositorios simulados; no se toca ninguna base de datos.
 */

function prepararServicio({
  examen = {
    duracion_min: null,
    disponible_hasta: null,
    al_terminar_tiempo: 'enviar_automatico',
  },
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
  examen?: Record<string, unknown> | null;
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
    findOne: jest.fn().mockResolvedValue(rendicionActiva),
    save: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue(builder),
  };
  const examenRepository = {
    findOne: jest.fn().mockResolvedValue(examen),
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
    [Examen, examenRepository],
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
  const correccionRendicionService = {
    corregirRendicion: jest.fn().mockResolvedValue({
      respuestasAutomaticas: 0,
      pendientesRevision: 0,
      notaFinal: null,
      completa: false,
    }),
  };

  const service = new RendicionService(
    dataSource as unknown as DataSource,
    examenAccesoService as never,
    correccionRendicionService as never,
  );

  return {
    service,
    dataSource,
    examenAccesoService,
    correccionRendicionService,
    manager,
    builder,
    rendicionRepository,
    examenRepository,
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

const RENDICION_NUEVA = {
  estudiante_id: 9,
  examen_id: 5,
  paralelo_id: 7,
  estado: 'en_curso',
  fecha_inicio: new Date('2026-11-08T14:00:00.000Z'),
};

/**
 * iniciarORecuperar lee la rendición tres veces (HU-17):
 * 1) finalizarSiVencida, 2) lectura con bloqueo, 3) lectura tras el INSERT.
 */
function secuenciaIniciar(
  montaje: ReturnType<typeof prepararServicio>,
  existente: Record<string, unknown> | null,
  creada: Record<string, unknown> | null = RENDICION_NUEVA,
) {
  montaje.rendicionRepository.findOne.mockReset();
  montaje.rendicionRepository.findOne
    .mockResolvedValueOnce(existente)
    .mockResolvedValueOnce(existente)
    .mockResolvedValueOnce(creada);
}

describe('RendicionService.iniciarORecuperar', () => {
  it('inicia un intento asignado y devuelve solo el contexto de preguntas', async () => {
    const montaje = prepararServicio();
    secuenciaIniciar(montaje, null);

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

    it('no copia calificaciones enviadas por el cliente al guardar una respuesta', async () => {
      const montaje = prepararServicio();
      const dto = {
        opciones: [1],
        puntaje_obtenido: '10.00',
        estado_correccion: 'automatica',
      } as unknown as GuardarRespuestaEstudianteDto;

      await montaje.service.guardarRespuesta(5, 9, 21, 'a', dto);

      const [datosGuardados] = montaje.respuestaRepository.upsert.mock
        .calls[0] as [Record<string, unknown>];

      expect(datosGuardados).not.toHaveProperty('puntaje_obtenido');
      expect(datosGuardados).not.toHaveProperty('estado_correccion');
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
      ).rejects.toBeInstanceOf(ConflictException);

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
    const montaje = prepararServicio();
    secuenciaIniciar(montaje, { ...RENDICION_NUEVA });
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
        where: { examen_id: 5, estudiante_id: 9 },
        lock: { mode: 'pessimistic_write' },
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
          where: { examen_id: 5, estudiante_id: 99 },
        }),
      );
      expect(montaje.asignacionRepository.find).not.toHaveBeenCalled();
    });

    it('rechaza las rendiciones que no están en curso', async () => {
      const montaje = prepararServicio({
        rendicionActiva: { ...RENDICION_NUEVA, estado: 'enviada' },
      });

      await expect(
        montaje.service.consultarPreguntasActivas(5, 9),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(montaje.asignacionRepository.find).not.toHaveBeenCalled();
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

  describe('RendicionService.verificarPreguntaDeRendicionActiva', () => {
    it('acepta una pregunta asignada a la rendición propia en curso', async () => {
      const montaje = prepararServicio();

      await expect(
        montaje.service.verificarPreguntaDeRendicionActiva(5, 9, 21),
      ).resolves.toBeUndefined();
      expect(montaje.rendicionRepository.findOne).toHaveBeenCalledWith({
        where: { examen_id: 5, estudiante_id: 9 },
      });
      expect(montaje.asignacionRepository.findOne).toHaveBeenCalledWith({
        where: { examen_id: 5, estudiante_id: 9, pregunta_id: 21 },
        select: { pregunta_id: true },
      });
    });

    it('rechaza si el estudiante no tiene una rendición en curso', async () => {
      const montaje = prepararServicio({ rendicionActiva: null });

      await expect(
        montaje.service.verificarPreguntaDeRendicionActiva(5, 99, 21),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(montaje.asignacionRepository.findOne).not.toHaveBeenCalled();
    });

    it('rechaza una pregunta que no fue asignada al estudiante', async () => {
      const montaje = prepararServicio();
      montaje.asignacionRepository.findOne.mockResolvedValue(null);

      await expect(
        montaje.service.verificarPreguntaDeRendicionActiva(5, 9, 77),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza una rendición que ya no está en curso', async () => {
      const montaje = prepararServicio({
        rendicionActiva: { ...RENDICION_NUEVA, estado: 'enviada' },
      });

      await expect(
        montaje.service.verificarPreguntaDeRendicionActiva(5, 9, 21),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(montaje.asignacionRepository.findOne).not.toHaveBeenCalled();
    });

    it('si el tiempo terminó, envía la rendición y rechaza el acceso a los recursos', async () => {
      const montaje = prepararServicio({
        examen: {
          duracion_min: 1,
          disponible_hasta: null,
          al_terminar_tiempo: 'enviar_automatico',
        },
        rendicionActiva: { ...RENDICION_NUEVA },
      });

      await expect(
        montaje.service.verificarPreguntaDeRendicionActiva(5, 9, 21),
      ).rejects.toThrow('No se pueden realizar más cambios');
      expect(montaje.rendicionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'enviada' }),
      );
      expect(montaje.asignacionRepository.findOne).not.toHaveBeenCalled();
    });
  });

  it('recupera la rendición ganadora cuando otra solicitud ya creó la clave única', async () => {
    const montaje = prepararServicio();
    montaje.builder.execute.mockResolvedValueOnce({ raw: [] });
    secuenciaIniciar(montaje, null, { ...RENDICION_NUEVA });
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
    secuenciaIniciar(montaje, null);

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
    secuenciaIniciar(montaje, null);
    const asignadas: { pregunta_id: number; orden: number }[] = [];
    montaje.asignacionRepository.insert.mockImplementation(
      async (filas: { pregunta_id: number; orden: number }[]) => {
        asignadas.push(...filas);
      },
    );

    const primera = await montaje.service.iniciarORecuperar(5, 9, {
      paralelo_id: 7,
    });
    secuenciaIniciar(montaje, {
      ...RENDICION_NUEVA,
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
    const montaje = prepararServicio();
    secuenciaIniciar(montaje, {
      ...RENDICION_NUEVA,
      estado: 'enviada',
      fecha_inicio: new Date(),
    });

    await expect(
      montaje.service.iniciarORecuperar(5, 9, { paralelo_id: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('RendicionService.finalizarRendicion', () => {
    it('marca como enviada la rendición en curso y conserva las respuestas', async () => {
      const montaje = prepararServicio();

      const resultado = await montaje.service.finalizarRendicion(5, 9);

      expect(montaje.rendicionRepository.findOne).toHaveBeenCalledWith({
        where: { examen_id: 5, estudiante_id: 9 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(montaje.rendicionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: 'enviada',
          fecha_envio: expect.any(Date),
        }),
      );
      expect(resultado).toMatchObject({
        examen_id: 5,
        estado: 'enviada',
        fecha_envio: expect.any(Date),
      });
      expect(montaje.respuestaRepository.upsert).not.toHaveBeenCalled();
      expect(montaje.respuestaRepository.find).not.toHaveBeenCalled();
      expect(montaje.opcionMarcadaRepository.delete).not.toHaveBeenCalled();
      expect(montaje.opcionMarcadaRepository.insert).not.toHaveBeenCalled();
      expect(
        montaje.correccionRendicionService.corregirRendicion,
      ).toHaveBeenCalledTimes(1);
      expect(
        montaje.correccionRendicionService.corregirRendicion,
      ).toHaveBeenCalledWith(montaje.manager, 5, 9);
    });

    it('guarda la nota final cuando la corrección automática está completa', async () => {
      const montaje = prepararServicio();
      montaje.correccionRendicionService.corregirRendicion.mockResolvedValueOnce(
        {
          respuestasAutomaticas: 3,
          pendientesRevision: 0,
          notaFinal: '8.50',
          completa: true,
        },
      );

      const resultado = await montaje.service.finalizarRendicion(5, 9);

      expect(montaje.rendicionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: 'corregida',
          nota_final: '8.50',
        }),
      );
      expect(resultado.estado).toBe('corregida');
    });

    it('mantiene la rendición enviada cuando quedan incisos por revisar', async () => {
      const montaje = prepararServicio({
        rendicionActiva: {
          ...RENDICION_NUEVA,
          nota_final: null,
        },
      });
      montaje.correccionRendicionService.corregirRendicion.mockResolvedValueOnce(
        {
          respuestasAutomaticas: 1,
          pendientesRevision: 1,
          notaFinal: null,
          completa: false,
        },
      );

      const resultado = await montaje.service.finalizarRendicion(5, 9);

      expect(montaje.rendicionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: 'enviada',
          nota_final: null,
        }),
      );
      expect(resultado.estado).toBe('enviada');
    });

    it('propaga el error de corrección sin guardar la rendición', async () => {
      const montaje = prepararServicio();
      const error = new Error('fallo durante la corrección');
      montaje.correccionRendicionService.corregirRendicion.mockRejectedValueOnce(
        error,
      );

      await expect(
        montaje.service.finalizarRendicion(5, 9),
      ).rejects.toBe(error);
      expect(montaje.rendicionRepository.save).not.toHaveBeenCalled();
    });

    it('no vuelve a corregir una rendición ya enviada o corregida', async () => {
      const montaje = prepararServicio();
      montaje.correccionRendicionService.corregirRendicion.mockResolvedValueOnce(
        {
          respuestasAutomaticas: 2,
          pendientesRevision: 0,
          notaFinal: '9.00',
          completa: true,
        },
      );

      const primera = await montaje.service.finalizarRendicion(5, 9);
      const segunda = await montaje.service.finalizarRendicion(5, 9);

      expect(primera.estado).toBe('corregida');
      expect(segunda.estado).toBe('corregida');
      expect(
        montaje.correccionRendicionService.corregirRendicion,
      ).toHaveBeenCalledTimes(1);
      expect(montaje.rendicionRepository.save).toHaveBeenCalledTimes(1);
    });

    it('es idempotente si la rendición ya fue enviada o corregida', async () => {
      const fechaEnvio = new Date('2026-11-08T15:00:00.000Z');

      const enviada = prepararServicio({
        rendicionActiva: {
          ...RENDICION_NUEVA,
          estado: 'enviada',
          fecha_envio: fechaEnvio,
        },
      });
      const primera = await enviada.service.finalizarRendicion(5, 9);

      expect(enviada.rendicionRepository.save).not.toHaveBeenCalled();
      expect(primera).toMatchObject({
        examen_id: 5,
        estado: 'enviada',
        fecha_envio: fechaEnvio,
      });

      const corregida = prepararServicio({
        rendicionActiva: {
          ...RENDICION_NUEVA,
          estado: 'corregida',
          fecha_envio: fechaEnvio,
        },
      });
      const segunda = await corregida.service.finalizarRendicion(5, 9);

      expect(corregida.rendicionRepository.save).not.toHaveBeenCalled();
      expect(segunda.estado).toBe('corregida');
    });

    it('rechaza una rendición inexistente sin escribir nada', async () => {
      const montaje = prepararServicio({ rendicionActiva: null });

      await expect(
        montaje.service.finalizarRendicion(5, 99),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(montaje.rendicionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('RendicionService.finalizarSiVencida', () => {
    it('envía y corrige una sola vez cuando se agota el tiempo', async () => {
      const montaje = prepararServicio({
        rendicionActiva: {
          ...RENDICION_NUEVA,
          fecha_inicio: new Date(Date.now() - 60 * 60 * 1000),
        },
        examen: {
          duracion_min: 30,
          disponible_hasta: null,
          al_terminar_tiempo: 'enviar_automatico',
        },
      });
      montaje.correccionRendicionService.corregirRendicion.mockResolvedValueOnce(
        {
          respuestasAutomaticas: 2,
          pendientesRevision: 0,
          notaFinal: '7.00',
          completa: true,
        },
      );

      const enviada = await montaje.service.finalizarSiVencida(5, 9);

      expect(enviada).toBe(true);
      expect(
        montaje.correccionRendicionService.corregirRendicion,
      ).toHaveBeenCalledWith(montaje.manager, 5, 9);
      expect(montaje.rendicionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: 'corregida',
          nota_final: '7.00',
        }),
      );

      const segunda = await montaje.service.finalizarSiVencida(5, 9);

      expect(segunda).toBe(false);
      expect(
        montaje.correccionRendicionService.corregirRendicion,
      ).toHaveBeenCalledTimes(1);
      expect(montaje.rendicionRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
