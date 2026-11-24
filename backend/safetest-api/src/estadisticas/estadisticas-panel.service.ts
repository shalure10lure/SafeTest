import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Materia } from '../materia/entity/materia.entity';
import { Paralelo } from '../paralelo/entity/paralelo.entity';
import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { Semestre } from '../semestre/entity/semestre.entity';
import { PanelEstadisticasQueryDto } from './dto/panel-estadisticas.dto';
import {
  agruparPromedios,
  calcularDistribucion,
  calcularPercentiles,
  notaEnPorcentaje,
  promedio,
  redondear,
  type FilaNota,
  type Percentiles,
  type RangoDistribucion,
} from './estadisticas-calculos';

/** Mensaje que ve el docente cuando pide datos de otro docente (HTTP 403). */
export const MENSAJE_OTRO_DOCENTE =
  'El recurso solicitado pertenece al ámbito académico de otro docente (materia, paralelo o resultados).';

/* ------------------------------------------------------------------ */
/* Forma de la respuesta (la usa el frontend: features/estadisticas)   */
/* ------------------------------------------------------------------ */

export interface PanelEstadisticas {
  /** Listas para llenar los selectores de filtro. */
  filtros: {
    materias: { materia_id: number; nombre: string; codigo: string }[];
    periodos: {
      semestre_id: number;
      gestion: string;
      /** Materias asociadas al periodo (para filtrar el selector). */
      materia_ids: number[];
    }[];
    paralelos: {
      paralelo_id: number;
      nombre: string;
      materia_id: number;
      semestre_id: number;
    }[];
    evaluaciones: {
      examen_id: number;
      titulo: string;
      materia_id: number;
      semestre_id: number;
    }[];
  };
  /** Filtros realmente aplicados (incluye los valores por defecto elegidos). */
  seleccion: {
    materia_id: number | null;
    semestre_id: number | null;
    examen_id: number | null;
    paralelo_id: number | null;
  };
  resumen: {
    promedio: number | null;
    nota_maxima: number | null;
    nota_minima: number | null;
    total_estudiantes: number;
    total_rendiciones: number;
  };
  percentiles: Percentiles | null;
  distribucion: RangoDistribucion[];
  por_materia: {
    materia_id: number;
    nombre: string;
    promedio: number | null;
    n: number;
  }[];
  por_paralelo: {
    paralelo_id: number;
    nombre: string;
    promedio: number | null;
    n: number;
  }[];
  por_periodo: {
    semestre_id: number;
    periodo: string;
    promedio: number | null;
    n: number;
  }[];
  por_evaluacion: {
    examen_id: number;
    titulo: string;
    promedio: number | null;
    n: number;
  }[];
}

@Injectable()
export class EstadisticasPanelService {
  constructor(
    @InjectRepository(Rendicion)
    private readonly rendicionRepository: Repository<Rendicion>,

    @InjectRepository(Materia)
    private readonly materiaRepository: Repository<Materia>,

    @InjectRepository(Semestre)
    private readonly semestreRepository: Repository<Semestre>,

    @InjectRepository(Paralelo)
    private readonly paraleloRepository: Repository<Paralelo>,
  ) {}

