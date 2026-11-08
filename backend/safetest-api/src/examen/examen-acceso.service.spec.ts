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
    '../examentema/entity/examentema.entity',
    () => ({ ExamenTema: class ExamenTema {} }),
  );
  jest.unstable_mockModule(
    '../asignacionpregunta/entity/asignacionpregunta.entity',
    () => ({ AsignacionPregunta: class AsignacionPregunta {} }),
  );
  jest.unstable_mockModule(
    '../estudiante/entity/estudiante.entity',
    () => ({ Estudiante: class Estudiante {} }),
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
    distinct: jest.fn(),
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

  qb.distinct.mockReturnValue(qb);
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
  const examenTema = repoMock();
  const asignacion = repoMock();
  const inscripcion = repoMock();
  const examenEstudiante = repoMock();
  const pregunta = repoMock();
  const estudiante = repoMock();

  const servicio = new ExamenAccesoService(
    examen as unknown as Repository<any>,
    examenPregunta as unknown as Repository<any>,
    examenTema as unknown as Repository<any>,
    asignacion as unknown as Repository<any>,
    inscripcion as unknown as Repository<any>,
    examenEstudiante as unknown as Repository<any>,
    pregunta as unknown as Repository<any>,
    estudiante as unknown as Repository<any>,
  );

  return {
    servicio,
    examen,
    examenPregunta,
    examenTema,
    asignacion,
    inscripcion,
    examenEstudiante,
    pregunta,
    estudiante,
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
    montaje.estudiante.count.mockResolvedValue(1);
  });

  describe('validación previa al inicio de rendición', () => {
    it('devuelve una evaluación publicada asignada dentro de la ventana', async () => {
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        estado: 'publicado',
        modo_asignacion: 'estudiantes',
        modo_seleccion: 'manual',
        orden_preguntas: 'definido',
        ...VENTANA,
      });
      montaje.examenEstudiante.count.mockResolvedValue(1);

      const resultado =
        await montaje.servicio.obtenerExamenParaRendicion(5, 9);

      expect(resultado.examen_id).toBe(5);
      expect(montaje.examenEstudiante.count).toHaveBeenCalledWith({
        where: { examen_id: 5, estudiante_id: 9 },
      });
    });

    it('rechaza a un estudiante no asignado', async () => {
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        estado: 'publicado',
        modo_asignacion: 'estudiantes',
        ...VENTANA,
      });
      montaje.examenEstudiante.count.mockResolvedValue(0);

      await expect(
        montaje.servicio.obtenerExamenParaRendicion(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza el inicio fuera de la ventana de disponibilidad', async () => {
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        estado: 'publicado',
        modo_asignacion: 'estudiantes',
        disponible_desde: new Date(Date.now() - 2 * 60 * 60 * 1000),
        disponible_hasta: new Date(Date.now() - 60 * 60 * 1000),
      });
      montaje.examenEstudiante.count.mockResolvedValue(1);

      await expect(
        montaje.servicio.obtenerExamenParaRendicion(5, 9),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  function prepararVista(
    resultadosPublicadosEn: Date | null,
    filas: unknown[],
    modoAsignacion: 'paralelos' | 'estudiantes' = 'estudiantes',
  ): ReturnType<typeof queryBuilderMock> | undefined {
    montaje.examen.findOne.mockResolvedValue({
      examen_id: 5,
      titulo: 'Evaluación de prueba',
      instrucciones: null,
      estado: 'publicado',
      modo_asignacion: modoAsignacion,
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

    if (modoAsignacion === 'paralelos') {
      const qbInscripcion = queryBuilderMock([]);
      qbInscripcion.getCount.mockResolvedValue(1);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(qbInscripcion);
      return qbInscripcion;
    }

    return undefined;
  }

  describe('vista del estudiante', () => {
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
        modo_asignacion: 'estudiantes',
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
        modo_asignacion: 'estudiantes',
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
        modo_asignacion: 'estudiantes',
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

  describe('listado de evaluaciones asignadas', () => {
    function prepararListado(filas: unknown[]) {
      const qb = queryBuilderMock(filas);
      montaje.examen.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('devuelve solo la proyección de tarjeta y clasifica la ventana', async () => {
      const ahora = Date.now();
      const filas = [
        {
          examen_id: '5',
          titulo: 'Práctica futura',
          materia: 'Programación',
          docente: 'Juan Pérez',
          disponible_desde: new Date(ahora + 60_000),
          disponible_hasta: new Date(ahora + 3_600_000),
          duracion_min: '45',
          total_preguntas: '6',
          nota_final: '100',
          explicacion: 'No debe serializarse',
        },
        {
          examen_id: 6,
          titulo: 'Quiz vigente',
          materia: 'Estadística',
          docente: 'María Castro',
          disponible_desde: new Date(ahora - 60_000),
          disponible_hasta: new Date(ahora + 3_600_000),
          duracion_min: 60,
          total_preguntas: 10,
        },
        {
          examen_id: 7,
          titulo: 'Práctica finalizada',
          materia: 'Álgebra',
          docente: 'Pedro Vargas',
          disponible_desde: new Date(ahora - 3_600_000),
          disponible_hasta: new Date(ahora - 60_000),
          duracion_min: 90,
          total_preguntas: 20,
        },
      ];
      prepararListado(filas);

      const resultado =
        await montaje.servicio.listarEvaluacionesAsignadas(9);

      expect(resultado.map((item) => item.estado_disponibilidad)).toEqual([
        'proxima',
        'disponible',
        'finalizada',
      ]);
      expect(resultado[0]).toEqual({
        examen_id: 5,
        titulo: 'Práctica futura',
        materia: 'Programación',
        docente: 'Juan Pérez',
        disponible_desde: filas[0].disponible_desde,
        disponible_hasta: filas[0].disponible_hasta,
        duracion_min: 45,
        total_preguntas: 6,
        estado_disponibilidad: 'proxima',
      });

      const serializado = JSON.stringify(resultado);
      expect(serializado).not.toContain('nota_final');
      expect(serializado).not.toContain('explicacion');
      expect(serializado).not.toContain('respuesta');
      expect(serializado).not.toContain('estudiante_id');
    });

    it('filtra por publicado y usa asignación individual o inscripción actual según el modo', async () => {
      const qb = prepararListado([]);

      await montaje.servicio.listarEvaluacionesAsignadas(9);

      expect(montaje.examen.createQueryBuilder).toHaveBeenCalledWith(
        'examen',
      );
      expect(qb.where).toHaveBeenCalledWith(
        'examen.estado = :estadoPublicado',
        { estadoPublicado: 'publicado' },
      );
      const llamadaAsignacion = qb.andWhere.mock.calls.find(([filtro]) =>
        String(filtro).includes('modo_asignacion'),
      );
      expect(llamadaAsignacion).toBeDefined();
      const [filtroAsignacion, parametros] = llamadaAsignacion!;
      const filtros = qb.andWhere.mock.calls
        .map(([filtro]) => String(filtro))
        .join('\n');
      expect(filtros).toContain('FROM estudiante estudianteActivo');
      expect(filtros).toContain('estudianteActivo.activo = true');
      expect(filtroAsignacion).toContain(
        'examen.modo_asignacion = :modoEstudiantes',
      );
      expect(filtroAsignacion).toContain('FROM examen_estudiante');
      expect(filtroAsignacion).toContain(
        'asignacionIndividual.estudiante_id = :estudianteId',
      );
      expect(filtroAsignacion).toContain(
        'examen.modo_asignacion = :modoParalelos',
      );
      expect(filtroAsignacion).toContain('FROM inscripcion');
      expect(filtroAsignacion).toContain('INNER JOIN paralelo_examen');
      expect(filtroAsignacion).toContain(
        'inscripcion.estudiante_id = :estudianteId',
      );
      expect(parametros).toEqual({
        modoEstudiantes: 'estudiantes',
        modoParalelos: 'paralelos',
        estudianteId: 9,
      });
      const selecciones = qb.addSelect.mock.calls.map(([expresion]) =>
        typeof expresion === 'string' ? expresion : '',
      );
      expect(selecciones.join('\n')).toContain(
        "examen.modo_seleccion = 'aleatorio'",
      );
      expect(selecciones.join('\n')).toContain('FROM examen_tema');
      expect(selecciones.join('\n')).toContain('FROM examen_pregunta');
      expect(selecciones.join('\n')).not.toMatch(
        /respuesta|explicacion|solucion|nota_final/i,
      );
      expect(qb.distinct).toHaveBeenCalledWith(true);
      expect(qb.getRawMany).toHaveBeenCalledTimes(1);
      expect(qb.leftJoin).toHaveBeenCalledTimes(2);
      expect(qb.leftJoin).toHaveBeenCalledWith(
        'examen.materia',
        'materia',
      );
      expect(qb.leftJoin).toHaveBeenCalledWith(
        'examen.docente',
        'docente',
      );
    });

    it('excluye estudiantes inactivos en la misma consulta del listado', async () => {
      const qb = prepararListado([]);

      await expect(
        montaje.servicio.listarEvaluacionesAsignadas(9),
      ).resolves.toEqual([]);

      expect(qb.andWhere.mock.calls[0][0]).toContain(
        'estudianteActivo.activo = true',
      );
      expect(qb.getRawMany).toHaveBeenCalledTimes(1);
    });

    it('no clasifica una ventana ausente o inválida como disponible', async () => {
      prepararListado([
        {
          examen_id: 5,
          titulo: 'Sin ventana',
          materia: null,
          docente: null,
          disponible_desde: null,
          disponible_hasta: null,
          duracion_min: null,
          total_preguntas: '0',
        },
        {
          examen_id: 6,
          titulo: 'Ventana inválida',
          materia: null,
          docente: null,
          disponible_desde: new Date('invalid'),
          disponible_hasta: new Date(),
          duracion_min: null,
          total_preguntas: '0',
        },
      ]);

      const resultado =
        await montaje.servicio.listarEvaluacionesAsignadas(9);

      expect(resultado.map((item) => item.estado_disponibilidad)).toEqual([
        null,
        null,
      ]);
      expect(resultado[0].disponible_desde).toBeNull();
      expect(resultado[0].disponible_hasta).toBeNull();
    });
  });

  describe('instrucciones de evaluación para estudiantes', () => {
    function prepararInstrucciones(
      sobrescribir: Record<string, unknown> = {},
    ) {
      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        titulo: 'Parcial 1',
        instrucciones: 'Lee cada pregunta cuidadosamente.',
        estado: 'publicado',
        modo_asignacion: 'estudiantes',
        modo_seleccion: 'manual',
        duracion_min: 90,
        ...VENTANA,
        materia: { nombre: 'Investigación Operativa' },
        docente: { nombre: 'Juan Pérez' },
        ...sobrescribir,
      });
      montaje.examenEstudiante.count.mockResolvedValue(1);
    }

    it('devuelve metadatos e instrucciones sin cargar preguntas ni soluciones', async () => {
      prepararInstrucciones();
      montaje.examenPregunta.count.mockResolvedValue(10);

      const resultado =
        await montaje.servicio.obtenerInstruccionesEstudiante(5, 9);

      expect(resultado).toEqual({
        examen_id: 5,
        titulo: 'Parcial 1',
        instrucciones: 'Lee cada pregunta cuidadosamente.',
        materia: 'Investigación Operativa',
        docente: 'Juan Pérez',
        duracion_min: 90,
        disponible_desde: VENTANA.disponible_desde,
        disponible_hasta: VENTANA.disponible_hasta,
        total_preguntas: 10,
        estado_disponibilidad: 'disponible',
        paralelos_rendicion: [],
      });
      expect(montaje.examen.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { examen_id: 5 },
          relations: {
            materia: true,
            docente: true,
            paralelos: { paralelo: true },
          },
          select: expect.objectContaining({
            instrucciones: true,
            disponible_desde: true,
            disponible_hasta: true,
          }),
        }),
      );
      expect(montaje.examenPregunta.count).toHaveBeenCalledWith({
        where: { examen_id: 5 },
      });
      expect(montaje.examenPregunta.find).not.toHaveBeenCalled();
      expect(montaje.examenTema.find).not.toHaveBeenCalled();
      expect(montaje.pregunta.createQueryBuilder).not.toHaveBeenCalled();

      const serializado = JSON.stringify(resultado);
      expect(serializado).not.toMatch(
        /pregunta_id|opciones|respuesta|explicacion|solucion|nota_final/i,
      );
    });

    it('cuenta los criterios aleatorios sin devolver preguntas', async () => {
      prepararInstrucciones({ modo_seleccion: 'aleatorio' });
      montaje.examenTema.find.mockResolvedValue([
        { cantidad: 4 },
        { cantidad: 6 },
      ]);

      const resultado =
        await montaje.servicio.obtenerInstruccionesEstudiante(5, 9);

      expect(resultado.total_preguntas).toBe(10);
      expect(montaje.examenTema.find).toHaveBeenCalledWith({
        where: { examen_id: 5 },
        select: { cantidad: true },
      });
      expect(montaje.examenPregunta.count).not.toHaveBeenCalled();
      expect(montaje.pregunta.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('rechaza evaluaciones no publicadas antes de consultar la asignación', async () => {
      prepararInstrucciones({ estado: 'borrador' });

      await expect(
        montaje.servicio.obtenerInstruccionesEstudiante(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(montaje.estudiante.count).not.toHaveBeenCalled();
      expect(montaje.examenEstudiante.count).not.toHaveBeenCalled();
    });

    it('rechaza a estudiantes no asignados', async () => {
      prepararInstrucciones();
      montaje.examenEstudiante.count.mockResolvedValue(0);

      await expect(
        montaje.servicio.obtenerInstruccionesEstudiante(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(montaje.examenPregunta.count).not.toHaveBeenCalled();
    });

    it('rechaza a estudiantes inactivos', async () => {
      prepararInstrucciones();
      montaje.estudiante.count.mockResolvedValue(0);

      await expect(
        montaje.servicio.obtenerInstruccionesEstudiante(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(montaje.examenEstudiante.count).not.toHaveBeenCalled();
    });

    it('rechaza instrucciones fuera de la ventana publicada', async () => {
      prepararInstrucciones({
        disponible_desde: new Date(AHORA - 2 * 60 * 60 * 1000),
        disponible_hasta: new Date(AHORA - 60 * 60 * 1000),
      });

      await expect(
        montaje.servicio.obtenerInstruccionesEstudiante(5, 9),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(montaje.examenPregunta.count).not.toHaveBeenCalled();
    });
  });

  describe('regla de acceso según modo_asignacion', () => {
    it('permite el acceso al estudiante seleccionado en modo estudiantes', async () => {
      prepararVista(null, FILAS_SEGURAS, 'estudiantes');

      const vista = await montaje.servicio.obtenerVistaEstudiante(5, 9);

      expect(vista.examen_id).toBe(5);
      expect(montaje.examenEstudiante.count).toHaveBeenCalledWith({
        where: { examen_id: 5, estudiante_id: 9 },
      });
    });

    it('no usa la pertenencia al paralelo como autorización alternativa', async () => {
      prepararVista(null, FILAS_SEGURAS, 'estudiantes');
      montaje.examenEstudiante.count.mockResolvedValue(0);

      // Aunque el estudiante pertenezca a un paralelo vinculado, en modo
      // "estudiantes" esa relación no debe consultarse para autorizar.
      const qbInscripcion = queryBuilderMock([]);
      qbInscripcion.getCount.mockResolvedValue(1);
      montaje.inscripcion.createQueryBuilder.mockReturnValue(qbInscripcion);

      await expect(
        montaje.servicio.obtenerVistaEstudiante(5, 10),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(montaje.inscripcion.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('permite el acceso a un estudiante activo del paralelo en modo paralelos', async () => {
      prepararVista(null, FILAS_SEGURAS, 'paralelos');

      const vista = await montaje.servicio.obtenerVistaEstudiante(5, 9);

      expect(vista.examen_id).toBe(5);
      expect(montaje.inscripcion.createQueryBuilder).toHaveBeenCalled();
    });

    it('niega el acceso a un estudiante de otro paralelo', async () => {
      const qbInscripcion = prepararVista(
        null,
        FILAS_SEGURAS,
        'paralelos',
      )!;
      qbInscripcion.getCount.mockResolvedValue(0);

      await expect(
        montaje.servicio.obtenerVistaEstudiante(5, 99),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('evalúa la pertenencia al paralelo dinámicamente', async () => {
      const qbInscripcion = prepararVista(
        null,
        FILAS_SEGURAS,
        'paralelos',
      )!;

      // Primero no pertenece; después ingresa al paralelo.
      qbInscripcion.getCount.mockResolvedValueOnce(0);

      await expect(
        montaje.servicio.obtenerVistaEstudiante(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);

      qbInscripcion.getCount.mockResolvedValueOnce(1);

      const vista = await montaje.servicio.obtenerVistaEstudiante(5, 9);

      expect(vista.examen_id).toBe(5);
    });

    it('niega el acceso a un estudiante inactivo en modo estudiantes', async () => {
      prepararVista(null, FILAS_SEGURAS, 'estudiantes');
      montaje.estudiante.count.mockResolvedValue(0);

      await expect(
        montaje.servicio.obtenerVistaEstudiante(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('niega el acceso a un estudiante inactivo en modo paralelos', async () => {
      prepararVista(null, FILAS_SEGURAS, 'paralelos');
      montaje.estudiante.count.mockResolvedValue(0);

      await expect(
        montaje.servicio.obtenerVistaEstudiante(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('recupera el acceso al reactivarse si conserva su asignación individual', async () => {
      prepararVista(null, FILAS_SEGURAS, 'estudiantes');

      // Inactivo: pierde el acceso.
      montaje.estudiante.count.mockResolvedValueOnce(0);

      await expect(
        montaje.servicio.obtenerVistaEstudiante(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);

      // Reactivado: la evaluación sigue publicada, disponible y asignada.
      montaje.estudiante.count.mockResolvedValueOnce(1);

      const vista = await montaje.servicio.obtenerVistaEstudiante(5, 9);

      expect(vista.examen_id).toBe(5);
      expect(montaje.examenEstudiante.count).toHaveBeenCalledWith({
        where: { examen_id: 5, estudiante_id: 9 },
      });
    });

    it('niega el acceso si modo_asignacion tiene un valor desconocido', async () => {
      prepararVista(null, FILAS_SEGURAS, 'estudiantes');

      montaje.examen.findOne.mockResolvedValue({
        examen_id: 5,
        titulo: 'Evaluación de prueba',
        instrucciones: null,
        estado: 'publicado',
        modo_asignacion: 'desconocido',
        duracion_min: 60,
        ...VENTANA,
        resultados_publicados_en: null,
      });

      await expect(
        montaje.servicio.obtenerVistaEstudiante(5, 9),
      ).rejects.toBeInstanceOf(NotFoundException);
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
