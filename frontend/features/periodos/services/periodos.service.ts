import { BaseService } from '@/services/api/base.service';

import type {
    CreatePeriodoDto,
    Periodo,
    UpdatePeriodoDto,
} from '../types';

class PeriodosService extends BaseService {
    constructor() {
        super('/periodos');
    }

    getAll() {
        return this.get<Periodo[]>('');
    }

    getById(id: number) {
        return this.get<Periodo>(`/${id}`);
    }

    create(data: CreatePeriodoDto) {
        return this.post<Periodo, CreatePeriodoDto>('', data);
    }

    update(id: number, data: UpdatePeriodoDto) {
        return this.put<Periodo, UpdatePeriodoDto>(`/${id}`, data);
    }
}

export const periodosService = new PeriodosService();