import { BaseService } from '@/services/api/base.service';

import type { Tema } from '../types';

class TemasService extends BaseService {
    constructor() {
        super('/temas');
    }

    getByMateria(materiaId: number) {
        return this.get<Tema[]>('', { params: { materia_id: materiaId } });
    }
}

export const temasService = new TemasService();