import { BaseService } from '@/services/api/base.service';
import type { RecursoPregunta } from '@/features/preguntas/types';

import type {
    AsignacionDisponible,
    AsignacionGuardada,
    BancoEvaluacion,
    CreateEvaluacionDto,
    Evaluacion,
    EvaluacionAsignada,
    EvaluacionActualizada,
    EvaluacionCreada,
    EvaluacionDetalle,
    EvaluacionPublicada,
    GuardarAsignacionDto,
    GuardarConfiguracionDto,
    GuardarSeleccionDto,
    InstruccionesEvaluacionEstudiante,
    PublicacionRespuestas,
    PreguntasRendicionEstudiante,
    RendicionEstudiante,
    RendicionFinalizadaEstudiante,
    RespuestaGuardadaEstudiante,
    RespuestaRendicion,
    ResumenEvaluacion,
    SeleccionGuardada,
    UpdateEvaluacionDto,
} from '../types';

class EvaluacionesService extends BaseService {
    constructor() {
        super('/examenes');
    }

    getAll() {
        return this.get<Evaluacion[]>('');
    }

    getAsignadasEstudiante() {
        return this.get<EvaluacionAsignada[]>('/estudiante/evaluaciones');
    }

    getInstruccionesEstudiante(id: number) {
        return this.get<InstruccionesEvaluacionEstudiante>(
            `/${id}/estudiante/instrucciones`,
        );
    }

    iniciarORecuperarRendicion(id: number, paraleloId: number) {
        return this.post<RendicionEstudiante, { paralelo_id: number }>(
            `/${id}/estudiante/rendicion`,
            { paralelo_id: paraleloId },
        );
    }

    getPreguntasRendicion(id: number) {
        return this.get<PreguntasRendicionEstudiante>(
            `/${id}/estudiante/rendicion/preguntas`,
        );
    }

    /** Fórmulas, tablas e imágenes de una pregunta de la rendición en curso. */
    getRecursosPreguntaRendicion(id: number, preguntaId: number) {
        return this.get<RecursoPregunta[]>(
            `/${id}/estudiante/rendicion/preguntas/${preguntaId}/recursos`,
        );
    }

    /** Descarga la imagen como Blob: el endpoint exige el token de sesión. */
    getImagenRecursoRendicion(id: number, preguntaId: number, recurso: string) {
        return this.get<Blob>(
            `/${id}/estudiante/rendicion/preguntas/${preguntaId}/recursos/${encodeURIComponent(recurso)}/archivo`,
            { responseType: 'blob' },
        );
    }

    guardarRespuestaRendicion(
        id: number,
        preguntaId: number,
        letra: string,
        respuesta: RespuestaRendicion,
    ) {
        return this.patch<RespuestaGuardadaEstudiante, RespuestaRendicion>(
            `/${id}/estudiante/rendicion/respuestas/${preguntaId}/${encodeURIComponent(letra)}`,
            respuesta,
        );
    }

    /** Finaliza el intento en curso; el backend conserva las respuestas. */
    finalizarRendicion(id: number) {
        return this.post<RendicionFinalizadaEstudiante, Record<string, never>>(
            `/${id}/estudiante/rendicion/finalizar`,
            {},
        );
    }

    getById(id: number) {
        return this.get<EvaluacionDetalle>(`/${id}`);
    }

    create(data: CreateEvaluacionDto) {
        return this.post<EvaluacionCreada, CreateEvaluacionDto>('', data);
    }

    update(id: number, data: UpdateEvaluacionDto) {
        return this.patch<EvaluacionActualizada, UpdateEvaluacionDto>(
            `/${id}`,
            data,
        );
    }

    /** Banco de preguntas del docente; por defecto, el de la materia de la evaluación. */
    getBanco(id: number, materiaId?: number | null) {
        return this.get<BancoEvaluacion>(
            `/${id}/banco`,
            materiaId ? { params: { materia_id: materiaId } } : undefined,
        );
    }

    guardarSeleccion(id: number, data: GuardarSeleccionDto) {
        return this.put<SeleccionGuardada, GuardarSeleccionDto>(
            `/${id}/preguntas`,
            data,
        );
    }

    guardarConfiguracion(id: number, data: GuardarConfiguracionDto) {
        return this.put<EvaluacionDetalle, GuardarConfiguracionDto>(
            `/${id}/configuracion`,
            data,
        );
    }

    /** Paralelos (con sus estudiantes) que se pueden asignar a la evaluación. */
    getAsignacion(id: number) {
        return this.get<AsignacionDisponible>(`/${id}/asignacion`);
    }

    guardarAsignacion(id: number, data: GuardarAsignacionDto) {
        return this.put<AsignacionGuardada, GuardarAsignacionDto>(
            `/${id}/asignacion`,
            data,
        );
    }

    /** Datos completos para revisar antes de publicar (paso 5). */
    getResumen(id: number) {
        return this.get<ResumenEvaluacion>(`/${id}/resumen`);
    }

    publicar(id: number) {
        return this.post<EvaluacionPublicada, Record<string, never>>(
            `/${id}/publicar`,
            {},
        );
    }

    /** Publica las respuestas correctas de una evaluación ya publicada. */
    publicarRespuestas(id: number) {
        return this.post<PublicacionRespuestas, Record<string, never>>(
            `/${id}/respuestas/publicar`,
            {},
        );
    }
}

export const evaluacionesService = new EvaluacionesService();
