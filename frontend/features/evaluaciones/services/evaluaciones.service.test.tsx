import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
}));

vi.mock('@/lib/axios/client', () => ({
    default: {
        get: mocks.get,
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

    it('consulta las instrucciones por ID sin enviar parámetros ni identidad', async () => {
        await evaluacionesService.getInstruccionesEstudiante(12);

        expect(mocks.get).toHaveBeenCalledTimes(1);
        expect(mocks.get).toHaveBeenCalledWith(
            '/examenes/12/estudiante/instrucciones',
            undefined,
        );
    });
});
