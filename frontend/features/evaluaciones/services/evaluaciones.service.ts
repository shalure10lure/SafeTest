import { BaseService } from '@/services/api/base.service';

import type {
    AsignacionDisponible,
    AsignacionGuardada,
    BancoEvaluacion,
    CreateEvaluacionDto,
    Evaluacion,
    EvaluacionActualizada,
    EvaluacionCreada,
    EvaluacionDetalle,
    GuardarAsignacionDto,
    GuardarConfiguracionDto,
    GuardarSeleccionDto,
    SeleccionGuardada,
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

    update(id: number, data: UpdateEvaluacionDto) {
        return this.patch<EvaluacionActualizada, UpdateEvaluacionDto>(
            `/${id}`,
            data,
        );
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

    guardarConfiguracion(id: number, data: GuardarConfiguracionDto) {
        return this.put<EvaluacionDetalle, GuardarConfiguracionDto>(
            `/${id}/configuracion`,
            data,
        );
    }

    /** Paralelos (con sus estudiantes) que se pueden asignar a la evaluación. */
    getAsignacion(id: number) {
        return this.get<AsignacionDisponible>(`/${id}/asignacion`);
    }

    guardarAsignacion(id: number, data: GuardarAsignacionDto) {
        return this.put<AsignacionGuardada, GuardarAsignacionDto>(
            `/${id}/asignacion`,
            data,
        );
    }
}

export const evaluacionesService = new EvaluacionesService();