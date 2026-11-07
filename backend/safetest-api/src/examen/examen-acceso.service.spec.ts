import 'reflect-metadata';

import { jest } from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';

/**
 * Las entidades reales forman ciclos bajo ESM; el servicio solo las usa como
 * tokens de TypeORM, así que se sustituyen por clases vacías.
 */
let ExamenAccesoService: typeof import('./examen-acceso.service').ExamenAccesoService;

beforeAll(async () => {
  jest.unstable_mockModule('./entity/examen.entity', () => ({
    Examen: class Examen {},
  }));
  jest.unstable_mockModule(
    '../examenpregunta/entity/examenpregunta.entity',
    () => ({ ExamenPregunta: class ExamenPregunta {} }),
  );
  jest.unstable_mockModule(
    '../asignacionpregunta/entity/asignacionpregunta.entity',
    () => ({ AsignacionPregunta: class AsignacionPregunta {} }),
  );
  jest.unstable_mockModule(
    '../inscripcion/entity/inscripcion.entity',
    () => ({ Inscripcion: class Inscripcion {} }),
  );
  jest.unstable_mockModule(
    '../examenestudiante/entity/examenestudiante.entity',
    () => ({ ExamenEstudiante: class ExamenEstudiante {} }),
  );
  jest.unstable_mockModule(
    '../paraleloexamen/entity/paraleloexamen.entity',
    () => ({ ParaleloExamen: class ParaleloExamen {} }),
  );
  jest.unstable_mockModule(
    '../pregunta/entity/pregunta.entity',
    () => ({ Pregunta: class Pregunta {} }),
  );

  ({ ExamenAccesoService } = await import('./examen-acceso.service'));
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
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

function queryBuilderMock(filas: unknown[]) {
  const qb = {
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    getRawMany: jest.fn().mockResolvedValue(filas),
    getCount: jest.fn().mockResolvedValue(0),
  };

  qb.innerJoin.mockReturnValue(qb);
  qb.leftJoin.mockReturnValue(qb);
  qb.select.mockReturnValue(qb);
  qb.addSelect.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.addOrderBy.mockReturnValue(qb);

  return qb;
}

function updateBuilderMock() {
  const qb = {
    update: jest.fn(),
    set: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    returning: jest.fn(),
    execute: jest.fn(),
  };

  qb.update.mockReturnValue(qb);
  qb.set.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.returning.mockReturnValue(qb);

  return qb;
}

function montar() {
  const examen = repoMock();
  const examenPregunta = repoMock();
  const asignacion = repoMock();
  const inscripcion = repoMock();
  const examenEstudiante = repoMock();
  const pregunta = repoMock();

  const servicio = new ExamenAccesoService(
    examen as unknown as Repository<any>,
    examenPregunta as unknown as Repository<any>,
    asignacion as unknown as Repository<any>,
    inscripcion as unknown as Repository<any>,
    examenEstudiante as unknown as Repository<any>,
    pregunta as unknown as Repository<any>,
  );

  return {
    servicio,
    examen,
    examenPregunta,
    asignacion,
    inscripcion,
    examenEstudiante,
    pregunta,
  };
}

const AHORA = Date.now();
const VENTANA = {
  disponible_desde: new Date(AHORA - 60 * 60 * 1000),
  disponible_hasta: new Date(AHORA + 60 * 60 * 1000),
};

const FILAS_SEGURAS = [
  {
    pregunta_id: 10,
    enunciado: '¿Cuánto es 2 + 2?',
    letra: 'a',
    enunciado_inciso: '¿Cuánto es 2 + 2?',
    tipo_respuesta: 'opcion_unica',
    puntaje_max: '5',
    nro_opcion: 1,
    texto_opcion: '4',
  },
  {
    pregunta_id: 10,
    enunciado: '¿Cuánto es 2 + 2?',
    letra: 'a',
    enunciado_inciso: '¿Cuánto es 2 + 2?',
    tipo_respuesta: 'opcion_unica',
    puntaje_max: '5',
    nro_opcion: 2,
    texto_opcion: '5',
  },
];

const FILAS_CON_SOLUCION = FILAS_SEGURAS.map((fila) => ({
  ...fila,
  explicacion: 'Dos más dos son cuatro.',
  solucion_nro_opcion: fila.nro_opcion === 1 ? 1 : null,
  valor_correcto: '4',
  tolerancia: '0',
  solucion_referencia: null,
}));

describe('ExamenAccesoService', () => {
  let montaje: ReturnType<typeof montar>;

  beforeEach(() => {
    montaje = montar();
  });

  describe('vista del estudiante', () => {
    function prepararVista(
      resultadosPublicadosEn: Date | null,
      filas: unknown[],
    ) {
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        titulo: 'Evaluación de prueba',
        instrucciones: null,
        estado: 'publicado',
        duracion_min: 60,
        ...VENTANA,
        resultados_publicados_en: resultadosPublicadosEn,
      });
      montaje.examenEstudiante.count.mockResolvedValue(1);
      montaje.asignacion.find.mockResolvedValue([]);
      montaje.examenPregunta.find.mockResolvedValue([
        { pregunta_id: 10, orden: 1 },
      ]);
      montaje.pregunta.createQueryBuilder.mockReturnValue(
        queryBuilderMock(filas),
      );
    }

    it('no expone respuestas correctas antes de la publicación autorizada', async () => {
      prepararVista(null, FILAS_SEGURAS);

      const vista = await montaje.servicio.obtenerVistaEstudiante(5, 9);

      expect(vista.respuestas_disponibles).toBe(false);
      expect(vista.preguntas[0].incisos[0].opciones).toEqual([
        { nro_opcion: 1, texto_opcion: '4' },
        { nro_opcion: 2, texto_opcion: '5' },
      ]);

      const serializada = JSON.stringify(vista);

      expect(serializada).not.toContain('es_correcta');
      expect(serializada).not.toContain('explicacion');
      expect(serializada).not.toContain('valor_correcto');
      expect(serializada).not.toContain('solucion_referencia');
    });

    it('no consulta las tablas de solución antes de la publicación', async () => {
      prepararVista(null, FILAS_SEGURAS);

      await montaje.servicio.obtenerVistaEstudiante(5, 9);

      const qb =
        montaje.pregunta.createQueryBuilder.mock.results[0].value;

      expect(qb.leftJoin).toHaveBeenCalledTimes(1);
      expect(qb.leftJoin).toHaveBeenCalledWith(
        'inciso.opciones',
        'opcion',
      );
    });

    it('incluye la solución únicamente después de publicar los resultados', async () => {
      prepararVista(new Date(), FILAS_CON_SOLUCION);

      const vista = await montaje.servicio.obtenerVistaEstudiante(5, 9);

      expect(vista.respuestas_disponibles).toBe(true);
      expect(vista.mensaje).toBeNull();

      const pregunta = vista.preguntas[0] as unknown as {
        explicacion: string | null;
        incisos: {
          opciones: { nro_opcion: number; es_correcta?: boolean }[];
        }[];
      };

      expect(pregunta.explicacion).toBe('Dos más dos son cuatro.');

      const correcta = pregunta.incisos[0].opciones.find(
        (opcion) => opcion.nro_opcion === 1,
      );

      expect(correcta?.es_correcta).toBe(true);
    });

    it('no expone respuestas almacenadas ni calificaciones en ninguna fase', async () => {
      prepararVista(new Date(), FILAS_CON_SOLUCION);

      const vista = await montaje.servicio.obtenerVistaEstudiante(5, 9);
      const serializada = JSON.stringify(vista);

      for (const campo of [
        'nota_final',
        'puntaje_obtenido',
        'retroalimentacion',
        'respuesta_texto',
        'opcionesMarcadas',
        'estado_correccion',
      ]) {
        expect(serializada).not.toContain(campo);
      }
    });

    it('niega el acceso a un estudiante no asignado', async () => {
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        estado: 'publicado',
        ...VENTANA,
        resultados_publicados_en: null,
      });
      montaje.examenEstudiante.count.mockResolvedValue(0);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(
        queryBuilderMock([]),
      );

      await expect(
        montaje.servicio.obtenerVistaEstudiante(5, 99),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('niega el acceso a una evaluación que no está publicada', async () => {
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        estado: 'borrador',
        ...VENTANA,
        resultados_publicados_en: null,
      });

      await expect(
        montaje.servicio.obtenerVistaEstudiante(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('niega el acceso fuera de la ventana de disponibilidad', async () => {
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        estado: 'publicado',
        disponible_desde: new Date(AHORA - 2 * 60 * 60 * 1000),
        disponible_hasta: new Date(AHORA - 60 * 60 * 1000),
        resultados_publicados_en: null,
      });
      montaje.examenEstudiante.count.mockResolvedValue(1);

      await expect(
        montaje.servicio.obtenerVistaEstudiante(5, 9),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('respuestas del docente', () => {
    it('devuelve la solución de una evaluación propia', async () => {
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        titulo: 'Evaluación de prueba',
        estado: 'publicado',
        resultados_publicados_en: null,
      });
      montaje.examenPregunta.find.mockResolvedValue([
        { pregunta_id: 10, orden: 1 },
      ]);
      montaje.pregunta.createQueryBuilder.mockReturnValue(
        queryBuilderMock(FILAS_CON_SOLUCION),
      );

      const respuesta =
        await montaje.servicio.obtenerRespuestasDocente(5, 7);

      expect(montaje.examen.findOne).toHaveBeenCalledWith({
        where: { examen_id: 5, docente_id: 7 },
        select: {
          examen_id: true,
          titulo: true,
          estado: true,
          resultados_publicados_en: true,
        },
      });
      expect(respuesta.preguntas[0].explicacion).toBe(
        'Dos más dos son cuatro.',
      );
      expect(
        respuesta.preguntas[0].incisos[0].opciones[0].es_correcta,
      ).toBe(true);
      expect(
        respuesta.preguntas[0].incisos[0].valor_correcto,
      ).toBe(4);
    });

    it('niega el acceso a una evaluación de otro docente', async () => {
      montaje.examen.findOne.mockResolvedValue(null);

      await expect(
        montaje.servicio.obtenerRespuestasDocente(5, 8),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('publicación autorizada de respuestas', () => {
    it('publica atómicamente una evaluación propia', async () => {
      const fecha = new Date();

      const qb = updateBuilderMock();
      qb.execute.mockResolvedValue({
        raw: [{ examen_id: 5, resultados_publicados_en: fecha }],
        affected: 1,
      });
      montaje.examen.createQueryBuilder.mockReturnValue(qb);

      const resultado = await montaje.servicio.publicarRespuestas(5, 7);

      expect(resultado.ya_publicadas).toBe(false);
      expect(resultado.resultados_publicados_en).toBe(fecha);
      expect(qb.set).toHaveBeenCalledWith({
        resultados_publicados_en: expect.any(Function),
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'resultados_publicados_en IS NULL',
      );
      expect(qb.returning).toHaveBeenCalledWith([
        'examen_id',
        'resultados_publicados_en',
      ]);
    });

    it('no publica respuestas de una evaluación en borrador', async () => {
      const qb = updateBuilderMock();
      qb.execute.mockResolvedValue({ raw: [] });
      montaje.examen.createQueryBuilder.mockReturnValue(qb);
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        estado: 'borrador',
        resultados_publicados_en: null,
      });

      await expect(
        montaje.servicio.publicarRespuestas(5, 7),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(montaje.examen.findOne).toHaveBeenCalledWith({
        where: { examen_id: 5, docente_id: 7 },
        select: {
          examen_id: true,
          estado: true,
          resultados_publicados_en: true,
        },
      });
    });

    it('no publica respuestas de una evaluación ajena', async () => {
      const qb = updateBuilderMock();
      qb.execute.mockResolvedValue({ raw: [] });
      montaje.examen.createQueryBuilder.mockReturnValue(qb);
      montaje.examen.findOne.mockResolvedValue(null);

      await expect(
        montaje.servicio.publicarRespuestas(5, 8),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('es idempotente si las respuestas ya estaban publicadas', async () => {
      const fecha = new Date();

      const qb = updateBuilderMock();
      qb.execute.mockResolvedValue({ raw: [] });
      montaje.examen.createQueryBuilder.mockReturnValue(qb);
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        estado: 'publicado',
        resultados_publicados_en: fecha,
      });

      const resultado = await montaje.servicio.publicarRespuestas(5, 7);

      expect(resultado.ya_publicadas).toBe(true);
      expect(resultado.resultados_publicados_en).toBe(fecha);
      expect(qb.execute).toHaveBeenCalledTimes(1);
    });

    it('conserva la fecha de la primera publicación ante solicitudes concurrentes', async () => {
      const primeraFecha = new Date('2026-01-01T10:00:00.000Z');

      const qb = updateBuilderMock();
      // La primera solicitud gana el UPDATE; la segunda ya no coincide con
      // "resultados_publicados_en IS NULL" y recibe la fecha existente.
      qb.execute
        .mockResolvedValueOnce({
          raw: [{ examen_id: 5, resultados_publicados_en: primeraFecha }],
          affected: 1,
        })
        .mockResolvedValueOnce({ raw: [], affected: 0 });
      montaje.examen.createQueryBuilder.mockReturnValue(qb);
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        estado: 'publicado',
        resultados_publicados_en: primeraFecha,
      });

      const [a, b] = await Promise.all([
        montaje.servicio.publicarRespuestas(5, 7),
        montaje.servicio.publicarRespuestas(5, 7),
      ]);

      const primera = [a, b].find((resultado) => !resultado.ya_publicadas);
      const repetida = [a, b].find((resultado) => resultado.ya_publicadas);

      expect(primera).toBeDefined();
      expect(repetida).toBeDefined();
      expect(primera?.resultados_publicados_en).toBe(primeraFecha);
      expect(repetida?.resultados_publicados_en).toBe(primeraFecha);
      expect(qb.execute).toHaveBeenCalledTimes(2);
    });
  });
});
