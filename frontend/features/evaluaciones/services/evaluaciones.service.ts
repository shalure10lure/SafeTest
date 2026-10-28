import { BaseService } from '@/services/api/base.service';

import type {
    BancoEvaluacion,
    CreateEvaluacionDto,
    Evaluacion,
    EvaluacionCreada,
    EvaluacionDetalle,
    GuardarSeleccionDto,
    SeleccionGuardada,
    EvaluacionActualizada,
    UpdateEvaluacionDto,
} from '../types';

class EvaluacionesService extends BaseService {
    constructor() {
        super('/examenes');
    }

    getAll() {
        return this.get<Evaluacion[]>('');
    }

    getById(id: number) {
        return this.get<EvaluacionDetalle>(`/${id}`);
    }

    create(data: CreateEvaluacionDto) {
        return this.post<EvaluacionCreada, CreateEvaluacionDto>('', data);
    }

    /** Banco de preguntas del docente; por defecto, el de la materia de la evaluación. */
    getBanco(id: number, materiaId?: number | null) {
        return this.get<BancoEvaluacion>(
            `/${id}/banco`,
            materiaId ? { params: { materia_id: materiaId } } : undefined,
        );
    }

    guardarSeleccion(id: number, data: GuardarSeleccionDto) {
        return this.put<SeleccionGuardada, GuardarSeleccionDto>(
            `/${id}/preguntas`,
            data,
        );
    }
    update(id: number, data: UpdateEvaluacionDto) {
        return this.patch<EvaluacionActualizada, UpdateEvaluacionDto>(
            `/${id}`,
            data,
        );
    }
}

export const evaluacionesService = new EvaluacionesService();