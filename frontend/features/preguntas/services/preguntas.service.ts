
import { BaseService } from '@/services/api/base.service';

import type {
    ActualizarPreguntaDto,
    CrearPreguntaDto,
    Pregunta,
} from '../types';

class PreguntasService extends BaseService {
    constructor() {
        super('/preguntas');
    }

    getAll() {
        return this.get<Pregunta[]>('');
    }

    getById(id: number) {
        return this.get<Pregunta>(`/${id}`);
    }

    create(data: CrearPreguntaDto) {
        return this.post<Pregunta, CrearPreguntaDto>('', data);
    }

    update(id: number, data: ActualizarPreguntaDto) {
        return this.put<Pregunta, ActualizarPreguntaDto>(
            `/${id}`,
            data,
        );
    }

    eliminar(id: number) {
        return this.delete<{ mensaje: string }>(`/${id}`);
    }
}

export const preguntasService = new PreguntasService();
