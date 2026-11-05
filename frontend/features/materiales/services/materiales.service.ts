import { BaseService } from '@/services/api/base.service';

import type {
    CrearMaterialDto,
    EstadoExtraccionDetalle,
    FiltrosMateriales,
    Material,
} from '../types';

class MaterialesService extends BaseService {
    constructor() {
        super('/materiales');
    }

    getAll(filtros: FiltrosMateriales = {}) {
        const params = Object.fromEntries(
            Object.entries(filtros).filter(
                ([, valor]) => valor !== undefined,
            ),
        );

        return this.get<Material[]>(
            '',
            Object.keys(params).length > 0 ? { params } : undefined,
        );
    }

    getById(id: number) {
        return this.get<Material>(`/${id}`);
    }

    getExtraccion(id: number) {
        return this.get<EstadoExtraccionDetalle>(`/${id}/extraccion`);
    }

    crear(dto: CrearMaterialDto) {
        const formulario = new FormData();

        formulario.append('archivo', dto.archivo);
        formulario.append('titulo', dto.titulo);
        formulario.append('materia_id', String(dto.materia_id));

        if (dto.tema_id !== undefined) {
            formulario.append('tema_id', String(dto.tema_id));
        }

        return this.post<Material, FormData>('', formulario, {
            // Axios debe dejar que el navegador agregue el boundary.
            headers: { 'Content-Type': 'multipart/form-data' },
            // La extracción de texto del backend puede tardar más que una
            // consulta normal, sobre todo con PDF extensos.
            timeout: 60_000,
        });
    }

    autorizar(id: number, autorizado: boolean) {
        return this.put<Material, { autorizado: boolean }>(
            `/${id}/autorizacion`,
            { autorizado },
        );
    }

    eliminar(id: number) {
        return this.delete<void>(`/${id}`);
    }
}

export const materialesService = new MaterialesService();
