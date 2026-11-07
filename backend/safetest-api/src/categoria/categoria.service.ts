import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Categoria } from './entity/categoria.entity';
import { CreateCategoriaDto } from './entity/dtos/CreateCategoria.dto';
import { UpdateCategoriaDto } from './entity/dtos/UpdateCategoria.dto';

@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
  ) {}

  async findAll(docenteId: number) {
    return this.categoriaRepository.find({
      where: { docente_id: docenteId },
    });
  }

  async findOne(id: number, docenteId: number) {
    const categoria = await this.categoriaRepository.findOneBy({
      id,
      docente_id: docenteId,
    });

    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return categoria;
  }

  async create(body: CreateCategoriaDto, docenteId: number) {
    const categoria = this.categoriaRepository.create({
      ...body,
      docente_id: docenteId,
    });

    return this.categoriaRepository.save(categoria);
  }

  async update(
    id: number,
    body: UpdateCategoriaDto,
    docenteId: number,
  ) {
    const categoria = await this.findOne(id, docenteId);

    Object.assign(categoria, body);

    return this.categoriaRepository.save(categoria);
  }

  async delete(id: number, docenteId: number) {
    const categoria = await this.findOne(id, docenteId);

    return this.categoriaRepository.remove(categoria);
  }
}