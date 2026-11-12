import 'reflect-metadata';

import { jest } from '@jest/globals';
import type { EntityManager } from 'typeorm';

import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { OpcionMarcada } from '../opcionmarcada/entity/opcionmarcada.entity';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';
import { SolucionOpcion } from '../solucionopcion/entity/solucionopcion.entity';
import { CorreccionRendicionService } from './correccion-rendicion.service';
import { ReglaCorreccion } from './entity/reglacorreccion.entity';

/**
 * Las entidades solo se usan como tokens de repositorio. Se trabaja con
 * repositorios simulados; no se toca ninguna base de datos.
 */

const EXAMEN_ID = 5;
const ESTUDIANTE_ID = 9;

type TipoRespuesta =
  | 'opcion_unica'
  | 'opcion_multiple'
  | 'verdadero_falso'
  | 'desarrollo'
  | 'numerica';

interface FilaInciso {
  pregunta_id: number;
  letra: string;
  tipo_respuesta: string;
  puntaje_max: string;
  pregunta: {
    tema: {
      materia: { docente_id: number | null } | null;
    } | null;
  } | null;
}

interface FilaRespuesta {
  estudiante_id: number;
  examen_id: number;
  pregunta_id: number;
  letra: string;
  respuesta_texto: string | null;
  puntaje_obtenido: string | null;
  estado_correccion: string;
}

interface FilaOpcion {
  estudiante_id: number;
  examen_id: number;
  pregunta_id: number;
  letra: string;
  nro_opcion: number;
}

interface FilaSolucionInciso {
  pregunta_id: number;
  letra: string;
  valor_correcto: string;
  tolerancia: string;
}

interface FilaSolucionOpcion {
  pregunta_id: number;
  letra: string;
  nro_opcion: number;
}

interface FilaRegla {
  regla_id: number;
  docente_id: number;
  tipo_respuesta: TipoRespuesta;
  parametros: Record<string, unknown>;
  activo: boolean;
}

interface Escenario {
  asignaciones?: { pregunta_id: number }[];
  incisos?: FilaInciso[];
  respuestas?: FilaRespuesta[];
  opciones?: FilaOpcion[];
  solucionesInciso?: FilaSolucionInciso[];
  solucionesOpcion?: FilaSolucionOpcion[];
  reglas?: FilaRegla[];
}

interface RepoSimulado {
  find: jest.Mock;
  save: jest.Mock;
}

function inciso(
  preguntaId: number,
  letra: string,
  tipo: TipoRespuesta,
  puntajeMax: number,
  docenteId: number | null = 1,
): FilaInciso {
  return {
    pregunta_id: preguntaId,
    letra,
    tipo_respuesta: tipo,
    puntaje_max: puntajeMax.toString(),
    pregunta: {
      tema: {
        materia: docenteId === null ? null : { docente_id: docenteId },
      },
    },
  };
}

function respuesta(
  preguntaId: number,
  letra: string,
  texto: string | null = null,
): FilaRespuesta {
  return {
    estudiante_id: ESTUDIANTE_ID,
    examen_id: EXAMEN_ID,
    pregunta_id: preguntaId,
    letra,
    respuesta_texto: texto,
    puntaje_obtenido: null,
    estado_correccion: 'pendiente',
  };
}

function marcada(
  preguntaId: number,
  letra: string,
  nroOpcion: number,
): FilaOpcion {
  return {
    estudiante_id: ESTUDIANTE_ID,
    examen_id: EXAMEN_ID,
    pregunta_id: preguntaId,
    letra,
    nro_opcion: nroOpcion,
  };
}

function solucionInciso(
  preguntaId: number,
  letra: string,
  valorCorrecto: number,
  tolerancia = 0,
): FilaSolucionInciso {
  return {
    pregunta_id: preguntaId,
    letra,
    valor_correcto: valorCorrecto.toString(),
    tolerancia: tolerancia.toString(),
  };
}

function solucionOpcion(
  preguntaId: number,
  letra: string,
  nroOpcion: number,
): FilaSolucionOpcion {
  return { pregunta_id: preguntaId, letra, nro_opcion: nroOpcion };
}

function regla(
  docenteId: number,
  tipo: TipoRespuesta,
  parametros: Record<string, unknown> = { estrategia: 'automatica' },
): FilaRegla {
  return {
    regla_id: 1,
    docente_id: docenteId,
    tipo_respuesta: tipo,
    parametros,
    activo: true,
  };
}

