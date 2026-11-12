import { BaseService } from '@/services/api/base.service';

import type {
    ActualizarReglaCorreccionDto,
    CrearReglaCorreccionDto,
    ReglaCorreccion,
} from '../types';

class ReglasCorreccionService extends BaseService {
    constructor() {
        super('/reglas-correccion');
    }

    listar() {
        return this.get<ReglaCorreccion[]>('');
    }

    crear(dto: CrearReglaCorreccionDto) {
        return this.post<ReglaCorreccion, CrearReglaCorreccionDto>('', dto);
    }

    actualizar(id: number, dto: ActualizarReglaCorreccionDto) {
        return this.patch<ReglaCorreccion, ActualizarReglaCorreccionDto>(
            `/${id}`,
            dto,
        );
    }
}

export const reglasCorreccionService = new ReglasCorreccionService();
