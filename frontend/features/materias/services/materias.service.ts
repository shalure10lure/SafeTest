import { BaseService } from '@/services/api/base.service';

import type {
    CreateMateriaDto,
    Materia,
    UpdateMateriaDto,
} from '../types';

class MateriasService extends BaseService {
    constructor() {
        super('/materias');
    }

    getAll() {
        return this.get<Materia[]>('');
    }

    getById(id: number) {
        return this.get<Materia>(`/${id}`);
    }

    create(data: CreateMateriaDto) {
        return this.post<Materia, CreateMateriaDto>('', data);
    }

    update(id: number, data: UpdateMateriaDto) {
        return this.put<Materia, UpdateMateriaDto>(`/${id}`, data);
    }
}

export const materiasService = new MateriasService();