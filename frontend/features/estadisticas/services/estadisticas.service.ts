import { BaseService } from '@/services/api/base.service';

import type {
    ComparacionPeriodos,
    EstadisticasMateria,
    MateriaEstadistica,
} from '../types';

class EstadisticasService extends BaseService {
    constructor() {
        super('/estadisticas');
    }

    getMaterias() {
        return this.get<MateriaEstadistica[]>('/materias');
    }

    getPorMateria(materiaId: number) {
        return this.get<EstadisticasMateria>(`/materias/${materiaId}`);
    }
    compararPeriodos(materiaId: number, periodoIds: number[]) {
        return this.post<
            ComparacionPeriodos,
            { periodoIds: number[] }
        >(
            `/materias/${materiaId}/comparacion`,
            { periodoIds },
        );
    }
}

export const estadisticasService = new EstadisticasService();
