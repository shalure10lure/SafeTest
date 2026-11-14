import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReglasCorreccion from './components/ReglasCorreccion';
import type { ReglaCorreccion } from './types';

const mocks = vi.hoisted(() => ({
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
}));

vi.mock('./services/reglas-correccion.service', () => ({
    reglasCorreccionService: {
        listar: mocks.listar,
        crear: mocks.crear,
        actualizar: mocks.actualizar,
    },
}));

function regla(
    sobrescribir: Partial<ReglaCorreccion> = {},
): ReglaCorreccion {
    return {
        regla_id: 1,
        tipo_respuesta: 'opcion_unica',
        parametros: { estrategia: 'automatica' },
        activo: true,
        creado_en: '2026-01-01T00:00:00.000Z',
        actualizado_en: '2026-01-01T00:00:00.000Z',
        ...sobrescribir,
    };
}

function tarjeta(nombre: string) {
    return within(screen.getByRole('article', { name: nombre }));
}

function botonGuardar() {
    return screen.getByRole('button', {
        name: /Guardar reglas|Guardando/,
    }) as HTMLButtonElement;
}

beforeEach(() => {
    mocks.listar.mockReset();
    mocks.crear.mockReset();
    mocks.actualizar.mockReset();

    mocks.listar.mockResolvedValue([]);
    mocks.crear.mockImplementation(
        async (dto: {
            tipo_respuesta: ReglaCorreccion['tipo_respuesta'];
            parametros: ReglaCorreccion['parametros'];
            activo: boolean;
        }) =>
            regla({
                regla_id: 20,
                tipo_respuesta: dto.tipo_respuesta,
                parametros: dto.parametros,
                activo: dto.activo,
            }),
    );
    mocks.actualizar.mockImplementation(
        async (
            id: number,
            dto: {
                parametros: ReglaCorreccion['parametros'];
                activo: boolean;
            },
        ) =>
            regla({
                regla_id: id,
                parametros: dto.parametros,
                activo: dto.activo,
            }),
    );
});

afterEach(() => {
    cleanup();
});

