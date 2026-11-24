import { BaseService } from '@/services/api/base.service';

import type {
    ComparacionPeriodos,
    EstadisticasMateria,
    FiltrosPanel,
    MateriaEstadistica,
    PanelEstadisticas,
} from '../types';

class EstadisticasService extends BaseService {
    constructor() {
        super('/estadisticas');
    }

    getMaterias() {
        return this.get<MateriaEstadistica[]>('/materias');
    }

    /** Panel completo (KPIs, percentiles, distribución y comparaciones). */
    getPanel(filtros: FiltrosPanel) {
        // Solo enviamos los filtros que tienen valor.
        const params = Object.fromEntries(
            Object.entries(filtros).filter(
                ([, valor]) => valor !== undefined && valor !== null,
            ),
        );

        return this.get<PanelEstadisticas>('/panel', { params });
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
