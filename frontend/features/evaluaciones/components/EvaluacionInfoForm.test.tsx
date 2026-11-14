import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import EvaluacionInfoForm from './EvaluacionInfoForm';
import type { EvaluacionDetalle } from '../types';

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
}));

const datos = vi.hoisted(() => {
    const evaluacion = {
        examen_id: 5,
        titulo: 'Parcial 1',
        instrucciones: null,
        estado: 'borrador',
        fecha: null,
        modo_seleccion: 'manual',
        orden_preguntas: 'definido',
        duracion_min: 60,
        /** Puntaje total definido por el docente en el paso 3. */
        puntaje_total: null,
        disponible_desde: null,
        disponible_hasta: null,
        modo_entrega_nota: 'al_publicar',
        modo_asignacion: 'estudiantes',
        materia: { materia_id: 1, nombre: 'Materia A' },
        semestre: { semestre_id: 2, gestion: '2026' },
        paralelos: [{ paralelo_id: 10, nombre_paralelo: 'A' }],
        total_preguntas: 4,
        total_inscritos: 12,
        resultados_publicados_en: null,
        pregunta_ids: [],
        preguntas: [],
        criterios: [],
    } satisfies EvaluacionDetalle;

    const periodos = [
        {
            semestre_id: 2,
            gestion: '2026',
            nro_pruebas: 3,
            fecha_inicio: null,
            fecha_fin: null,
            activo: true,
            materias: [
                {
                    materia_id: 1,
                    nombre: 'Materia A',
                    codigo: 'MA',
                    descripcion: null,
                    activo: true,
                },
                {
                    materia_id: 3,
                    nombre: 'Materia C',
                    codigo: 'MC',
                    descripcion: null,
                    activo: true,
                },
            ],
        },
        {
            semestre_id: 4,
            gestion: '2027',
            nro_pruebas: 3,
            fecha_inicio: null,
            fecha_fin: null,
            activo: false,
            materias: [
                {
                    materia_id: 1,
                    nombre: 'Materia A',
                    codigo: 'MA',
                    descripcion: null,
                    activo: true,
                },
            ],
        },
    ];

    const paralelos = [
        {
            paralelo_id: 10,
            nombre_paralelo: 'A',
            materia_id: 1,
            semestre_id: 2,
            docente_id: 7,
        },
        {
            paralelo_id: 11,
            nombre_paralelo: 'B',
            materia_id: 1,
            semestre_id: 2,
            docente_id: 7,
        },
        {
            paralelo_id: 12,
            nombre_paralelo: 'C',
            materia_id: 3,
            semestre_id: 2,
            docente_id: 7,
        },
        {
            paralelo_id: 20,
            nombre_paralelo: 'D',
            materia_id: 1,
            semestre_id: 4,
            docente_id: 7,
        },
    ];

    return { evaluacion, periodos, paralelos };
});

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mocks.push,
        replace: vi.fn(),
        refresh: vi.fn(),
    }),
}));

vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/features/periodos/hooks/usePeriodos', () => ({
    usePeriodos: () => ({
        periodos: datos.periodos,
        isLoading: false,
        error: null,
    }),
}));

vi.mock('@/features/paralelos/hooks/useParalelos', () => ({
    useParalelos: () => ({
        paralelos: datos.paralelos,
        cargando: false,
        error: '',
        cargarParalelos: vi.fn(),
        crearParalelo: vi.fn(),
        actualizarParalelo: vi.fn(),
    }),
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        update: mocks.update,
        create: mocks.create,
    },
}));

function renderizarFormulario() {
    render(
        <EvaluacionInfoForm
            evaluacion={datos.evaluacion as EvaluacionDetalle}
        />,
    );
}

function elegir(etiqueta: string | RegExp, valor: string) {
    fireEvent.change(screen.getByLabelText(etiqueta), {
        target: { value: valor },
    });
}

function enviarFormulario() {
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
}

function dialogo() {
    return screen.queryByRole('dialog');
}

function valorDe(etiqueta: string | RegExp): string {
    return (screen.getByLabelText(etiqueta) as HTMLInputElement).value;
}

beforeEach(() => {
    mocks.push.mockReset();
    mocks.update.mockReset();
    mocks.create.mockReset();
    mocks.update.mockResolvedValue({
        ...datos.evaluacion,
        modo_asignacion: 'paralelos',
        paralelos: [{ paralelo_id: 10, nombre_paralelo: 'A' }],
        criterios_reiniciados: false,
    });
});

afterEach(() => {
    cleanup();
});

