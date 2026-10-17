import { BaseService } from '@/services/api/base.service';

import type {
  Paralelo,
  CreateParaleloDto,
  UpdateParaleloDto,
} from '../types';

class ParalelosService extends BaseService {
  constructor() {
    super('/paralelos');
  }

  getAll() {
    return this.get<Paralelo[]>('');
  }

  getById(id: number) {
    return this.get<Paralelo>(`/${id}`);
  }

  create(data: CreateParaleloDto) {
    return this.post<Paralelo, CreateParaleloDto>(
      '',
      data,
    );
  }

  update(id: number, data: UpdateParaleloDto) {
    return this.patch<Paralelo, UpdateParaleloDto>(
      `/${id}`,
      data,
    );
  }
}

export const paralelosService = new ParalelosService();