function repo(filas: unknown[]): RepoSimulado {
  return {
    find: jest.fn(async () => filas),
    save: jest.fn(async (entidades: unknown[]) => entidades),
  };
}

function montar(escenario: Escenario) {
  const repositorios = new Map<unknown, RepoSimulado>([
    [AsignacionPregunta, repo(escenario.asignaciones ?? [])],
    [Inciso, repo(escenario.incisos ?? [])],
    [RespuestaInciso, repo(escenario.respuestas ?? [])],
    [OpcionMarcada, repo(escenario.opciones ?? [])],
    [SolucionInciso, repo(escenario.solucionesInciso ?? [])],
    [SolucionOpcion, repo(escenario.solucionesOpcion ?? [])],
    [ReglaCorreccion, repo(escenario.reglas ?? [])],
  ]);

  const manager = {
    getRepository: jest.fn((entidad: unknown) => {
      const repositorio = repositorios.get(entidad);

      if (!repositorio) {
        throw new Error('Repositorio simulado no configurado');
      }

      return repositorio;
    }),
  } as unknown as EntityManager;

  const servicio = new CorreccionRendicionService();

  return {
    servicio,
    manager,
    asignacionRepo: repositorios.get(AsignacionPregunta)!,
    incisoRepo: repositorios.get(Inciso)!,
    respuestaRepo: repositorios.get(RespuestaInciso)!,
    opcionRepo: repositorios.get(OpcionMarcada)!,
    solucionIncisoRepo: repositorios.get(SolucionInciso)!,
    solucionOpcionRepo: repositorios.get(SolucionOpcion)!,
    reglaRepo: repositorios.get(ReglaCorreccion)!,
  };
}

