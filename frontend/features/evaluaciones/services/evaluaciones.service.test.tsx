import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
}));

vi.mock('@/lib/axios/client', () => ({
    default: {
        get: mocks.get,
        post: mocks.post,
        patch: mocks.patch,
    },
}));

import { evaluacionesService } from './evaluaciones.service';

describe('evaluacionesService.getAsignadasEstudiante', () => {
    beforeEach(() => {
        mocks.get.mockReset();
        mocks.get.mockResolvedValue({ data: [] });
    });

    it('consulta la ruta correcta sin enviar identidad ni parámetros', async () => {
        await evaluacionesService.getAsignadasEstudiante();

        expect(mocks.get).toHaveBeenCalledTimes(1);
        expect(mocks.get).toHaveBeenCalledWith(
            '/examenes/estudiante/evaluaciones',
            undefined,
        );
    });
});

describe('evaluacionesService.getInstruccionesEstudiante', () => {
    beforeEach(() => {
        mocks.get.mockReset();
        mocks.get.mockResolvedValue({ data: {} });
    });

    describe('evaluacionesService.getPreguntasRendicion', () => {
        beforeEach(() => {
            mocks.get.mockReset();
            mocks.get.mockResolvedValue({
                data: { examen_id: 12, preguntas: [] },
            });
        });

        it('consulta las preguntas de la rendición activa sin enviar identidad', async () => {
            await evaluacionesService.getPreguntasRendicion(12);

            expect(mocks.get).toHaveBeenCalledExactlyOnceWith(
                '/examenes/12/estudiante/rendicion/preguntas',
                undefined,
            );
        });
    });

    describe('evaluacionesService.recursos de la rendición', () => {
        beforeEach(() => {
            mocks.get.mockReset();
            mocks.get.mockResolvedValue({ data: [] });
        });

        it('consulta los recursos de la pregunta con la ruta del estudiante', async () => {
            await evaluacionesService.getRecursosPreguntaRendicion(12, 21);

            expect(mocks.get).toHaveBeenCalledExactlyOnceWith(
                '/examenes/12/estudiante/rendicion/preguntas/21/recursos',
                undefined,
            );
        });

        it('descarga la imagen como Blob y codifica el recurso', async () => {
            await evaluacionesService.getImagenRecursoRendicion(
                12,
                21,
                'a b.png',
            );

            expect(mocks.get).toHaveBeenCalledExactlyOnceWith(
                '/examenes/12/estudiante/rendicion/preguntas/21/recursos/a%20b.png/archivo',
                { responseType: 'blob' },
            );
        });
    });

    describe('evaluacionesService.guardarRespuestaRendicion', () => {
        beforeEach(() => {
            mocks.patch.mockReset();
            mocks.patch.mockResolvedValue({ data: {} });
        });

        it('actualiza la respuesta del inciso con la ruta y el cuerpo contractuales', async () => {
            await evaluacionesService.guardarRespuestaRendicion(12, 21, 'a', {
                opciones: [1, 3],
            });

            expect(mocks.patch).toHaveBeenCalledExactlyOnceWith(
                '/examenes/12/estudiante/rendicion/respuestas/21/a',
                { opciones: [1, 3] },
                undefined,
            );
        });

        it('codifica la letra del inciso en la ruta', async () => {
            await evaluacionesService.guardarRespuestaRendicion(12, 21, 'a/b', {
                respuesta_texto: 'Respuesta',
            });

            expect(mocks.patch).toHaveBeenCalledWith(
                '/examenes/12/estudiante/rendicion/respuestas/21/a%2Fb',
                { respuesta_texto: 'Respuesta' },
                undefined,
            );
        });
    });

    describe('evaluacionesService.iniciarORecuperarRendicion', () => {
        beforeEach(() => {
            mocks.post.mockReset();
            mocks.post.mockResolvedValue({ data: {} });
        });

        it('inicia o recupera la rendición enviando solo el paralelo de contexto', async () => {
            await evaluacionesService.iniciarORecuperarRendicion(12, 7);

            expect(mocks.post).toHaveBeenCalledTimes(1);
            expect(mocks.post).toHaveBeenCalledWith(
                '/examenes/12/estudiante/rendicion',
                { paralelo_id: 7 },
                undefined,
            );
        });
    });

    it('consulta las instrucciones por ID sin enviar parámetros ni identidad', async () => {
        await evaluacionesService.getInstruccionesEstudiante(12);

        expect(mocks.get).toHaveBeenCalledTimes(1);
        expect(mocks.get).toHaveBeenCalledWith(
            '/examenes/12/estudiante/instrucciones',
            undefined,
        );
    });
});

describe('evaluacionesService.finalizarRendicion', () => {
    beforeEach(() => {
        mocks.post.mockReset();
        mocks.post.mockResolvedValue({ data: {} });
    });

    it('finaliza la rendición en la ruta del estudiante con cuerpo vacío', async () => {
        await evaluacionesService.finalizarRendicion(12);

        expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
            '/examenes/12/estudiante/rendicion/finalizar',
            {},
            undefined,
        );
    });
});
