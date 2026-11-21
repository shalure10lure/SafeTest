import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Semestre } from '../semestre/entity/semestre.entity';

function redondear(valor: string | number | null): number | null {
  if (valor === null || valor === undefined) {
    return null;
  }

  return Number(Number(valor).toFixed(2));
}

@Injectable()
export class EstadisticasService {
  constructor(
    @InjectRepository(Rendicion)
    private readonly rendicionRepository: Repository<Rendicion>,

    @InjectRepository(Materia)
    private readonly materiaRepository: Repository<Materia>,

    @InjectRepository(Semestre)
    private readonly semestreRepository: Repository<Semestre>,
  ) {}

  async obtenerMaterias(docenteId: number) {
    return this.materiaRepository.find({
      where: { docente_id: docenteId },
      select: {
        materia_id: true,
        nombre: true,
        codigo: true,
      },
      order: { nombre: 'ASC' },
    });
  }

  async obtenerPorMateria(materiaId: number, docenteId: number) {
    const materia = await this.materiaRepository.findOne({
      where: {
        materia_id: materiaId,
        docente_id: docenteId,
      },
      select: {
        materia_id: true,
        nombre: true,
        codigo: true,
      },
    });

    if (!materia) {
      throw new NotFoundException('Materia no encontrada');
    }

    const crearConsulta = () =>
    this.rendicionRepository
      .createQueryBuilder('rendicion')
      .innerJoin('rendicion.examen', 'examen')
      .innerJoin('rendicion.paralelo', 'paralelo')
      .where('paralelo.materia_id = :materiaId', { materiaId })
      .andWhere('paralelo.docente_id = :docenteId', { docenteId })
      .andWhere('paralelo.semestre_id = examen.semestre_id')
      .andWhere(
       `EXISTS (
          SELECT 1
          FROM periodo_materia pm
          WHERE pm.semestre_id = examen.semestre_id
            AND pm.materia_id = :materiaId
        )`,
        { materiaId },
      )
      .andWhere(
        '(examen.materia_id IS NULL OR examen.materia_id = :materiaId)',
        { materiaId },
      )
      .andWhere('rendicion.estado = :estado', {
        estado: 'corregida',
      })
      .andWhere('rendicion.nota_final IS NOT NULL');

    // Resumen general
    const resumen = await crearConsulta()
      .select('COUNT(DISTINCT rendicion.estudiante_id)', 'total_estudiantes')
      .addSelect('COUNT(DISTINCT examen.examen_id)', 'total_evaluaciones')
      .addSelect('AVG(rendicion.nota_final)', 'promedio')
      .addSelect('MAX(rendicion.nota_final)', 'nota_maxima')
      .addSelect('MIN(rendicion.nota_final)', 'nota_minima')
      .getRawOne();

    // Promedio por evaluación
    const porEvaluacion = await crearConsulta()
      .innerJoin('examen.semestre', 'semestre')
      .select('examen.examen_id', 'examen_id')
      .addSelect('examen.titulo', 'titulo')
      .addSelect('semestre.gestion', 'periodo')
      .addSelect('COUNT(rendicion.estudiante_id)', 'total_rendiciones')
      .addSelect('AVG(rendicion.nota_final)', 'promedio')
      .groupBy('examen.examen_id')
      .addGroupBy('examen.titulo')
      .addGroupBy('semestre.semestre_id')
      .addGroupBy('semestre.gestion')
      .orderBy('examen.examen_id', 'ASC')
      .getRawMany();

    // Promedio por periodo académico
    const porPeriodo = await crearConsulta()
      .innerJoin('examen.semestre', 'semestre')
      .select('semestre.semestre_id', 'semestre_id')
      .addSelect('semestre.gestion', 'periodo')
      .addSelect('COUNT(DISTINCT examen.examen_id)', 'total_evaluaciones')
      .addSelect('COUNT(rendicion.estudiante_id)', 'total_rendiciones')
      .addSelect('AVG(rendicion.nota_final)', 'promedio')
      .groupBy('semestre.semestre_id')
      .addGroupBy('semestre.gestion')
      .orderBy('semestre.gestion', 'ASC')
      .getRawMany();

    // Promedio por paralelo
    const porParalelo = await crearConsulta()
      .select('paralelo.paralelo_id', 'paralelo_id')
      .addSelect('paralelo.nombre_paralelo', 'nombre')
      .addSelect('COUNT(DISTINCT rendicion.estudiante_id)', 'total_estudiantes')
      .addSelect('COUNT(rendicion.estudiante_id)', 'total_rendiciones')
      .addSelect('AVG(rendicion.nota_final)', 'promedio')
      .groupBy('paralelo.paralelo_id')
      .addGroupBy('paralelo.nombre_paralelo')
      .orderBy('paralelo.nombre_paralelo', 'ASC')
      .getRawMany();

    return {
      materia,
      total_estudiantes: Number(resumen?.total_estudiantes ?? 0),
      total_evaluaciones: Number(resumen?.total_evaluaciones ?? 0),
      promedio: redondear(resumen?.promedio ?? null),
      nota_maxima: redondear(resumen?.nota_maxima ?? null),
      nota_minima: redondear(resumen?.nota_minima ?? null),

      por_evaluacion: porEvaluacion.map((fila) => ({
        examen_id: Number(fila.examen_id),
        titulo: fila.titulo ?? `Evaluación ${fila.examen_id}`,
        periodo: fila.periodo,
        total_rendiciones: Number(fila.total_rendiciones),
        promedio: redondear(fila.promedio),
      })),

      por_periodo: porPeriodo.map((fila) => ({
        semestre_id: Number(fila.semestre_id),
        periodo: fila.periodo,
        total_evaluaciones: Number(fila.total_evaluaciones),
        total_rendiciones: Number(fila.total_rendiciones),
        promedio: redondear(fila.promedio),
      })),

      por_paralelo: porParalelo.map((fila) => ({
        paralelo_id: Number(fila.paralelo_id),
        nombre: fila.nombre,
        total_estudiantes: Number(fila.total_estudiantes),
        total_rendiciones: Number(fila.total_rendiciones),
        promedio: redondear(fila.promedio),
      })),
    };
  }

