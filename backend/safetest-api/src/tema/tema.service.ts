
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Tema } from './entity/tema.entity';
import { Materia } from '../materia/entity/materia.entity';
import { CreateTemaDto } from './entity/dtos/create-tema.dto';
import { UpdateTemaDto } from './entity/dtos/update-tema.dto';

@Injectable()
export class TemaService {
  constructor(
    @InjectRepository(Tema)
    private readonly temaRepository: Repository<Tema>,

    @InjectRepository(Materia)
    private readonly materiaRepository: Repository<Materia>,
  ) {}

  // Listar temas de las materias activas del docente.
  async findAll(docenteId: number) {
    return this.temaRepository
      .createQueryBuilder('tema')
      .innerJoin('tema.materia', 'materia')
      .where('materia.docente_id = :docenteId', { docenteId })
      .andWhere('materia.activo = :activo', { activo: true })
      .orderBy('materia.nombre', 'ASC')
      .addOrderBy('tema.nombre_tema', 'ASC')
      .getMany();
  }

  // Consultar un tema que pertenezca al docente.
  async findOne(id: number, docenteId: number) {
    const tema = await this.temaRepository
      .createQueryBuilder('tema')
      .innerJoin('tema.materia', 'materia')
      .where('tema.tema_id = :id', { id })
      .andWhere('materia.docente_id = :docenteId', { docenteId })
      .getOne();

    if (!tema) {
      throw new NotFoundException('Tema no encontrado en tus materias');
    }

    return tema;
  }

  // Crear un tema dentro de una materia propia y activa.
  async create(dto: CreateTemaDto, docenteId: number) {
    const materia = await this.validarMateriaDelDocente(
      dto.materia_id,
      docenteId,
    );

    const nombre = dto.nombre_tema.trim();

    await this.validarNombreUnico(nombre, dto.materia_id);

    const tema = this.temaRepository.create({
      nombre_tema: nombre,
      materia_id: materia.materia_id,
    });

    return this.temaRepository.save(tema);
  }

  // Actualizar el nombre o la materia de un tema.
  async update(id: number, dto: UpdateTemaDto, docenteId: number) {
    const tema = await this.findOne(id, docenteId);

    const materiaId = dto.materia_id ?? tema.materia_id;

    if (dto.materia_id !== undefined) {
      await this.validarMateriaDelDocente(materiaId, docenteId);
    }

    if (dto.nombre_tema !== undefined) {
      const nombre = dto.nombre_tema.trim();

      await this.validarNombreUnico(nombre, materiaId, id);

      tema.nombre_tema = nombre;
    }

    if (dto.materia_id !== undefined) {
      tema.materia_id = materiaId;
    }

    return this.temaRepository.save(tema);
  }

  // Verificar que la materia pertenezca al docente y esté activa.
  private async validarMateriaDelDocente(
    materiaId: number,
    docenteId: number,
  ) {
    const materia = await this.materiaRepository.findOneBy({
      materia_id: materiaId,
      docente_id: docenteId,
      activo: true,
    });

    if (!materia) {
      throw new NotFoundException(
        'Materia no encontrada o no pertenece a tus materias activas',
      );
    }

    return materia;
  }

  // Evitar nombres repetidos dentro de una misma materia.
  private async validarNombreUnico(
    nombre: string,
    materiaId: number,
    temaIdExcluir?: number,
  ) {
    const consulta = this.temaRepository
      .createQueryBuilder('tema')
      .where('LOWER(tema.nombre_tema) = LOWER(:nombre)', { nombre })
      .andWhere('tema.materia_id = :materiaId', { materiaId });

    if (temaIdExcluir !== undefined) {
      consulta.andWhere('tema.tema_id != :temaIdExcluir', {
        temaIdExcluir,
      });
    }

    const existe = await consulta.getOne();

    if (existe) {
      throw new ConflictException(
        'Ya existe un tema con ese nombre en esta materia',
      );
    }
  }
}
