
import { BaseService } from '@/services/api/base.service';

import type {
    ActualizarPreguntaDto,
    CrearPreguntaDto,
    FiltrosPreguntas,
    Pregunta,
    PreguntaCreada,
    PreguntaDetalle,
} from '../types';

class PreguntasService extends BaseService {
    constructor() {
        super('/preguntas');
    }

    getAll(filtros: FiltrosPreguntas = {}) {
        const params = Object.fromEntries(
            Object.entries(filtros).filter(
                ([, valor]) => valor !== undefined && valor !== '',
            ),
        );

        return this.get<Pregunta[]>(
            '',
            Object.keys(params).length > 0 ? { params } : undefined,
        );
    }

    getById(id: number) {
        return this.get<PreguntaDetalle>(`/${id}`);
    }

    create(data: CrearPreguntaDto) {
        return this.post<PreguntaCreada, CrearPreguntaDto>('', data);
    }

    update(id: number, data: ActualizarPreguntaDto) {
        return this.put<PreguntaDetalle, ActualizarPreguntaDto>(
            `/${id}`,
            data,
        );
    }

    eliminar(id: number) {
        return this.delete<{ mensaje: string }>(`/${id}`);
    }
}

export const preguntasService = new PreguntasService();
