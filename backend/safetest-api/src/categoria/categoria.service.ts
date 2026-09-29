import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Categoria } from './entity/categoria.entity';
import { CreateCategoriaDto } from './entity/dtos/create-categoria.dto';
import { UpdateCategoriaDto } from './entity/dtos/update-categoria.dto';

@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
  ) {}

  async findAll() {
    return this.categoriaRepository.find();
  }

  async findOne(id: number) {
    const categoria = await this.categoriaRepository.findOneBy({ id });

    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return categoria;
  }

  async create(body: CreateCategoriaDto) {
    const categoria = this.categoriaRepository.create(body);

    return this.categoriaRepository.save(categoria);
  }

  async update(id: number, body: UpdateCategoriaDto) {
    const categoria = await this.findOne(id);

    Object.assign(categoria, body);

    return this.categoriaRepository.save(categoria);
  }

  async delete(id: number) {
    const categoria = await this.findOne(id);

    return this.categoriaRepository.remove(categoria);
  }
}