import { BaseService } from '@/services/api/base.service';

import type {
    CreateEvaluacionDto,
    Evaluacion,
    EvaluacionCreada,
} from '../types';

class EvaluacionesService extends BaseService {
    constructor() {
        super('/examenes');
    }

    getAll() {
        return this.get<Evaluacion[]>('');
    }

    getById(id: number) {
        return this.get<Evaluacion>(`/${id}`);
    }

    create(data: CreateEvaluacionDto) {
        return this.post<EvaluacionCreada, CreateEvaluacionDto>('', data);
    }
}

export const evaluacionesService = new EvaluacionesService();