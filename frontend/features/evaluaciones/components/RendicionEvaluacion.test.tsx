import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RendicionEvaluacion from './RendicionEvaluacion';
import { usePreguntasRendicion } from '../hooks/usePreguntasRendicion';
import type {
    ModeloPermitidoRendicion,
    PreguntaRendicionEstudiante,
    ProcedimientoRendicion,
} from '../types';

const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    finalizarRendicion: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('../services/evaluaciones.service', () => ({
    evaluacionesService: {
        finalizarRendicion: mocks.finalizarRendicion,
    },
}));

vi.mock('../hooks/usePreguntasRendicion', () => ({
    claveIncisoRendicion: (preguntaId: number, letra: string) =>
        `${preguntaId}:${letra}`,
    usePreguntasRendicion: vi.fn(),
}));

vi.mock('../hooks/useRecursosRendicion', () => ({
    useRecursosRendicion: () => ({
        recursos: [],
        cargando: false,
        error: false,
        cargarImagen: vi.fn(),
    }),
}));

const preguntas: PreguntaRendicionEstudiante[] = [
    {
        pregunta_id: 21,
        orden: 1,
        enunciado: 'Enunciado de la primera pregunta',
        tipo_respuesta: 'opcion_unica',
        estado_respuesta: 'pendiente',
        incisos: [
            {
                letra: 'a',
                enunciado_inciso: 'Texto del inciso',
                tipo_respuesta: 'opcion_unica',
                opciones: [
                    { nro_opcion: 1, texto_opcion: 'Alternativa uno' },
                    { nro_opcion: 2, texto_opcion: 'Alternativa dos' },
                ],
            },
        ],
    },
    {
        pregunta_id: 22,
        orden: 2,
        enunciado: 'Enunciado de la segunda pregunta',
        tipo_respuesta: 'desarrollo',
        estado_respuesta: 'respondida',
        incisos: [],
    },
];

const modelosPermitidos: ModeloPermitidoRendicion[] = [
    {
        modelo_id: 3,
        nombre: 'Modelo lineal',
        descripcion: 'Descripción del modelo lineal.',
        variables: { x: { tipo: 'numero' }, y: { tipo: 'numero' } },
        formulas_permitidas: [
            { formula_id: 101, expresion: 'x + y' },
            { formula_id: 102, expresion: 'x - y' },
        ],
    },
    {
        modelo_id: 4,
        nombre: 'Modelo cuadrático',
        descripcion: 'Descripción del modelo cuadrático.',
        variables: { x: { tipo: 'numero' } },
        formulas_permitidas: [{ formula_id: 201, expresion: 'x^2' }],
    },
];

function preguntaConModelos(
    modelos: ModeloPermitidoRendicion[] = modelosPermitidos,
): PreguntaRendicionEstudiante {
    return {
        ...preguntas[0],
        incisos: [
            {
                ...preguntas[0].incisos[0],
                modelos_permitidos: modelos,
            },
        ],
    };
}

function procedimientoGuardado(): ProcedimientoRendicion {
    return {
        modelo_id: 3,
        valores: { x: 2, y: 3 },
        resultado_final: '5',
        formula_ids: [101, 102],
    };
}

const mockUsePreguntasRendicion = vi.mocked(usePreguntasRendicion);

/** Estado del hook con valores seguros por defecto; cada prueba ajusta lo suyo. */
function crearEstado(
    cambios: Partial<ReturnType<typeof usePreguntasRendicion>> = {},
): ReturnType<typeof usePreguntasRendicion> {
    return {
        preguntas,
        cargando: false,
        error: '',
        recargar: vi.fn(),
        respuestasLocales: {},
        procedimientosLocales: {},
        incisosGuardando: [],
        erroresGuardado: {},
        guardarRespuesta: vi.fn().mockResolvedValue(null),
        guardarProcedimiento: vi.fn().mockResolvedValue(null),
        esperarGuardadosPendientes: vi.fn().mockResolvedValue({ fallidos: [] }),
        ...cambios,
    };
}

