import { BaseService } from '@/services/api/base.service';

import type { ConfigurarPeriodoPayload, ResultadoConfiguracion } from '../types';

/** Llama al asistente del backend: crea periodo + materias + paralelos de una vez. */
class ConfiguracionAcademicaService extends BaseService {
    constructor() {
        super('/configuracion-academica');
    }

    configurarPeriodo(payload: ConfigurarPeriodoPayload) {
        return this.post<ResultadoConfiguracion, ConfigurarPeriodoPayload>(
            '/periodo',
            payload,
        );
    }
}

export const configuracionAcademicaService = new ConfiguracionAcademicaService();
