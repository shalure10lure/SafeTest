import { BaseService } from '@/services/api/base.service';

import type {
    CreateMateriaDto,
    CreateMateriasLoteDto,
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

    /** Crea varias materias de una vez (todo o nada). */
    createLote(data: CreateMateriasLoteDto) {
        return this.post<Materia[], CreateMateriasLoteDto>('/lote', data);
    }

    update(id: number, data: UpdateMateriaDto) {
        return this.put<Materia, UpdateMateriaDto>(`/${id}`, data);
    }

    /** Falla con 409 si la materia tiene paralelos, evaluaciones, temas o materiales. */
    remove(id: number) {
        return this.delete<{ eliminado: boolean }>(`/${id}`);
    }
}

export const materiasService = new MateriasService();
