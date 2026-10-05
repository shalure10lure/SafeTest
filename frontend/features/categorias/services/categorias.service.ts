import { BaseService } from '@/services/api/base.service';

import type {
  Categoria,
  CreateCategoriaDto,
  UpdateCategoriaDto,
} from '../types';

class CategoriasService extends BaseService {
  constructor() {
    super('/categorias');
  }

  async getAll(): Promise<Categoria[]> {
    return this.get<Categoria[]>('');
  }

  async getById(id: number): Promise<Categoria> {
    return this.get<Categoria>(`/${id}`);
  }

  async create(data: CreateCategoriaDto): Promise<Categoria> {
    return this.post<Categoria, CreateCategoriaDto>('', data);
  }

  async update(
    id: number,
    data: UpdateCategoriaDto,
  ): Promise<Categoria> {
    return this.put<Categoria, UpdateCategoriaDto>(
      `/${id}`,
      data,
    );
  }

  async eliminar(id: number): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

export const categoriasService = new CategoriasService();