  async obtenerPanel(
    docenteId: number,
    filtros: PanelEstadisticasQueryDto,
  ): Promise<PanelEstadisticas> {
    // 1. Todo lo que pertenece a este docente (para los selectores).
    const [materias, semestres, paralelos] = await Promise.all([
      this.materiaRepository.find({
        where: { docente_id: docenteId },
        select: { materia_id: true, nombre: true, codigo: true },
        order: { nombre: 'ASC' },
      }),
      this.semestreRepository.find({
        where: { docente_id: docenteId },
        relations: { materias: true },
      }),
      this.paraleloRepository.find({
        where: { docente_id: docenteId },
        order: { nombre_paralelo: 'ASC' },
      }),
    ]);

    // 2. Si pidieron algo que no es suyo -> 403 (o 404 si no existe).
    await this.validarPropiedad(
      filtros.materia_id,
      materias.map((m) => m.materia_id),
      (id) => this.materiaRepository.existsBy({ materia_id: id }),
      'La materia',
    );
    await this.validarPropiedad(
      filtros.semestre_id,
      semestres.map((s) => s.semestre_id),
      (id) => this.semestreRepository.existsBy({ semestre_id: id }),
      'El periodo',
    );
    await this.validarPropiedad(
      filtros.paralelo_id,
      paralelos.map((p) => p.paralelo_id),
      (id) => this.paraleloRepository.existsBy({ paralelo_id: id }),
      'El paralelo',
    );

    // 3. Todas las notas corregidas del docente, ya en escala 0-100.
    const filas = await this.obtenerNotas(docenteId);

    // La evaluación solo es válida si aparece en SUS notas.
    if (
      filtros.examen_id !== undefined &&
      !filas.some((fila) => fila.examen_id === filtros.examen_id)
    ) {
      throw new NotFoundException(
        'La evaluación indicada no tiene calificaciones disponibles',
      );
    }

    // 4. Filtros por defecto: materia y periodo más recientes con datos.
    const materiaId =
      filtros.materia_id ??
      materias.find((m) => filas.some((f) => f.materia_id === m.materia_id))
        ?.materia_id ??
      materias[0]?.materia_id ??
      null;

    const semestreId =
      filtros.semestre_id ??
      this.elegirPeriodoPorDefecto(materiaId, semestres, filas);

    const examenId = filtros.examen_id ?? null;
    const paraleloId = filtros.paralelo_id ?? null;

    // 5. Cada bloque del panel usa un conjunto distinto de filtros:
    const filasDeMateria = filas.filter((f) => f.materia_id === materiaId);
    const filasSeleccion = filasDeMateria.filter(
      (f) =>
        f.semestre_id === semestreId &&
        (examenId === null || f.examen_id === examenId) &&
        (paraleloId === null || f.paralelo_id === paraleloId),
    );
    const porcentajes = filasSeleccion.map((f) => f.porcentaje);

    const resumen = {
      promedio: promedio(porcentajes),
      nota_maxima: porcentajes.length
        ? redondear(Math.max(...porcentajes))
        : null,
      nota_minima: porcentajes.length
        ? redondear(Math.min(...porcentajes))
        : null,
      total_estudiantes: new Set(filasSeleccion.map((f) => f.estudiante_id))
        .size,
      total_rendiciones: filasSeleccion.length,
    };

    // Rendimiento por materia: todas las materias del docente en el periodo.
    const filasDelPeriodo = filas.filter((f) => f.semestre_id === semestreId);
    const porMateria = [
      ...agruparPromedios(filasDelPeriodo, (f) => f.materia_id).entries(),
    ].map(([id, grupo]) => ({
      materia_id: id,
      nombre:
        materias.find((m) => m.materia_id === id)?.nombre ?? `Materia ${id}`,
      promedio: grupo.promedio,
      n: grupo.n,
    }));

    // Comparación entre paralelos: ignora el filtro de paralelo (si no,
    // solo habría una barra) pero respeta materia, periodo y evaluación.
    const porParalelo = [
      ...agruparPromedios(
        filasDeMateria.filter(
          (f) =>
            f.semestre_id === semestreId &&
            (examenId === null || f.examen_id === examenId),
        ),
        (f) => f.paralelo_id,
      ).entries(),
    ].map(([id, grupo]) => ({
      paralelo_id: id,
      nombre: grupo.primera.paralelo_nombre,
      promedio: grupo.promedio,
      n: grupo.n,
    }));

    // Comparación entre periodos: ignora el periodo y la evaluación.
    const porPeriodo = [
      ...agruparPromedios(
        filasDeMateria.filter(
          (f) => paraleloId === null || f.paralelo_id === paraleloId,
        ),
        (f) => f.semestre_id,
      ).entries(),
    ]
      .map(([id, grupo]) => ({
        semestre_id: id,
        periodo:
          semestres.find((s) => s.semestre_id === id)?.gestion ??
          `Periodo ${id}`,
        promedio: grupo.promedio,
        n: grupo.n,
      }))
      .sort((a, b) =>
        this.compararPeriodos(
          semestres.find((s) => s.semestre_id === a.semestre_id),
          semestres.find((s) => s.semestre_id === b.semestre_id),
        ),
      );

    // Comparación entre evaluaciones: ignora la evaluación.
    const porEvaluacion = [
      ...agruparPromedios(
        filasDeMateria.filter(
          (f) =>
            f.semestre_id === semestreId &&
            (paraleloId === null || f.paralelo_id === paraleloId),
        ),
        (f) => f.examen_id,
      ).entries(),
    ].map(([id, grupo]) => ({
      examen_id: id,
      titulo: grupo.primera.examen_titulo,
      promedio: grupo.promedio,
      n: grupo.n,
    }));

    // Lista de evaluaciones para el selector (una por examen y materia).
    const evaluaciones = new Map<
      string,
      PanelEstadisticas['filtros']['evaluaciones'][number]
    >();
    for (const fila of filas) {
      evaluaciones.set(`${fila.examen_id}-${fila.materia_id}`, {
        examen_id: fila.examen_id,
        titulo: fila.examen_titulo,
        materia_id: fila.materia_id,
        semestre_id: fila.semestre_id,
      });
    }

    return {
      filtros: {
        materias: materias.map((m) => ({
          materia_id: m.materia_id,
          nombre: m.nombre,
          codigo: m.codigo,
        })),
        periodos: [...semestres]
          .sort((a, b) => this.compararPeriodos(a, b))
          .map((s) => ({
            semestre_id: s.semestre_id,
            gestion: s.gestion,
            materia_ids: (s.materias ?? []).map((m) => m.materia_id),
          })),
        paralelos: paralelos.map((p) => ({
          paralelo_id: p.paralelo_id,
          nombre: p.nombre_paralelo,
          materia_id: p.materia_id,
          semestre_id: p.semestre_id,
        })),
        evaluaciones: [...evaluaciones.values()],
      },
      seleccion: {
        materia_id: materiaId,
        semestre_id: semestreId,
        examen_id: examenId,
        paralelo_id: paraleloId,
      },
      resumen,
      percentiles: calcularPercentiles(porcentajes),
      distribucion: calcularDistribucion(porcentajes),
      por_materia: porMateria,
      por_paralelo: porParalelo,
      por_periodo: porPeriodo,
      por_evaluacion: porEvaluacion,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Ayudantes privados                                                */
  /* ---------------------------------------------------------------- */

  /**
   * Si `id` fue pedido y no está en la lista del docente:
   *  - existe en la base de datos -> es de otro docente -> 403
   *  - no existe                  -> 404
   */
  private async validarPropiedad(
    id: number | undefined,
    idsPropios: number[],
    existe: (id: number) => Promise<boolean>,
    nombre: string,
  ): Promise<void> {
    if (id === undefined || idsPropios.includes(id)) return;

    if (await existe(id)) {
      throw new ForbiddenException(MENSAJE_OTRO_DOCENTE);
    }

    throw new NotFoundException(`${nombre} indicado no existe`);
  }

  /** Trae las notas corregidas del docente y las pasa a escala 0-100. */
  private async obtenerNotas(docenteId: number): Promise<FilaNota[]> {
    const crudas = await this.rendicionRepository
      .createQueryBuilder('rendicion')
      .innerJoin('rendicion.examen', 'examen')
      .innerJoin('rendicion.paralelo', 'paralelo')
      .leftJoin(
        'examen_pool_snapshot',
        'snapshot',
        'snapshot.examen_id = examen.examen_id',
      )
      .select('rendicion.estudiante_id', 'estudiante_id')
      .addSelect('rendicion.nota_final', 'nota_final')
      .addSelect('examen.examen_id', 'examen_id')
      .addSelect('examen.titulo', 'examen_titulo')
      .addSelect('examen.semestre_id', 'semestre_id')
      .addSelect('examen.puntaje_total', 'puntaje_total')
      .addSelect('snapshot.puntaje_maximo_garantizado', 'puntaje_snapshot')
      .addSelect('paralelo.paralelo_id', 'paralelo_id')
      .addSelect('paralelo.nombre_paralelo', 'paralelo_nombre')
      .addSelect('paralelo.materia_id', 'materia_id')
      .where('paralelo.docente_id = :docenteId', { docenteId })
      .andWhere('paralelo.semestre_id = examen.semestre_id')
      .andWhere(
        '(examen.materia_id IS NULL OR examen.materia_id = paralelo.materia_id)',
      )
      .andWhere('rendicion.estado = :estado', { estado: 'corregida' })
      .andWhere('rendicion.nota_final IS NOT NULL')
      .getRawMany();

    const filas: FilaNota[] = [];

    for (const cruda of crudas) {
      // Igual que en la comparación de periodos: primero el puntaje total
      // configurado por el docente; si no hay, el máximo de la instantánea.
      const puntajeTotal = Number(cruda.puntaje_total);
      const maximo =
        Number.isFinite(puntajeTotal) && puntajeTotal > 0
          ? puntajeTotal
          : cruda.puntaje_snapshot;

      const porcentaje = notaEnPorcentaje(cruda.nota_final, maximo);
      // Sin puntaje máximo no se puede comparar: se omite esa nota.
      if (porcentaje === null) continue;

      filas.push({
        estudiante_id: Number(cruda.estudiante_id),
        examen_id: Number(cruda.examen_id),
        examen_titulo:
          cruda.examen_titulo ?? `Evaluación ${cruda.examen_id}`,
        paralelo_id: Number(cruda.paralelo_id),
        paralelo_nombre: cruda.paralelo_nombre,
        materia_id: Number(cruda.materia_id),
        semestre_id: Number(cruda.semestre_id),
        porcentaje,
      });
    }

    return filas;
  }

  /**
   * Periodo por defecto: el más reciente que tenga notas de la materia.
   * Si ninguno tiene notas, el más reciente asociado a la materia.
   */
  private elegirPeriodoPorDefecto(
    materiaId: number | null,
    semestres: Semestre[],
    filas: FilaNota[],
  ): number | null {
    if (materiaId === null) return null;

    const masRecienteAlFinal = [...semestres].sort((a, b) =>
      this.compararPeriodos(a, b),
    );
    const recientesPrimero = masRecienteAlFinal.reverse();

    const conNotas = recientesPrimero.find((s) =>
      filas.some(
        (f) => f.materia_id === materiaId && f.semestre_id === s.semestre_id,
      ),
    );
    if (conNotas) return conNotas.semestre_id;

    const asociado = recientesPrimero.find((s) =>
      (s.materias ?? []).some((m) => m.materia_id === materiaId),
    );
    return asociado?.semestre_id ?? null;
  }

  /** Orden cronológico (más antiguo primero) por fecha de inicio y luego id. */
  private compararPeriodos(
    a: Semestre | undefined,
    b: Semestre | undefined,
  ): number {
    if (!a || !b) return 0;

    if (a.fecha_inicio && b.fecha_inicio) {
      const diferencia = a.fecha_inicio.localeCompare(b.fecha_inicio);
      if (diferencia !== 0) return diferencia;
    } else if (a.fecha_inicio) {
      return -1; // los que tienen fecha van antes que los que no
    } else if (b.fecha_inicio) {
      return 1;
    }

    return a.semestre_id - b.semestre_id;
  }
}
