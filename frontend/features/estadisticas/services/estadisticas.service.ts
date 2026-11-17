import { BaseService } from '@/services/api/base.service';

import type {
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
}

export const estadisticasService = new EstadisticasService();
