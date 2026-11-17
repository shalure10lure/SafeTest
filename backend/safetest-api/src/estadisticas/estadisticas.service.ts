
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { Materia } from '../materia/entity/materia.entity';

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
}
