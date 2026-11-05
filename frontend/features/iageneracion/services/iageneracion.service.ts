import { BaseService } from '@/services/api/base.service';

import type {
    ActualizarPropuestaIaDto,
    CreacionGeneracionIa,
    CrearGeneracionIaDto,
    GeneracionIaDetalle,
    ResultadoInsercionPropuestaIa,
    ResultadoPropuestaIa,
} from '../types';

class IaGeneracionService extends BaseService {
    constructor() {
        super('/ia/generaciones');
    }

    /** Crea la solicitud; el backend responde 202 sin esperar al proveedor IA. */
    crear(dto: CrearGeneracionIaDto) {
        return this.post<CreacionGeneracionIa, CrearGeneracionIaDto>('', dto);
    }

    /** Seguimiento de una generación del docente autenticado. */
    obtener(generacionId: number) {
        return this.get<GeneracionIaDetalle>(`/${generacionId}`);
    }

    actualizarPropuesta(
        generacionId: number,
        propuestaId: number,
        dto: ActualizarPropuestaIaDto,
    ) {
        return this.patch<ResultadoPropuestaIa, ActualizarPropuestaIaDto>(
            `/${generacionId}/propuestas/${propuestaId}`,
            dto,
        );
    }

    aceptarPropuesta(generacionId: number, propuestaId: number) {
        return this.post<ResultadoPropuestaIa, Record<string, never>>(
            `/${generacionId}/propuestas/${propuestaId}/aceptar`,
            {},
        );
    }

    descartarPropuesta(generacionId: number, propuestaId: number) {
        return this.post<ResultadoPropuestaIa, Record<string, never>>(
            `/${generacionId}/propuestas/${propuestaId}/descartar`,
            {},
        );
    }

    insertarPropuesta(generacionId: number, propuestaId: number) {
        return this.post<
            ResultadoInsercionPropuestaIa,
            Record<string, never>
        >(
            `/${generacionId}/propuestas/${propuestaId}/insertar`,
            {},
        );
    }
}

export const iageneracionService = new IaGeneracionService();
