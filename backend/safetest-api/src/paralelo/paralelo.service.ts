
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Paralelo } from './entity/paralelo.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Semestre } from '../semestre/entity/semestre.entity';

import { CreateParaleloDto } from './entity/dtos/CreateParalelo.dto';
import { UpdateParaleloDto } from './entity/dtos/UpdateParalelo.dto';

@Injectable()
export class ParaleloService {
  constructor(
    @InjectRepository(Paralelo)
    private readonly paraleloRepository: Repository<Paralelo>,

    @InjectRepository(Materia)
    private readonly materiaRepository: Repository<Materia>,

    @InjectRepository(Semestre)
    private readonly semestreRepository: Repository<Semestre>,
  ) {}

  // Validar que la materia y el periodo pertenezcan al docente
  // y que la materia esté asociada al periodo.

  private async validarRelaciones(
    materiaId: number,
    semestreId: number,
    docenteId: number,
  ) {
    const materia = await this.materiaRepository.findOne({
      where: {
        materia_id: materiaId,
        docente_id: docenteId,
      },
    });

    if (!materia) {
      throw new BadRequestException(
        'La materia no existe o no pertenece al docente.',
      );
    }

    const semestre = await this.semestreRepository.findOne({
      where: {
        semestre_id: semestreId,
        docente_id: docenteId,
      },
      relations: {
        materias: true,
      },
    });

    if (!semestre) {
      throw new BadRequestException(
        'El periodo académico no existe o no pertenece al docente.',
      );
    }

    const materiaAsociada = semestre.materias?.some(
      (item) => item.materia_id === materiaId,
    );

    if (!materiaAsociada) {
      throw new BadRequestException(
        'La materia no está asociada al periodo académico seleccionado.',
      );
    }
  }

  // CREAR PARALELO

  async create(body: CreateParaleloDto, docenteId: number) {
    await this.validarRelaciones(
      body.materia_id,
      body.semestre_id,
      docenteId,
    );

    const paralelo = this.paraleloRepository.create({
      nombre_paralelo: body.nombre_paralelo.trim(),
      materia_id: body.materia_id,
      semestre_id: body.semestre_id,
      docente_id: docenteId,
    });

    return this.paraleloRepository.save(paralelo);
  }

  // LISTAR SOLO LOS PARALELOS DEL DOCENTE

  async findAll(docenteId: number) {
    return this.paraleloRepository.find({
      where: {
        docente_id: docenteId,
      },
      relations: {
        materia: true,
        semestre: true,
      },
      order: {
        paralelo_id: 'ASC',
      },
    });
  }

  // CONSULTAR UN PARALELO PROPIO

  async findOne(id: number, docenteId: number) {
    const paralelo = await this.paraleloRepository.findOne({
      where: {
        paralelo_id: id,
        docente_id: docenteId,
      },
      relations: {
        materia: true,
        semestre: true,
      },
    });

    if (!paralelo) {
      throw new NotFoundException(
        'Paralelo no encontrado.',
      );
    }

    return paralelo;
  }

  // MODIFICAR UN PARALELO PROPIO

  async update(
    id: number,
    body: UpdateParaleloDto,
    docenteId: number,
  ) {
    const paralelo = await this.findOne(id, docenteId);

    const materiaId =
      body.materia_id ?? paralelo.materia_id;

    const semestreId =
      body.semestre_id ?? paralelo.semestre_id;

    await this.validarRelaciones(
      materiaId,
      semestreId,
      docenteId,
    );

    if (body.nombre_paralelo !== undefined) {
      paralelo.nombre_paralelo =
        body.nombre_paralelo.trim();
    }

    paralelo.materia_id = materiaId;
    paralelo.semestre_id = semestreId;

    return this.paraleloRepository.save(paralelo);
  }
}
