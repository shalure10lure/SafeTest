
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Paralelo } from './entity/paralelo.entity';
import { Estudiante } from '../estudiante/entity/estudiante.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';

interface FilaEstudiante {
  estudiante_id: number;
  nombre_completo: string;
  correo_institucional: string;
}

@Injectable()
export class ParaleloEstudiantesService {
  constructor(
    @InjectRepository(Paralelo)
    private readonly paraleloRepository:
      Repository<Paralelo>,

    @InjectRepository(Inscripcion)
    private readonly inscripcionRepository:
      Repository<Inscripcion>,
  ) {}

  async listarEstudiantes(
    paraleloId: number,
    docenteId: number,
  ) {
    // SEGURIDAD:
    // Buscar el paralelo usando simultáneamente
    // su ID y el ID del docente autenticado.
    const paralelo =
      await this.paraleloRepository.findOne({
        where: {
          paralelo_id: paraleloId,
          docente_id: docenteId,
        },
        relations: {
          materia: true,
          semestre: true,
        },
      });

    // No revelamos si el paralelo existe
    // cuando pertenece a otro docente.
    if (!paralelo) {
      throw new NotFoundException(
        'Paralelo no encontrado o sin acceso.',
      );
    }

    // Consultar los estudiantes inscritos
    // en el paralelo autorizado.
    const filas = await this.inscripcionRepository
      .createQueryBuilder('inscripcion')
      .innerJoin(
        Estudiante,
        'estudiante',
        'estudiante.estudiante_id = inscripcion.estudiante_id',
      )
      .select(
        'estudiante.estudiante_id',
        'estudiante_id',
      )
      .addSelect(
        'estudiante.nombre_completo',
        'nombre_completo',
      )
      .addSelect(
        'estudiante.correo_institucional',
        'correo_institucional',
      )
      .where(
        'inscripcion.paralelo_id = :paraleloId',
        { paraleloId },
      )
      .orderBy(
        'estudiante.nombre_completo',
        'ASC',
      )
      .getRawMany<FilaEstudiante>();

    const estudiantes = filas.map((fila) => ({
      estudiante_id: Number(fila.estudiante_id),
      nombre_completo: fila.nombre_completo,
      correo_institucional: fila.correo_institucional,
    }));

    return {
      paralelo: {
        paralelo_id: paralelo.paralelo_id,
        nombre: paralelo.nombre_paralelo,
        materia: paralelo.materia?.nombre ?? null,
        periodo: paralelo.semestre?.gestion ?? null,
      },
      total_estudiantes: estudiantes.length,
      estudiantes,
    };
  }
}
