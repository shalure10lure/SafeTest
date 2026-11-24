import { BaseService } from '@/services/api/base.service';

import type { ResumenAcademico, ResumenDocente } from '../types';

/**
 * Datos reales del panel del docente (reemplaza a los datos de ejemplo).
 * El backend siempre responde solo con información del docente autenticado.
 */
class DocenteDashboardService extends BaseService {
    constructor() {
        super('/panel-docente');
    }

    /** Pantalla de Inicio. */
    getResumen() {
        return this.get<ResumenDocente>('/inicio');
    }

    /** Pantalla "Gestión académica" (Resumen). */
    getResumenAcademico() {
        return this.get<ResumenAcademico>('/resumen-academico');
    }
}

export const docenteDashboardService = new DocenteDashboardService();