  async compararPeriodos(
    materiaId: number,
    docenteId: number,
    periodoIds: number[],
  ) {
    // 1. Validar la cantidad y los identificadores recibidos.
    if (
      !Array.isArray(periodoIds) ||
      periodoIds.length < 2 ||
      periodoIds.length > 6 ||
      !periodoIds.every(
        (id) => Number.isInteger(id) && id > 0,
      ) ||
      new Set(periodoIds).size !== periodoIds.length
    ) {
      throw new BadRequestException(
        'Debes seleccionar entre 2 y 6 periodos diferentes y válidos',
      );
    }

    // 2. Verificar que la materia pertenezca al docente.
    const materia = await this.materiaRepository.findOne({
      where: {
        materia_id: materiaId,
        docente_id: docenteId,
      },
      select: {
        materia_id: true,
        nombre: true,
        codigo: true,
      },
    });

    if (!materia) {
      throw new NotFoundException('Materia no encontrada');
    }

    // 3. Obtener y validar los periodos seleccionados.
    const periodosEncontrados = await this.semestreRepository.find({
      where: {
        semestre_id: In(periodoIds),
      },
      relations: {
        materias: true,
      },
    });

    if (periodosEncontrados.length !== periodoIds.length) {
      throw new BadRequestException(
        'Uno o más periodos seleccionados no existen',
      );
    }

    const periodosValidos = periodosEncontrados.every(
      (periodo) =>
        periodo.docente_id === docenteId &&
        periodo.activo &&
        periodo.materias.some(
          (materiaPeriodo) =>
            materiaPeriodo.materia_id === materiaId,
        ),
    );

    if (!periodosValidos) {
      throw new BadRequestException(
        'Los periodos deben estar activos, pertenecer al docente y tener asociada la materia',
      );
    }

    // 4. Ordenar cronológicamente.
    const periodos = [...periodosEncontrados].sort((a, b) => {
      if (a.fecha_inicio && b.fecha_inicio) {
        const diferenciaFecha = a.fecha_inicio.localeCompare(
          b.fecha_inicio,
        );

        if (diferenciaFecha !== 0) {
          return diferenciaFecha;
        }
      } else if (a.fecha_inicio) {
        return -1;
      } else if (b.fecha_inicio) {
        return 1;
      }

      return a.semestre_id - b.semestre_id;
    });

    // 5. Obtener las estadísticas de todos los periodos.
    const resultados = await this.rendicionRepository
  .createQueryBuilder('rendicion')
  .innerJoin('rendicion.examen', 'examen')
  .innerJoin('rendicion.paralelo', 'paralelo')
  .leftJoin(
    'examen_pool_snapshot',
    'snapshot',
    'snapshot.examen_id = examen.examen_id',
  )
  .select('examen.semestre_id', 'semestre_id')
  .addSelect(
    'COUNT(DISTINCT examen.examen_id)',
    'total_evaluaciones',
  )
  .addSelect('COUNT(*)', 'total_rendiciones')
  .addSelect(
    `AVG(
      (rendicion.nota_final::numeric /
      COALESCE(
        NULLIF(examen.puntaje_total::numeric, 0),
        NULLIF(snapshot.puntaje_maximo_garantizado, 0)
      )) * 100
    )`,
    'promedio',
  )
  .where('examen.semestre_id IN (:...periodoIds)', {
    periodoIds: periodos.map((periodo) => periodo.semestre_id),
  })
  .andWhere('paralelo.materia_id = :materiaId', {
    materiaId,
  })
  .andWhere('paralelo.docente_id = :docenteId', {
    docenteId,
  })
  .andWhere('paralelo.semestre_id = examen.semestre_id')
  .andWhere(
    '(examen.materia_id IS NULL OR examen.materia_id = :materiaId)',
    { materiaId },
  )
  .andWhere('rendicion.estado = :estado', {
    estado: 'corregida',
  })
  .andWhere('rendicion.nota_final IS NOT NULL')
  .andWhere(
    `COALESCE(
      NULLIF(examen.puntaje_total::numeric, 0),
      NULLIF(snapshot.puntaje_maximo_garantizado, 0)
    ) > 0`,
  )
  .groupBy('examen.semestre_id')
  .getRawMany();

    // 6. Preparar los resultados, incluyendo periodos sin datos.
    const resultadosPorPeriodo = new Map(
      resultados.map((fila) => [
        Number(fila.semestre_id),
        fila,
      ]),
    );

    const comparaciones = periodos.map((periodo, indice) => {
      const fila = resultadosPorPeriodo.get(periodo.semestre_id);

      const promedio = redondear(fila?.promedio ?? null);
      const periodoAnterior =
        indice > 0 ? periodos[indice - 1] : null;

      const filaAnterior = periodoAnterior
        ? resultadosPorPeriodo.get(periodoAnterior.semestre_id)
        : null;

      const promedioAnterior = redondear(
        filaAnterior?.promedio ?? null,
      );

      const diferencia =
        promedio !== null && promedioAnterior !== null
          ? redondear(promedio - promedioAnterior)
          : null;

      return {
        semestre_id: periodo.semestre_id,
        periodo: periodo.gestion,
        fecha_inicio: periodo.fecha_inicio,
        total_evaluaciones: Number(
          fila?.total_evaluaciones ?? 0,
        ),
        total_rendiciones: Number(
          fila?.total_rendiciones ?? 0,
        ),
        promedio,
        periodo_anterior: periodoAnterior?.gestion ?? null,
        diferencia_anterior: diferencia,
      };
    });

    return {
      materia,
      total_periodos: comparaciones.length,
      comparaciones,
    };
  }

}