describe('EvaluacionInfoForm — advertencia de reinicio de asignaciones', () => {
    it('advierte al cambiar la materia', () => {
        renderizarFormulario();

        elegir('Materia', '3');
        elegir('Paralelo o contexto', '12');
        enviarFormulario();

        expect(dialogo()).not.toBeNull();
        expect(
            screen.getByText(/se reiniciará la asignación actual/i),
        ).toBeTruthy();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('advierte al cambiar el semestre', () => {
        renderizarFormulario();

        elegir('Periodo académico', '4');
        elegir('Materia', '1');
        elegir('Paralelo o contexto', '20');
        enviarFormulario();

        expect(dialogo()).not.toBeNull();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('advierte al elegir un paralelo no asociado', () => {
        renderizarFormulario();

        elegir('Paralelo o contexto', '11');
        enviarFormulario();

        expect(dialogo()).not.toBeNull();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('no advierte si se vuelve a seleccionar el mismo paralelo', () => {
        renderizarFormulario();

        elegir('Paralelo o contexto', '11');
        elegir('Paralelo o contexto', '10');
        enviarFormulario();

        expect(dialogo()).toBeNull();
        expect(mocks.update).toHaveBeenCalledTimes(1);
    });

    it('no advierte al cambiar solo el título', () => {
        renderizarFormulario();

        elegir('Nombre de la evaluación', 'Parcial actualizado');
        enviarFormulario();

        expect(dialogo()).toBeNull();
        expect(mocks.update).toHaveBeenCalledTimes(1);
    });

    it('no advierte al cambiar solo las instrucciones', () => {
        renderizarFormulario();

        elegir(/Instrucciones/, 'Lee con atención.');
        enviarFormulario();

        expect(dialogo()).toBeNull();
        expect(mocks.update).toHaveBeenCalledTimes(1);
    });

    it('muestra una sola advertencia si cambian varios campos', () => {
        renderizarFormulario();

        elegir('Materia', '3');
        elegir('Paralelo o contexto', '12');
        elegir('Nombre de la evaluación', 'Otro título');
        elegir(/Instrucciones/, 'Otras instrucciones');
        enviarFormulario();

        expect(screen.getAllByRole('dialog')).toHaveLength(1);
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it('cancelar cierra el diálogo, no actualiza y conserva los datos', async () => {
        renderizarFormulario();

        elegir('Materia', '3');
        elegir('Paralelo o contexto', '12');
        enviarFormulario();

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        await waitFor(() => expect(dialogo()).toBeNull());
        expect(mocks.update).not.toHaveBeenCalled();
        expect(valorDe('Materia')).toBe('3');
        expect(valorDe('Paralelo o contexto')).toBe('12');
    });

    it('confirmar envía la actualización una sola vez', async () => {
        renderizarFormulario();

        elegir('Materia', '3');
        elegir('Paralelo o contexto', '12');
        enviarFormulario();

        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar cambios' }),
        );

        await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
        expect(dialogo()).toBeNull();
    });

    it('un doble clic en confirmar no duplica la solicitud', async () => {
        renderizarFormulario();

        elegir('Paralelo o contexto', '11');
        enviarFormulario();

        const confirmar = screen.getByRole('button', {
            name: 'Confirmar cambios',
        });
        fireEvent.click(confirmar);
        fireEvent.click(confirmar);

        await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));
        expect(mocks.update).toHaveBeenCalledTimes(1);
    });

    it('muestra el estado de carga y deshabilita las acciones mientras guarda', async () => {
        let resolver!: (valor: unknown) => void;
        mocks.update.mockReturnValueOnce(
            new Promise((resolve) => {
                resolver = resolve;
            }),
        );

        renderizarFormulario();

        elegir('Paralelo o contexto', '11');
        enviarFormulario();
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar cambios' }),
        );

        const dialogoAbierto = screen.getByRole('dialog');
        const guardar = within(dialogoAbierto).getByRole('button', {
            name: 'Guardando...',
        });
        expect(guardar).toBeTruthy();
        expect(guardar).toHaveProperty('disabled', true);
        expect(within(dialogoAbierto).getByRole('button', { name: 'Cancelar' }))
            .toHaveProperty('disabled', true);

        resolver({
            ...datos.evaluacion,
            modo_asignacion: 'paralelos',
            paralelos: [{ paralelo_id: 11, nombre_paralelo: 'B' }],
        });

        await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));
    });

    it('mantiene el foco dentro del diálogo accesible', () => {
        renderizarFormulario();

        elegir('Paralelo o contexto', '11');
        enviarFormulario();

        const dialogoAbierto = screen.getByRole('dialog');
        const cancelar = within(dialogoAbierto).getByRole('button', {
            name: 'Cancelar',
        });
        const confirmar = within(dialogoAbierto).getByRole('button', {
            name: 'Confirmar cambios',
        });

        expect(document.activeElement).toBe(cancelar);

        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(confirmar);

        fireEvent.keyDown(document, { key: 'Tab' });
        expect(document.activeElement).toBe(cancelar);
    });

    it('si el backend falla, conserva los datos y muestra el error', async () => {
        mocks.update.mockRejectedValueOnce(new Error('fallo de red'));

        renderizarFormulario();

        elegir('Paralelo o contexto', '11');
        elegir('Nombre de la evaluación', 'Título conservado');
        enviarFormulario();

        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar cambios' }),
        );

        await waitFor(() =>
            expect(screen.getByRole('alert').textContent).toContain(
                'No se pudo guardar la evaluación. Inténtalo de nuevo.',
            ),
        );

        expect(dialogo()).toBeNull();
        expect(valorDe('Paralelo o contexto')).toBe('11');
        expect(valorDe('Nombre de la evaluación')).toBe('Título conservado');
        expect(
            (
                screen.getByRole('button', {
                    name: /Siguiente/,
                }) as HTMLInputElement
            ).disabled,
        ).toBe(false);
        expect(mocks.push).not.toHaveBeenCalled();
    });

    it('tras una actualización exitosa refleja la asignación reiniciada', async () => {
        renderizarFormulario();

        elegir('Materia', '3');
        elegir('Paralelo o contexto', '12');
        enviarFormulario();

        fireEvent.click(
            screen.getByRole('button', { name: 'Confirmar cambios' }),
        );

        await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));

        // El backend responde con modo `paralelos` limitado al paralelo
        // principal; el formulario continúa al paso donde se revisa.
        expect(mocks.update).toHaveBeenCalledWith(5, {
            titulo: 'Parcial 1',
            materia_id: 3,
            semestre_id: 2,
            paralelo_id: 12,
            instrucciones: '',
        });
        expect(mocks.push).toHaveBeenCalledWith(
            '/docente/evaluaciones/5/preguntas',
        );
    });
});