describe('ReglasCorreccion', () => {
    it('muestra el estado de carga y deshabilita el guardado mientras consulta', async () => {
        let resolver!: (valor: ReglaCorreccion[]) => void;
        mocks.listar.mockReturnValueOnce(
            new Promise<ReglaCorreccion[]>((resolve) => {
                resolver = resolve;
            }),
        );

        render(<ReglasCorreccion />);

        expect(
            screen.getByText('Cargando reglas de corrección...'),
        ).toBeTruthy();
        expect(botonGuardar().disabled).toBe(true);

        resolver([]);

        await waitFor(() =>
            expect(
                screen.queryByText('Cargando reglas de corrección...'),
            ).toBeNull(),
        );
    });

    it('muestra el error de carga y permite reintentar', async () => {
        mocks.listar
            .mockRejectedValueOnce(new Error('sin conexión'))
            .mockResolvedValueOnce([]);

        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(screen.getByRole('alert')).toBeTruthy(),
        );

        expect(
            screen.getByText(
                'No se pudieron cargar las reglas de corrección.',
            ),
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'Reintentar' }),
        );

        await waitFor(() =>
            expect(mocks.listar).toHaveBeenCalledTimes(2),
        );
        await waitFor(() =>
            expect(
                screen.getByText('Aún no tienes reglas de corrección'),
            ).toBeTruthy(),
        );
    });

    it('muestra la lista vacía con una tarjeta configurable por tipo', async () => {
        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(
                screen.getByText('Aún no tienes reglas de corrección'),
            ).toBeTruthy(),
        );

        expect(screen.getAllByText('Sin regla configurada')).toHaveLength(5);
        expect(
            screen.getByRole('article', { name: 'Opción única' }),
        ).toBeTruthy();
        expect(
            screen.getByRole('article', { name: 'Desarrollo' }),
        ).toBeTruthy();
    });

    it('crea una regla de opción única sin enviar docente_id', async () => {
        mocks.listar
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                regla({ regla_id: 20, tipo_respuesta: 'opcion_unica' }),
            ]);

        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(
                screen.getByText('Aún no tienes reglas de corrección'),
            ).toBeTruthy(),
        );

        const activa = tarjeta('Opción única').getByLabelText(
            'Regla activa',
        ) as HTMLInputElement;

        fireEvent.click(activa);
        fireEvent.click(activa);

        fireEvent.click(botonGuardar());

        await waitFor(() =>
            expect(mocks.crear).toHaveBeenCalledTimes(1),
        );

        expect(mocks.crear).toHaveBeenCalledWith({
            tipo_respuesta: 'opcion_unica',
            parametros: { estrategia: 'automatica' },
            activo: true,
        });
        expect(mocks.crear.mock.calls[0][0]).not.toHaveProperty(
            'docente_id',
        );

        await waitFor(() =>
            expect(
                screen.getByText('Regla guardada correctamente.'),
            ).toBeTruthy(),
        );
    });

    it('edita una regla existente de opción múltiple', async () => {
        mocks.listar.mockResolvedValue([
            regla({
                regla_id: 7,
                tipo_respuesta: 'opcion_multiple',
                parametros: {
                    estrategia: 'automatica',
                    puntaje_parcial: false,
                    penalizar_incorrectas: false,
                },
            }),
        ]);

        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(
                screen.getByRole('article', { name: 'Opción múltiple' }),
            ).toBeTruthy(),
        );

        const modo = tarjeta('Opción múltiple').getByLabelText(
            'Modo de calificación',
        ) as HTMLSelectElement;

        fireEvent.change(modo, { target: { value: 'penalizada' } });

        fireEvent.click(botonGuardar());

        await waitFor(() =>
            expect(mocks.actualizar).toHaveBeenCalledTimes(1),
        );

        expect(mocks.actualizar).toHaveBeenCalledWith(7, {
            parametros: {
                estrategia: 'automatica',
                puntaje_parcial: false,
                penalizar_incorrectas: true,
            },
            activo: true,
        });
    });

    it('mantiene desarrollo en revisión manual sin opciones de autocorrección', async () => {
        mocks.listar.mockResolvedValue([
            regla({
                regla_id: 9,
                tipo_respuesta: 'desarrollo',
                parametros: { estrategia: 'manual_rubrica' },
            }),
        ]);

        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(
                screen.getByRole('article', { name: 'Desarrollo' }),
            ).toBeTruthy(),
        );

        const desarrollo = tarjeta('Desarrollo');

        expect(
            desarrollo.queryByLabelText('Puntaje parcial'),
        ).toBeNull();
        expect(
            desarrollo.queryByLabelText('Penalizar respuestas incorrectas'),
        ).toBeNull();
        expect(
            desarrollo.getByText('Revisión manual mediante rúbrica'),
        ).toBeTruthy();

        fireEvent.click(desarrollo.getByLabelText('Regla activa'));
        fireEvent.click(botonGuardar());

        await waitFor(() =>
            expect(mocks.actualizar).toHaveBeenCalledWith(9, {
                parametros: { estrategia: 'manual_rubrica' },
                activo: false,
            }),
        );
    });

    it('permite elegir el redondeo numérico entre 0 y 6', async () => {
        mocks.listar.mockResolvedValue([
            regla({
                regla_id: 11,
                tipo_respuesta: 'numerica',
                parametros: {
                    estrategia: 'automatica',
                    redondeo_decimales: 2,
                },
            }),
        ]);

        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(
                screen.getByRole('article', { name: 'Numérica' }),
            ).toBeTruthy(),
        );

        const redondeo = tarjeta('Numérica').getByLabelText(
            'Redondeo de decimales',
        ) as HTMLSelectElement;

        expect(redondeo.options).toHaveLength(7);

        fireEvent.change(redondeo, { target: { value: '5' } });
        fireEvent.click(botonGuardar());

        await waitFor(() =>
            expect(mocks.actualizar).toHaveBeenCalledWith(11, {
                parametros: {
                    estrategia: 'automatica',
                    redondeo_decimales: 5,
                },
                activo: true,
            }),
        );
    });

    it('cancela una edición y recupera la configuración guardada', async () => {
        mocks.listar.mockResolvedValue([
            regla({ regla_id: 3, tipo_respuesta: 'opcion_unica' }),
        ]);

        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(
                screen.getByRole('article', { name: 'Opción única' }),
            ).toBeTruthy(),
        );

        const unica = tarjeta('Opción única');
        const activa = unica.getByLabelText(
            'Regla activa',
        ) as HTMLInputElement;

        fireEvent.click(activa);
        expect(activa.checked).toBe(false);
        expect(botonGuardar().disabled).toBe(false);

        fireEvent.click(
            unica.getByRole('button', { name: 'Cancelar' }),
        );

        await waitFor(() =>
            expect(
                (
                    tarjeta('Opción única').getByLabelText(
                        'Regla activa',
                    ) as HTMLInputElement
                ).checked,
            ).toBe(true),
        );

        expect(botonGuardar().disabled).toBe(true);
        expect(mocks.actualizar).not.toHaveBeenCalled();
    });

    it('deshabilita el botón mientras se guarda', async () => {
        let resolver!: (valor: ReglaCorreccion) => void;
        mocks.crear.mockReturnValueOnce(
            new Promise<ReglaCorreccion>((resolve) => {
                resolver = resolve;
            }),
        );

        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(
                screen.getByText('Aún no tienes reglas de corrección'),
            ).toBeTruthy(),
        );

        const activa = tarjeta('Opción única').getByLabelText(
            'Regla activa',
        ) as HTMLInputElement;

        fireEvent.click(activa);
        fireEvent.click(activa);

        fireEvent.click(botonGuardar());

        const guardando = screen.getByRole('button', {
            name: 'Guardando...',
        }) as HTMLButtonElement;

        expect(guardando.disabled).toBe(true);

        resolver(regla({ regla_id: 20 }));

        await waitFor(() =>
            expect(
                screen.getByText('Regla guardada correctamente.'),
            ).toBeTruthy(),
        );
    });

    it('muestra el mensaje de conflicto 409 del backend', async () => {
        const conflicto = Object.assign(new Error('conflicto'), {
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    message:
                        'Ya existe una regla de corrección para el tipo opcion_unica',
                },
            },
        });

        mocks.crear.mockRejectedValueOnce(conflicto);

        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(
                screen.getByText('Aún no tienes reglas de corrección'),
            ).toBeTruthy(),
        );

        const activa = tarjeta('Opción única').getByLabelText(
            'Regla activa',
        ) as HTMLInputElement;

        fireEvent.click(activa);
        fireEvent.click(activa);

        fireEvent.click(botonGuardar());

        await waitFor(() =>
            expect(
                screen.getAllByText(
                    'Ya existe una regla de corrección para el tipo opcion_unica',
                ).length,
            ).toBeGreaterThan(0),
        );

        expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });

    it('muestra los errores de validación del backend', async () => {
        const invalido = Object.assign(new Error('validación'), {
            isAxiosError: true,
            response: {
                status: 400,
                data: {
                    message: [
                        'El parámetro redondeo_decimales debe ser un entero entre 0 y 6',
                    ],
                },
            },
        });

        mocks.crear.mockRejectedValueOnce(invalido);

        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(
                screen.getByText('Aún no tienes reglas de corrección'),
            ).toBeTruthy(),
        );

        const redondeo = tarjeta('Numérica').getByLabelText(
            'Redondeo de decimales',
        ) as HTMLSelectElement;

        fireEvent.change(redondeo, { target: { value: '3' } });
        fireEvent.click(botonGuardar());

        await waitFor(() =>
            expect(
                screen.getAllByText(
                    'El parámetro redondeo_decimales debe ser un entero entre 0 y 6',
                ).length,
            ).toBeGreaterThan(0),
        );
    });

    it('recarga los cambios persistidos al volver a montar la pantalla', async () => {
        // Simula el backend: listar devuelve lo último guardado.
        const servidor: ReglaCorreccion[] = [
            regla({
                regla_id: 7,
                tipo_respuesta: 'opcion_multiple',
                parametros: {
                    estrategia: 'automatica',
                    puntaje_parcial: false,
                    penalizar_incorrectas: false,
                },
            }),
        ];

        mocks.listar.mockImplementation(async () =>
            servidor.map((fila) => ({ ...fila })),
        );
        mocks.actualizar.mockImplementation(
            async (
                id: number,
                dto: {
                    parametros: ReglaCorreccion['parametros'];
                    activo: boolean;
                },
            ) => {
                const indice = servidor.findIndex(
                    (fila) => fila.regla_id === id,
                );

                servidor[indice] = {
                    ...servidor[indice],
                    ...dto,
                    actualizado_en: '2026-01-02T00:00:00.000Z',
                };

                return { ...servidor[indice] };
            },
        );

        const { unmount } = render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(
                screen.getByRole('article', { name: 'Opción múltiple' }),
            ).toBeTruthy(),
        );

        fireEvent.change(
            tarjeta('Opción múltiple').getByLabelText(
                'Modo de calificación',
            ),
            { target: { value: 'penalizada' } },
        );
        fireEvent.click(
            tarjeta('Opción múltiple').getByLabelText('Regla activa'),
        );
        fireEvent.click(botonGuardar());

        await waitFor(() =>
            expect(mocks.actualizar).toHaveBeenCalledWith(7, {
                parametros: {
                    estrategia: 'automatica',
                    puntaje_parcial: false,
                    penalizar_incorrectas: true,
                },
                activo: false,
            }),
        );

        expect(servidor[0]).toMatchObject({
            regla_id: 7,
            activo: false,
            parametros: { penalizar_incorrectas: true },
        });

        unmount();
        render(<ReglasCorreccion />);

        await waitFor(() =>
            expect(mocks.listar).toHaveBeenCalledTimes(3),
        );

        const modo = tarjeta('Opción múltiple').getByLabelText(
            'Modo de calificación',
        ) as HTMLSelectElement;
        const activa = tarjeta('Opción múltiple').getByLabelText(
            'Regla activa',
        ) as HTMLInputElement;

        expect(modo.value).toBe('penalizada');
        expect(activa.checked).toBe(false);
    });
});
