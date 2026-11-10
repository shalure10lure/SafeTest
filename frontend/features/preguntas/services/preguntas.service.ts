import { BaseService } from '@/services/api/base.service';

import type {
    ActualizarPreguntaDto,
    CrearPreguntaDto,
    CrearRecursoEscritoDto,
    FiltrosPreguntas,
    Pregunta,
    PreguntaCreada,
    PreguntaDetalle,
    RecursoPregunta,
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

    // ---------- HU-12: contenido especializado ----------

    getRecursos(id: number) {
        return this.get<RecursoPregunta[]>(`/${id}/recursos`);
    }

    agregarImagen(id: number, archivo: File) {
        const formulario = new FormData();

        formulario.append('archivo', archivo);

        return this.post<RecursoPregunta, FormData>(
            `/${id}/recursos/imagen`,
            formulario,
            {
                // Axios debe dejar que el navegador agregue el boundary.
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30_000,
            },
        );
    }

    agregarContenido(id: number, dto: CrearRecursoEscritoDto) {
        return this.post<RecursoPregunta, CrearRecursoEscritoDto>(
            `/${id}/recursos`,
            dto,
        );
    }

    /** Cambia el contenido de una fórmula o tabla guardada. */
    actualizarContenido(
        id: number,
        recurso: string,
        dto: CrearRecursoEscritoDto,
    ) {
        return this.put<RecursoPregunta, CrearRecursoEscritoDto>(
            `/${id}/recursos/${encodeURIComponent(recurso)}`,
            dto,
        );
    }

    /** Sustituye la imagen de un recurso; el servidor devuelve el recurso nuevo. */
    reemplazarImagen(id: number, recurso: string, archivo: File) {
        const formulario = new FormData();

        formulario.append('archivo', archivo);

        return this.put<RecursoPregunta, FormData>(
            `/${id}/recursos/${encodeURIComponent(recurso)}/imagen`,
            formulario,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30_000,
            },
        );
    }

    eliminarRecurso(id: number, recurso: string) {
        return this.delete<void>(
            `/${id}/recursos/${encodeURIComponent(recurso)}`,
        );
    }

    /**
     * Descarga una imagen como Blob. No se usa un <img src> directo porque el
     * endpoint exige el token de sesión, que el navegador no envía solo.
     */
    getImagen(id: number, recurso: string) {
        return this.get<Blob>(
            `/${id}/recursos/${encodeURIComponent(recurso)}/archivo`,
            { responseType: 'blob' },
        );
    }
}

export const preguntasService = new PreguntasService();