describe('CorreccionRendicionService', () => {
  it('califica una opción única correcta y una incorrecta', async () => {
    const respuestas = [respuesta(10, 'a'), respuesta(10, 'b')];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 10 }],
      incisos: [
        inciso(10, 'a', 'opcion_unica', 5),
        inciso(10, 'b', 'opcion_unica', 4),
      ],
      respuestas,
      opciones: [marcada(10, 'a', 2), marcada(10, 'b', 2)],
      solucionesOpcion: [
        solucionOpcion(10, 'a', 2),
        solucionOpcion(10, 'b', 1),
      ],
      reglas: [regla(1, 'opcion_unica')],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado).toEqual({
      respuestasAutomaticas: 2,
      pendientesRevision: 0,
      notaFinal: '5.00',
      completa: true,
    });
    expect(respuestas[0]).toMatchObject({
      puntaje_obtenido: '5.00',
      estado_correccion: 'automatica',
    });
    expect(respuestas[1]).toMatchObject({
      puntaje_obtenido: '0.00',
      estado_correccion: 'automatica',
    });
  });

  it('califica verdadero/falso comparando con la solución del inciso', async () => {
    const respuestas = [respuesta(11, 'a'), respuesta(11, 'b')];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 11 }],
      incisos: [
        inciso(11, 'a', 'verdadero_falso', 3),
        inciso(11, 'b', 'verdadero_falso', 3),
      ],
      respuestas,
      opciones: [marcada(11, 'a', 1), marcada(11, 'b', 1)],
      solucionesOpcion: [
        solucionOpcion(11, 'a', 1),
        solucionOpcion(11, 'b', 2),
      ],
      reglas: [regla(1, 'verdadero_falso')],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado.notaFinal).toBe('3.00');
    expect(resultado.completa).toBe(true);
    expect(respuestas[0].puntaje_obtenido).toBe('3.00');
    expect(respuestas[1].puntaje_obtenido).toBe('0.00');
  });

  it('aplica puntaje parcial y penalización en opción múltiple', async () => {
    const respuestas = [respuesta(12, 'a')];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 12 }],
      incisos: [inciso(12, 'a', 'opcion_multiple', 6)],
      respuestas,
      opciones: [
        marcada(12, 'a', 1),
        marcada(12, 'a', 2),
        marcada(12, 'a', 4),
      ],
      solucionesOpcion: [
        solucionOpcion(12, 'a', 1),
        solucionOpcion(12, 'a', 2),
        solucionOpcion(12, 'a', 3),
      ],
      reglas: [
        regla(1, 'opcion_multiple', {
          estrategia: 'automatica',
          puntaje_parcial: true,
          penalizar_incorrectas: true,
        }),
      ],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado.notaFinal).toBe('2.00');
    expect(respuestas[0].puntaje_obtenido).toBe('2.00');
  });

  it('no supera el puntaje máximo ni baja de cero al penalizar', async () => {
    const respuestas = [respuesta(16, 'a'), respuesta(16, 'b')];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 16 }],
      incisos: [
        inciso(16, 'a', 'opcion_multiple', 6),
        inciso(16, 'b', 'opcion_multiple', 6),
      ],
      respuestas,
      opciones: [
        marcada(16, 'a', 1),
        marcada(16, 'a', 2),
        marcada(16, 'a', 3),
        marcada(16, 'b', 4),
        marcada(16, 'b', 5),
      ],
      solucionesOpcion: [
        solucionOpcion(16, 'a', 1),
        solucionOpcion(16, 'a', 2),
        solucionOpcion(16, 'a', 3),
        solucionOpcion(16, 'b', 1),
        solucionOpcion(16, 'b', 2),
        solucionOpcion(16, 'b', 3),
      ],
      reglas: [
        regla(1, 'opcion_multiple', {
          estrategia: 'automatica',
          puntaje_parcial: true,
          penalizar_incorrectas: true,
        }),
      ],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(respuestas[0].puntaje_obtenido).toBe('6.00');
    expect(respuestas[1].puntaje_obtenido).toBe('0.00');
    expect(resultado.notaFinal).toBe('6.00');
  });

  it('aplica el redondeo numérico configurado en la regla', async () => {
    const respuestas = [
      respuesta(13, 'a', '10.04'),
      respuesta(13, 'b', '10.06'),
    ];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 13 }],
      incisos: [
        inciso(13, 'a', 'numerica', 5),
        inciso(13, 'b', 'numerica', 5),
      ],
      respuestas,
      solucionesInciso: [
        solucionInciso(13, 'a', 10),
        solucionInciso(13, 'b', 10),
      ],
      reglas: [
        regla(1, 'numerica', {
          estrategia: 'automatica',
          redondeo_decimales: 1,
        }),
      ],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(respuestas[0].puntaje_obtenido).toBe('5.00');
    expect(respuestas[1].puntaje_obtenido).toBe('0.00');
    expect(resultado.notaFinal).toBe('5.00');
  });

  it('deja pendiente el inciso cuando no existe una regla del docente propietario', async () => {
    const respuestas = [respuesta(14, 'a')];
    const { servicio, manager, respuestaRepo } = montar({
      asignaciones: [{ pregunta_id: 14 }],
      incisos: [inciso(14, 'a', 'opcion_unica', 5)],
      respuestas,
      opciones: [marcada(14, 'a', 1)],
      solucionesOpcion: [solucionOpcion(14, 'a', 1)],
      reglas: [],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado).toEqual({
      respuestasAutomaticas: 0,
      pendientesRevision: 1,
      notaFinal: null,
      completa: false,
    });
    expect(respuestas[0]).toMatchObject({
      puntaje_obtenido: null,
      estado_correccion: 'pendiente',
    });
    expect(respuestaRepo.save).toHaveBeenCalledTimes(1);
  });

  it('no aplica la regla de otro docente ni una regla incompatible', async () => {
    const respuestas = [
      respuesta(15, 'a'),
      respuesta(15, 'b', '10'),
    ];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 15 }],
      incisos: [
        inciso(15, 'a', 'opcion_unica', 5, 1),
        inciso(15, 'b', 'numerica', 5, 1),
      ],
      respuestas,
      opciones: [marcada(15, 'a', 1)],
      solucionesOpcion: [solucionOpcion(15, 'a', 1)],
      solucionesInciso: [solucionInciso(15, 'b', 10)],
      reglas: [
        regla(2, 'opcion_unica'),
        regla(1, 'numerica', {
          estrategia: 'automatica',
          redondeo_decimales: 99,
        }),
      ],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado.respuestasAutomaticas).toBe(0);
    expect(resultado.pendientesRevision).toBe(2);
    expect(resultado.notaFinal).toBeNull();
    expect(respuestas.every((fila) => fila.puntaje_obtenido === null)).toBe(
      true,
    );
  });

  it('mantiene desarrollo pendiente de revisión manual, incluso si está vacío', async () => {
    const respuestas = [respuesta(17, 'a', 'Respuesta de desarrollo')];
    const { servicio, manager, respuestaRepo } = montar({
      asignaciones: [{ pregunta_id: 17 }],
      incisos: [
        inciso(17, 'a', 'desarrollo', 10),
        inciso(17, 'b', 'desarrollo', 10),
      ],
      respuestas,
      reglas: [
        regla(1, 'desarrollo', {
          estrategia: 'manual_rubrica',
        }),
      ],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado).toEqual({
      respuestasAutomaticas: 0,
      pendientesRevision: 2,
      notaFinal: null,
      completa: false,
    });
    expect(respuestas[0]).toMatchObject({
      puntaje_obtenido: null,
      estado_correccion: 'pendiente',
    });
    expect(respuestaRepo.save).toHaveBeenCalledWith([respuestas[0]]);
  });

  it('no otorga puntaje automático a respuestas vacías', async () => {
    const respuestas = [
      respuesta(18, 'a'),
      respuesta(18, 'b', '   '),
    ];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 18 }],
      incisos: [
        inciso(18, 'a', 'opcion_unica', 5),
        inciso(18, 'b', 'numerica', 5),
      ],
      respuestas,
      solucionesOpcion: [solucionOpcion(18, 'a', 1)],
      solucionesInciso: [solucionInciso(18, 'b', 0)],
      reglas: [regla(1, 'opcion_unica'), regla(1, 'numerica')],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado).toEqual({
      respuestasAutomaticas: 2,
      pendientesRevision: 0,
      notaFinal: '0.00',
      completa: true,
    });
    expect(respuestas[0].puntaje_obtenido).toBe('0.00');
    expect(respuestas[1].puntaje_obtenido).toBe('0.00');
  });

  it('deja pendiente una respuesta vacía si falta la regla compatible', async () => {
    const respuestas = [respuesta(22, 'a')];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 22 }],
      incisos: [inciso(22, 'a', 'opcion_unica', 5)],
      respuestas,
      solucionesOpcion: [solucionOpcion(22, 'a', 1)],
      reglas: [],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado).toEqual({
      respuestasAutomaticas: 0,
      pendientesRevision: 1,
      notaFinal: null,
      completa: false,
    });
    expect(respuestas[0]).toMatchObject({
      puntaje_obtenido: null,
      estado_correccion: 'pendiente',
    });
  });

  it('no aplica la regla de un tipo de respuesta distinto', async () => {
    const respuestas = [respuesta(23, 'a')];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 23 }],
      incisos: [inciso(23, 'a', 'verdadero_falso', 3)],
      respuestas,
      opciones: [marcada(23, 'a', 1)],
      solucionesOpcion: [solucionOpcion(23, 'a', 1)],
      reglas: [regla(1, 'opcion_unica')],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado.respuestasAutomaticas).toBe(0);
    expect(resultado.pendientesRevision).toBe(1);
    expect(respuestas[0].estado_correccion).toBe('pendiente');
    expect(respuestas[0].puntaje_obtenido).toBeNull();
  });

  it('deja pendiente el inciso cuando hay reglas duplicadas del mismo tipo', async () => {
    const respuestas = [respuesta(24, 'a')];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 24 }],
      incisos: [inciso(24, 'a', 'opcion_unica', 5)],
      respuestas,
      opciones: [marcada(24, 'a', 1)],
      solucionesOpcion: [solucionOpcion(24, 'a', 1)],
      reglas: [regla(1, 'opcion_unica'), regla(1, 'opcion_unica')],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado.respuestasAutomaticas).toBe(0);
    expect(resultado.pendientesRevision).toBe(1);
    expect(respuestas[0].estado_correccion).toBe('pendiente');
  });

  it('no aplica una regla inactiva ni una configuración inválida', async () => {
    const respuestas = [respuesta(26, 'a'), respuesta(26, 'b')];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 26 }],
      incisos: [
        inciso(26, 'a', 'opcion_unica', 5),
        inciso(26, 'b', 'opcion_multiple', 6),
      ],
      respuestas,
      opciones: [marcada(26, 'a', 1), marcada(26, 'b', 1)],
      solucionesOpcion: [
        solucionOpcion(26, 'a', 1),
        solucionOpcion(26, 'b', 1),
      ],
      reglas: [
        { ...regla(1, 'opcion_unica'), activo: false },
        regla(1, 'opcion_multiple', {
          estrategia: 'automatica',
          puntaje_parcial: 'si',
        }),
      ],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado).toEqual({
      respuestasAutomaticas: 0,
      pendientesRevision: 2,
      notaFinal: null,
      completa: false,
    });
    expect(respuestas.every((fila) => fila.puntaje_obtenido === null)).toBe(
      true,
    );
  });

  it('deja pendiente un tipo de respuesta no soportado', async () => {
    const respuestas = [respuesta(25, 'a', 'Respuesta libre')];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 25 }],
      incisos: [
        {
          ...inciso(25, 'a', 'opcion_unica', 5),
          tipo_respuesta: 'ensayo',
        },
      ],
      respuestas,
      reglas: [regla(1, 'opcion_unica')],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(resultado).toEqual({
      respuestasAutomaticas: 0,
      pendientesRevision: 1,
      notaFinal: null,
      completa: false,
    });
    expect(respuestas[0]).toMatchObject({
      puntaje_obtenido: null,
      estado_correccion: 'pendiente',
    });
  });

  it('no reutiliza soluciones de otra pregunta o inciso', async () => {
    const respuestas = [respuesta(30, 'a'), respuesta(31, 'a')];
    const { servicio, manager } = montar({
      asignaciones: [{ pregunta_id: 30 }, { pregunta_id: 31 }],
      incisos: [
        inciso(30, 'a', 'opcion_unica', 5),
        inciso(31, 'a', 'opcion_unica', 5),
      ],
      respuestas,
      opciones: [marcada(30, 'a', 1), marcada(31, 'a', 1)],
      solucionesOpcion: [solucionOpcion(30, 'a', 1)],
      reglas: [regla(1, 'opcion_unica')],
    });

    const resultado = await servicio.corregirRendicion(
      manager,
      EXAMEN_ID,
      ESTUDIANTE_ID,
    );

    expect(respuestas[0]).toMatchObject({
      puntaje_obtenido: '5.00',
      estado_correccion: 'automatica',
    });
    expect(respuestas[1]).toMatchObject({
      puntaje_obtenido: null,
      estado_correccion: 'pendiente',
    });
    expect(resultado).toEqual({
      respuestasAutomaticas: 1,
      pendientesRevision: 1,
      notaFinal: null,
      completa: false,
    });
  });

  it('consulta únicamente las respuestas y opciones de la rendición indicada', async () => {
    const {
      servicio,
      manager,
      incisoRepo,
      respuestaRepo,
      opcionRepo,
      solucionIncisoRepo,
      solucionOpcionRepo,
      reglaRepo,
    } = montar({
      asignaciones: [{ pregunta_id: 19 }],
      incisos: [inciso(19, 'a', 'opcion_unica', 5)],
      respuestas: [respuesta(19, 'a')],
      opciones: [marcada(19, 'a', 1)],
      solucionesInciso: [solucionInciso(19, 'a', 0)],
      solucionesOpcion: [solucionOpcion(19, 'a', 1)],
      reglas: [regla(1, 'opcion_unica')],
    });

    await servicio.corregirRendicion(manager, EXAMEN_ID, ESTUDIANTE_ID);

    expect(respuestaRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estudiante_id: ESTUDIANTE_ID,
          examen_id: EXAMEN_ID,
        }),
      }),
    );
    expect(opcionRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estudiante_id: ESTUDIANTE_ID,
          examen_id: EXAMEN_ID,
        }),
      }),
    );
    expect(incisoRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pregunta_id: expect.anything() },
        relations: { pregunta: { tema: { materia: true } } },
      }),
    );
    expect(solucionIncisoRepo.find).toHaveBeenCalledWith({
      where: { pregunta_id: expect.anything() },
    });
    expect(solucionOpcionRepo.find).toHaveBeenCalledWith({
      where: { pregunta_id: expect.anything() },
    });
    expect(reglaRepo.find).toHaveBeenCalledWith({
      where: {
        docente_id: expect.anything(),
        tipo_respuesta: expect.anything(),
        activo: true,
      },
    });
  });
});