beforeEach(() => {
    mocks.replace.mockReset();
    mocks.finalizarRendicion.mockReset();
    mocks.finalizarRendicion.mockResolvedValue({
        examen_id: 12,
        estado: 'enviada',
        fecha_envio: '2026-11-08T15:00:00.000Z',
    });

    mockUsePreguntasRendicion.mockReturnValue(crearEstado());
});

afterEach(() => cleanup());

describe('RendicionEvaluacion', () => {
    it('presenta la pregunta activa, progreso y estado de navegación', () => {
        render(<RendicionEvaluacion examenId={12} />);

        expect(
            screen.getByRole('heading', {
                name: 'Enunciado de la primera pregunta',
            }),
        ).toBeTruthy();
        expect(screen.getByText('Alternativa uno')).toBeTruthy();
        expect(screen.getByText('Respondidas')).toBeTruthy();
        expect(screen.getByText('Pendientes')).toBeTruthy();
        expect(
            screen
                .getByRole('progressbar', {
                    name: 'Progreso de preguntas respondidas',
                })
                .getAttribute('aria-valuenow'),
        ).toBe('50');
        expect(
            screen
                .getByRole('button', {
                    name: 'Pregunta 1, pendiente, actual',
                })
                .getAttribute('aria-current'),
        ).toBe('step');
    });

    it('navega entre preguntas mediante botones y navegador', () => {
        render(<RendicionEvaluacion examenId={12} />);

        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
        expect(
            screen.getByRole('heading', {
                name: 'Enunciado de la segunda pregunta',
            }),
        ).toBeTruthy();
        expect(
            screen
                .getByRole('button', { name: 'Siguiente' })
                .hasAttribute('disabled'),
        ).toBe(true);

        fireEvent.click(
            screen.getByRole('button', { name: 'Pregunta 1, pendiente' }),
        );
        expect(
            screen.getByRole('heading', {
                name: 'Enunciado de la primera pregunta',
            }),
        ).toBeTruthy();
    });

    it('guarda una selección exclusiva y muestra el estado de guardado', () => {
        const guardarRespuesta = vi.fn().mockResolvedValue(null);
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ guardarRespuesta }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(screen.getByRole('radio', { name: 'Alternativa uno' }));

        expect(guardarRespuesta).toHaveBeenCalledWith(21, 'a', {
            opciones: [1],
        });
        expect(
            (
                screen.getByRole('radio', {
                    name: 'Alternativa uno',
                }) as HTMLInputElement
            ).checked,
        ).toBe(true);
    });

    it('muestra los modelos permitidos para el inciso', () => {
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ preguntas: [preguntaConModelos()] }),
        );

        render(<RendicionEvaluacion examenId={12} />);

        const selector = screen.getByRole('combobox', {
            name: 'Modelo del inciso a',
        });
        expect(selector.textContent).toContain('Modelo lineal');
        expect(selector.textContent).toContain('Modelo cuadrático');
    });

    it('selecciona un modelo y presenta su descripción', () => {
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ preguntas: [preguntaConModelos()] }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );

        expect(screen.getByText('Descripción del modelo lineal.')).toBeTruthy();
        expect(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        ).toBeTruthy();
    });

    it('muestra únicamente las fórmulas permitidas del modelo seleccionado', () => {
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ preguntas: [preguntaConModelos()] }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '4' } },
        );

        expect(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 201',
            }),
        ).toBeTruthy();
        expect(
            screen.queryByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        ).toBeNull();
        expect(
            screen.getByText('Descripción del modelo cuadrático.'),
        ).toBeTruthy();
    });

    it('permite seleccionar varias fórmulas permitidas', () => {
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ preguntas: [preguntaConModelos()] }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        const primera = screen.getByRole('checkbox', {
            name: 'Seleccionar fórmula 101',
        }) as HTMLInputElement;
        const segunda = screen.getByRole('checkbox', {
            name: 'Seleccionar fórmula 102',
        }) as HTMLInputElement;

        fireEvent.click(primera);
        fireEvent.click(segunda);

        expect(primera.checked).toBe(true);
        expect(segunda.checked).toBe(true);
    });

    it('genera campos según el modelo y al cambiar guarda solo fórmulas y valores nuevos', () => {
        const guardarProcedimiento = vi.fn().mockResolvedValue({});
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        const selector = screen.getByRole('combobox', {
            name: 'Modelo del inciso a',
        });
        fireEvent.change(selector, { target: { value: '3' } });
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: '2' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de Y (inciso a)' }),
            { target: { value: '3' } },
        );

        fireEvent.change(selector, { target: { value: '4' } });
        expect(
            screen.queryByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        ).toBeNull();
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 201',
            }),
        );
        expect(
            screen.queryByRole('spinbutton', {
                name: 'Valor de Y (inciso a)',
            }),
        ).toBeNull();
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: '8' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar procedimiento' }),
        );

        expect(guardarProcedimiento).toHaveBeenCalledExactlyOnceWith(21, 'a', {
            modelo_id: 4,
            formula_ids: [201],
            valores: { x: 8 },
        });
    });

    it('conserva los borradores independientes al cambiar de modelo A → B → A', () => {
        const guardarProcedimiento = vi.fn().mockResolvedValue({});
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        const selector = screen.getByRole('combobox', {
            name: 'Modelo del inciso a',
        });
        fireEvent.change(selector, { target: { value: '3' } });
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: '12' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de Y (inciso a)' }),
            { target: { value: '24' } },
        );
        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Resultado final del inciso a',
            }),
            { target: { value: '36' } },
        );

        fireEvent.change(selector, { target: { value: '4' } });
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 201',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: '7' } },
        );

        fireEvent.change(selector, { target: { value: '3' } });
        expect(
            (
                screen.getByRole('spinbutton', {
                    name: 'Valor de X (inciso a)',
                }) as HTMLInputElement
            ).value,
        ).toBe('12');
        expect(
            (
                screen.getByRole('spinbutton', {
                    name: 'Valor de Y (inciso a)',
                }) as HTMLInputElement
            ).value,
        ).toBe('24');
        expect(
            (
                screen.getByRole('textbox', {
                    name: 'Resultado final del inciso a',
                }) as HTMLInputElement
            ).value,
        ).toBe('36');
        expect(
            (
                screen.getByRole('checkbox', {
                    name: 'Seleccionar fórmula 101',
                }) as HTMLInputElement
            ).checked,
        ).toBe(true);

        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar procedimiento' }),
        );
        expect(guardarProcedimiento).toHaveBeenCalledExactlyOnceWith(21, 'a', {
            modelo_id: 3,
            formula_ids: [101],
            valores: { x: 12, y: 24 },
            resultado_final: '36',
        });
    });

    it('presenta un campo numérico por variable con etiqueta legible', () => {
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ preguntas: [preguntaConModelos()] }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        const valorX = screen.getByRole('spinbutton', {
            name: 'Valor de X (inciso a)',
        }) as HTMLInputElement;
        const valorY = screen.getByRole('spinbutton', {
            name: 'Valor de Y (inciso a)',
        }) as HTMLInputElement;
        fireEvent.change(valorX, { target: { value: '2' } });
        fireEvent.change(valorY, { target: { value: '3' } });
        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Resultado final del inciso a',
            }),
            { target: { value: '5' } },
        );

        expect(valorX.type).toBe('number');
        expect(valorX.value).toBe('2');
        expect(valorY.value).toBe('3');
        expect(
            (
                screen.getByRole('textbox', {
                    name: 'Resultado final del inciso a',
                }) as HTMLInputElement
            ).value,
        ).toBe('5');
    });

    it('humaniza claves compuestas y conserva sus claves exactas al guardar', () => {
        const guardarProcedimiento = vi.fn().mockResolvedValue({});
        const modelosConNombres: ModeloPermitidoRendicion[] = [
            {
                ...modelosPermitidos[0],
                variables: {
                    masa: { descripcion: 'No se asume metadata visual' },
                    masa_molar: { unidad: 'g/mol' },
                },
            },
        ];
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos(modelosConNombres)],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        expect(
            screen.getByRole('spinbutton', {
                name: 'Valor de Masa molar (inciso a)',
            }),
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', {
                name: 'Valor de Masa (inciso a)',
            }),
            { target: { value: '36' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', {
                name: 'Valor de Masa molar (inciso a)',
            }),
            { target: { value: '18' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar procedimiento' }),
        );

        expect(guardarProcedimiento).toHaveBeenCalledWith(21, 'a', {
            modelo_id: 3,
            formula_ids: [101],
            valores: { masa: 36, masa_molar: 18 },
        });
    });

    it('rechaza valores numéricos vacíos o inválidos con ayuda en español', () => {
        const guardarProcedimiento = vi.fn().mockResolvedValue({});
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: 'no-numérico' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de Y (inciso a)' }),
            { target: { value: '3' } },
        );

        expect(
            screen.getByText(/introduce un valor numérico válido para x/i),
        ).toBeTruthy();
        expect(
            (
                screen.getByRole('button', {
                    name: 'Guardar procedimiento',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(guardarProcedimiento).not.toHaveBeenCalled();
    });

    it('guarda el procedimiento con el payload esperado después de completarlo', () => {
        const guardarProcedimiento = vi.fn().mockResolvedValue({});
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 102',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: '2' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de Y (inciso a)' }),
            { target: { value: '3' } },
        );
        fireEvent.change(
            screen.getByRole('textbox', {
                name: 'Resultado final del inciso a',
            }),
            { target: { value: '5' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar procedimiento' }),
        );

        expect(guardarProcedimiento).toHaveBeenCalledExactlyOnceWith(21, 'a', {
            modelo_id: 3,
            formula_ids: [101, 102],
            valores: { x: 2, y: 3 },
            resultado_final: '5',
        });
    });

    it('no envía el procedimiento sin valores cuando el modelo declara claves', () => {
        const guardarProcedimiento = vi.fn().mockResolvedValue({});
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        expect(
            (
                screen.getByRole('button', {
                    name: 'Guardar procedimiento',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(guardarProcedimiento).not.toHaveBeenCalled();
    });

    it('rechaza valores cuando faltan claves configuradas', () => {
        const guardarProcedimiento = vi.fn().mockResolvedValue({});
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: '2' } },
        );

        expect(screen.getByText(/valor numérico válido para Y/i)).toBeTruthy();
        expect(
            (
                screen.getByRole('button', {
                    name: 'Guardar procedimiento',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
        expect(guardarProcedimiento).not.toHaveBeenCalled();
    });

    it('envía únicamente los valores numéricos de las variables del modelo', () => {
        const guardarProcedimiento = vi.fn().mockResolvedValue({});
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: '2.5' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de Y (inciso a)' }),
            { target: { value: '-3' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar procedimiento' }),
        );
        expect(
            screen.queryByRole('spinbutton', {
                name: 'Valor de Z (inciso a)',
            }),
        ).toBeNull();
        expect(guardarProcedimiento).toHaveBeenCalledWith(21, 'a', {
            modelo_id: 3,
            formula_ids: [101],
            valores: { x: 2.5, y: -3 },
        });
    });

    it('no indica que se guardó hasta que termine el PATCH', () => {
        let resolver!: (respuesta: null) => void;
        const guardarProcedimiento = vi.fn(
            () =>
                new Promise<null>((resolve) => {
                    resolver = resolve;
                }),
        );
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: '2' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de Y (inciso a)' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar procedimiento' }),
        );

        expect(guardarProcedimiento).toHaveBeenCalledOnce();
        expect(screen.queryByText('Procedimiento guardado.')).toBeNull();
        resolver(null);
    });

    it('recupera y presenta un procedimiento previamente guardado', () => {
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                procedimientosLocales: { '21:a': procedimientoGuardado() },
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);

        expect(
            (
                screen.getByRole('combobox', {
                    name: 'Modelo del inciso a',
                }) as HTMLSelectElement
            ).value,
        ).toBe('3');
        expect(
            (
                screen.getByRole('checkbox', {
                    name: 'Seleccionar fórmula 101',
                }) as HTMLInputElement
            ).checked,
        ).toBe(true);
        expect(
            (
                screen.getByRole('spinbutton', {
                    name: 'Valor de X (inciso a)',
                }) as HTMLInputElement
            ).value,
        ).toBe('2');
        expect(
            (
                screen.getByRole('spinbutton', {
                    name: 'Valor de Y (inciso a)',
                }) as HTMLInputElement
            ).value,
        ).toBe('3');
        expect(screen.getByText('Procedimiento guardado.')).toBeTruthy();
    });

    it('muestra todos los valores históricos cuando el modelo ya no está disponible', () => {
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos([modelosPermitidos[1]])],
                procedimientosLocales: {
                    '21:a': procedimientoGuardado(),
                },
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);

        expect(screen.getByText(/modelo 3 ya no está disponible/)).toBeTruthy();
        expect(screen.getByText(/101, 102/)).toBeTruthy();
        expect(
            screen.getByText(
                (_, elemento) =>
                    elemento?.tagName === 'P' &&
                    elemento.textContent?.includes('Resultado final: 5') ===
                        true,
            ),
        ).toBeTruthy();
        expect(screen.getByText(/"x": 2/)).toBeTruthy();
        expect(screen.getByText(/"y": 3/)).toBeTruthy();
        expect(
            screen.queryByRole('combobox', { name: 'Modelo del inciso a' }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Guardar procedimiento' }),
        ).toBeNull();
    });

    it('muestra cuando un inciso no tiene modelos permitidos', () => {
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ preguntas: [preguntaConModelos([])] }),
        );

        render(<RendicionEvaluacion examenId={12} />);

        expect(
            screen.getByText('No hay modelos permitidos para este inciso.'),
        ).toBeTruthy();
    });

    it('muestra el error HU-23 sin presentarlo como error de respuesta HU-22', async () => {
        const guardarProcedimiento = vi.fn().mockResolvedValue(null);
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: '2' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de Y (inciso a)' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar procedimiento' }),
        );

        await waitFor(() =>
            expect(screen.getByRole('alert').textContent).toContain(
                'No se pudo guardar el procedimiento.',
            ),
        );
        expect(
            screen.queryByText('No se pudo guardar la respuesta.'),
        ).toBeNull();
    });

    it('permite reintentar HU-23 después de un error', async () => {
        const guardarProcedimiento = vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ estado_respuesta: 'pendiente' });
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                preguntas: [preguntaConModelos()],
                guardarProcedimiento,
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.change(
            screen.getByRole('combobox', { name: 'Modelo del inciso a' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Seleccionar fórmula 101',
            }),
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de X (inciso a)' }),
            { target: { value: '2' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', { name: 'Valor de Y (inciso a)' }),
            { target: { value: '3' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar procedimiento' }),
        );
        await waitFor(() =>
            expect(screen.getByRole('alert').textContent).toContain(
                'No se pudo guardar el procedimiento.',
            ),
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Reintentar procedimiento',
            }),
        );
        await waitFor(() =>
            expect(guardarProcedimiento).toHaveBeenCalledTimes(2),
        );
        expect(screen.getByText('Procedimiento guardado.')).toBeTruthy();
    });

    it('permite respuestas independientes múltiples, verdadero/falso, desarrollo y numérica', () => {
        const guardarRespuesta = vi.fn().mockResolvedValue(null);
        const preguntaConTipos: PreguntaRendicionEstudiante = {
            pregunta_id: 31,
            orden: 1,
            enunciado: 'Pregunta con diferentes tipos de inciso',
            tipo_respuesta: 'mixto',
            estado_respuesta: 'pendiente',
            incisos: [
                {
                    letra: 'a',
                    enunciado_inciso: 'Elige varias',
                    tipo_respuesta: 'opcion_multiple',
                    opciones: [
                        { nro_opcion: 1, texto_opcion: 'Alternativa A' },
                        { nro_opcion: 2, texto_opcion: 'Alternativa B' },
                    ],
                },
                {
                    letra: 'b',
                    enunciado_inciso: 'Verdadero o falso',
                    tipo_respuesta: 'verdadero_falso',
                    opciones: [
                        { nro_opcion: 1, texto_opcion: 'Verdadero' },
                        { nro_opcion: 2, texto_opcion: 'Falso' },
                    ],
                },
                {
                    letra: 'c',
                    enunciado_inciso: 'Explica tu respuesta',
                    tipo_respuesta: 'desarrollo',
                    opciones: [],
                },
                {
                    letra: 'd',
                    enunciado_inciso: 'Calcula el resultado',
                    tipo_respuesta: 'numerica',
                    opciones: [],
                },
            ],
        };
        mockUsePreguntasRendicion.mockReturnValue({
            ...crearEstado({ guardarRespuesta }),
            preguntas: [preguntaConTipos],
        });

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('checkbox', { name: 'Alternativa A' }),
        );
        fireEvent.click(screen.getByRole('radio', { name: 'Verdadero' }));
        fireEvent.change(
            screen.getByRole('textbox', { name: 'Respuesta del inciso c' }),
            { target: { value: 'Desarrollo escrito' } },
        );
        fireEvent.change(
            screen.getByRole('spinbutton', {
                name: 'Respuesta numérica del inciso d',
            }),
            { target: { value: '42.5' } },
        );

        expect(guardarRespuesta).toHaveBeenNthCalledWith(1, 31, 'a', {
            opciones: [1],
        });
        expect(guardarRespuesta).toHaveBeenNthCalledWith(2, 31, 'b', {
            opciones: [1],
        });
        expect(guardarRespuesta).toHaveBeenNthCalledWith(3, 31, 'c', {
            respuesta_texto: 'Desarrollo escrito',
        });
        expect(guardarRespuesta).toHaveBeenNthCalledWith(4, 31, 'd', {
            respuesta_texto: '42.5',
        });
    });

    it('recupera en pantalla respuestas guardadas durante la sesión y presenta su estado', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({
                respuestasLocales: { '21:a': { opciones: [2] } },
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);

        expect(
            (
                screen.getByRole('radio', {
                    name: 'Alternativa dos',
                }) as HTMLInputElement
            ).checked,
        ).toBe(true);
        expect(screen.getByText('Respuesta guardada.')).toBeTruthy();
    });

    it('indica que todo está guardado y no avisa al cerrar la pestaña', () => {
        const agregar = vi.spyOn(window, 'addEventListener');
        render(<RendicionEvaluacion examenId={12} />);

        expect(
            screen.getByText('Todas tus respuestas están guardadas.'),
        ).toBeTruthy();
        expect(
            agregar.mock.calls.some(([tipo]) => tipo === 'beforeunload'),
        ).toBe(false);
        agregar.mockRestore();
    });

    it('avisa antes de cerrar la pestaña mientras hay un guardado en curso', () => {
        const guardarRespuesta = vi.fn(() => new Promise<null>(() => {}));
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ guardarRespuesta }),
        );
        const agregar = vi.spyOn(window, 'addEventListener');
        const quitar = vi.spyOn(window, 'removeEventListener');

        const { unmount } = render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(screen.getByRole('radio', { name: 'Alternativa uno' }));

        expect(screen.getByText('Guardando respuestas…')).toBeTruthy();
        expect(
            agregar.mock.calls.some(([tipo]) => tipo === 'beforeunload'),
        ).toBe(true);

        unmount();
        expect(
            quitar.mock.calls.some(([tipo]) => tipo === 'beforeunload'),
        ).toBe(true);
        agregar.mockRestore();
        quitar.mockRestore();
    });

    it('marca respuestas sin guardar cuando falla un guardado', async () => {
        const guardarRespuesta = vi.fn().mockResolvedValue(null);
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ guardarRespuesta }),
        );

        render(<RendicionEvaluacion examenId={12} />);

        fireEvent.click(screen.getByRole('radio', { name: 'Alternativa uno' }));
        await waitFor(() =>
            expect(
                screen.getByText(
                    'Hay respuestas sin guardar. Usa «Reintentar guardado».',
                ),
            ).toBeTruthy(),
        );
    });

    it('muestra un error de HU-22 sin ocultar el control de respuesta', async () => {
        const guardarRespuesta = vi.fn().mockResolvedValue(null);
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({ guardarRespuesta }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(screen.getByRole('radio', { name: 'Alternativa uno' }));

        await waitFor(() =>
            expect(screen.getByRole('alert').textContent).toContain(
                'No se pudo guardar la respuesta.',
            ),
        );
        expect(
            screen.getByRole('radio', { name: 'Alternativa uno' }),
        ).toBeTruthy();
    });

    it('reintenta la última respuesta fallida sin cambiarla', async () => {
        const guardarRespuesta = vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
                examen_id: 12,
                pregunta_id: 21,
                letra: 'a',
                estado_respuesta: 'respondida',
                guardado_en: '2026-11-08T14:00:00.000Z',
            });
        const estadoInicial = crearEstado({ guardarRespuesta });
        mockUsePreguntasRendicion.mockReturnValue(estadoInicial);

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(screen.getByRole('radio', { name: 'Alternativa uno' }));
        await waitFor(() =>
            expect(screen.getByRole('alert').textContent).toContain(
                'No se pudo guardar la respuesta.',
            ),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Reintentar guardado' }),
        );
        await waitFor(() => expect(guardarRespuesta).toHaveBeenCalledTimes(2));

        expect(guardarRespuesta).toHaveBeenNthCalledWith(1, 21, 'a', {
            opciones: [1],
        });
        expect(guardarRespuesta).toHaveBeenNthCalledWith(2, 21, 'a', {
            opciones: [1],
        });
    });

    it('indica cuando una respuesta se está guardando', async () => {
        const guardarRespuesta = vi.fn(() => new Promise<null>(() => {}));
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({ guardarRespuesta }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(screen.getByRole('radio', { name: 'Alternativa uno' }));

        expect(screen.getByText('Guardando respuesta…')).toBeTruthy();
    });

    it('muestra la carga y un error con opción de reintento', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({ preguntas: [], cargando: true }),
        );
        const { rerender } = render(<RendicionEvaluacion examenId={12} />);
        expect(screen.getByLabelText('Cargando rendición')).toBeTruthy();

        const recargar = vi.fn();
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({
                preguntas: [],
                error: 'No se pudo consultar la rendición.',
                recargar,
            }),
        );
        rerender(<RendicionEvaluacion examenId={12} />);

        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        expect(recargar).toHaveBeenCalledOnce();
        expect(screen.getByRole('alert').textContent).toBe(
            'No se pudo consultar la rendición.',
        );
    });

    it('muestra estado vacío cuando no hay preguntas asignadas', () => {
        mockUsePreguntasRendicion.mockReturnValueOnce(
            crearEstado({ preguntas: [] }),
        );

        render(<RendicionEvaluacion examenId={12} />);

        expect(
            screen.getByRole('heading', {
                name: 'No hay preguntas disponibles',
            }),
        ).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'Volver a instrucciones' })
                .getAttribute('href'),
        ).toBe('/estudiante/evaluaciones/12/instrucciones');
    });

    it('pide confirmación y cancelar mantiene al estudiante en la evaluación', () => {
        render(<RendicionEvaluacion examenId={12} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'Finalizar evaluación' }),
        );

        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(
            screen.getByRole('heading', { name: '¿Finalizar evaluación?' }),
        ).toBeTruthy();
        expect(mocks.finalizarRendicion).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(mocks.finalizarRendicion).not.toHaveBeenCalled();
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(
            screen.getByRole('heading', {
                name: 'Enunciado de la primera pregunta',
            }),
        ).toBeTruthy();
    });

    it('espera los guardados pendientes y redirige solo tras confirmar el backend', async () => {
        let resolverGuardados!: (valor: { fallidos: string[] }) => void;
        const esperarGuardadosPendientes = vi.fn(
            () =>
                new Promise<{ fallidos: string[] }>((resolve) => {
                    resolverGuardados = resolve;
                }),
        );
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({ esperarGuardadosPendientes }),
        );

        let resolverFinalizar!: (valor: {
            examen_id: number;
            estado: string;
            fecha_envio: string | null;
        }) => void;
        mocks.finalizarRendicion.mockReturnValue(
            new Promise((resolve) => {
                resolverFinalizar = resolve;
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Finalizar evaluación' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Sí, finalizar' }));

        expect(esperarGuardadosPendientes).toHaveBeenCalledTimes(1);
        expect(mocks.finalizarRendicion).not.toHaveBeenCalled();
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(
            screen
                .getByRole('button', { name: 'Finalizando…' })
                .hasAttribute('disabled'),
        ).toBe(true);

        resolverGuardados({ fallidos: [] });

        await waitFor(() =>
            expect(mocks.finalizarRendicion).toHaveBeenCalledWith(12),
        );
        expect(mocks.replace).not.toHaveBeenCalled();

        resolverFinalizar({
            examen_id: 12,
            estado: 'enviada',
            fecha_envio: null,
        });

        await waitFor(() =>
            expect(mocks.replace).toHaveBeenCalledWith(
                '/estudiante/evaluaciones',
            ),
        );
    });

    it('no finaliza si quedaron respuestas sin guardar', async () => {
        mockUsePreguntasRendicion.mockReturnValue(
            crearEstado({
                esperarGuardadosPendientes: vi
                    .fn()
                    .mockResolvedValue({ fallidos: ['21:a'] }),
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Finalizar evaluación' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Sí, finalizar' }));

        await waitFor(() =>
            expect(screen.getByRole('alert').textContent).toContain(
                'no se pudieron guardar',
            ),
        );
        expect(mocks.finalizarRendicion).not.toHaveBeenCalled();
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    });

    it('un error del backend no redirige y permite reintentar', async () => {
        mocks.finalizarRendicion.mockRejectedValueOnce(
            new Error('fallo de red'),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Finalizar evaluación' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Sí, finalizar' }));

        await waitFor(() =>
            expect(screen.getByRole('alert').textContent).toContain(
                'No se pudo finalizar la evaluación.',
            ),
        );
        expect(mocks.replace).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

        await waitFor(() =>
            expect(mocks.replace).toHaveBeenCalledWith(
                '/estudiante/evaluaciones',
            ),
        );
        expect(mocks.finalizarRendicion).toHaveBeenCalledTimes(2);
    });

    it('evita solicitudes duplicadas mientras la finalización está en curso', async () => {
        let resolverFinalizar!: (valor: {
            examen_id: number;
            estado: string;
            fecha_envio: string | null;
        }) => void;
        mocks.finalizarRendicion.mockReturnValue(
            new Promise((resolve) => {
                resolverFinalizar = resolve;
            }),
        );

        render(<RendicionEvaluacion examenId={12} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Finalizar evaluación' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Sí, finalizar' }));

        await waitFor(() =>
            expect(mocks.finalizarRendicion).toHaveBeenCalledTimes(1),
        );

        const enProceso = screen.getByRole('button', {
            name: 'Finalizando…',
        });
        expect(enProceso.hasAttribute('disabled')).toBe(true);

        fireEvent.click(enProceso);

        expect(mocks.finalizarRendicion).toHaveBeenCalledTimes(1);

        resolverFinalizar({
            examen_id: 12,
            estado: 'enviada',
            fecha_envio: null,
        });

        await waitFor(() =>
            expect(mocks.replace).toHaveBeenCalledWith(
                '/estudiante/evaluaciones',
            ),
        );
    });
});
