import { BaseService } from '@/services/api/base.service';

import type { PreguntaBanco } from '../types';

class PreguntasService extends BaseService {
    constructor() {
        super('/preguntas');
    }

    getByMateria(materiaId: number) {
        return this.get<PreguntaBanco[]>('', { params: { materia_id: materiaId } });
    }
}

export const preguntasService = new PreguntasService();