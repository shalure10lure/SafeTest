
import { BaseService } from '@/services/api/base.service';

import type {
    ActualizarTemaDto,
    CrearTemaDto,
    Tema,
} from '../types';

class TemasService extends BaseService {
    constructor() {
        super('/temas');
    }

    getAll() {
        return this.get<Tema[]>('');
    }

    getById(id: number) {
        return this.get<Tema>(`/${id}`);
    }

    create(data: CrearTemaDto) {
        return this.post<Tema, CrearTemaDto>('', data);
    }

    update(id: number, data: ActualizarTemaDto) {
        return this.put<Tema, ActualizarTemaDto>(
            `/${id}`,
            data,
        );
    }
}

export const temasService = new TemasService();

