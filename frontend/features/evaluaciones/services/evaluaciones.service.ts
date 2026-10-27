import { BaseService } from '@/services/api/base.service';

import type {
    CreateEvaluacionDto,
    Evaluacion,
    EvaluacionCreada,
    GuardarSeleccionDto,
    SeleccionEvaluacion,
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

    getSeleccion(id: number) {
        return this.get<SeleccionEvaluacion>(`/${id}/seleccion`);
    }

    guardarSeleccion(id: number, data: GuardarSeleccionDto) {
        return this.put<unknown, GuardarSeleccionDto>(`/${id}/seleccion`, data);
    }
}

export const evaluacionesService = new EvaluacionesService();