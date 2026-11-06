import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RevisionGeneracionIa from './RevisionGeneracionIa';
import { iageneracionService } from '../services/iageneracion.service';
import { DESCRIPCIONES_DIFICULTAD } from '../etiquetas';
import type {
    GeneracionIaDetalle,
    PropuestaGeneracionIa,
} from '../types';

vi.mock('../services/iageneracion.service', () => ({
    iageneracionService: {
        obtener: vi.fn(),
        actualizarPropuesta: vi.fn(),
        aceptarPropuesta: vi.fn(),
        descartarPropuesta: vi.fn(),
        insertarPropuesta: vi.fn(),
    },
}));

function propuesta(
    tipo: PropuestaGeneracionIa['tipo_respuesta'],
): PropuestaGeneracionIa {
    const base = {
        propuesta_id: 15,
        tipo_respuesta: tipo,
        estado: 'pendiente' as const,
        pregunta_id: null,
    };

    switch (tipo) {
        case 'opcion_unica':
            return {
                ...base,
                tipo_respuesta: tipo,
                contenido: {
                    enunciado: '¿Cuál es correcta?',
                    dificultad: 'media',
                    puntaje_max: 2,
                    opciones: [
                        { texto_opcion: 'Respuesta A', es_correcta: true },
                        { texto_opcion: 'Respuesta B', es_correcta: false },
                    ],
                },
            };
        case 'opcion_multiple':
            return {
                ...base,
                tipo_respuesta: tipo,
                contenido: {
                    enunciado: 'Selecciona todas las correctas.',
                    dificultad: 'media',
                    puntaje_max: 2,
                    opciones: [
                        { texto_opcion: 'Correcta A', es_correcta: true },
                        { texto_opcion: 'Correcta B', es_correcta: true },
                    ],
                },
            };
        case 'verdadero_falso':
            return {
                ...base,
                tipo_respuesta: tipo,
                contenido: {
                    enunciado: 'La afirmación es correcta.',
                    dificultad: 'facil',
                    puntaje_max: 1,
                    opciones: [
                        { texto_opcion: 'Verdadero', es_correcta: true },
                        { texto_opcion: 'Falso', es_correcta: false },
                    ],
                },
            };
        case 'numerica':
            return {
                ...base,
                tipo_respuesta: tipo,
                contenido: {
                    enunciado: '¿Cuánto es 2 + 2?',
                    dificultad: 'facil',
                    puntaje_max: 1,
                    valor_correcto: 4,
                    tolerancia: 0.1,
                },
            };
        case 'desarrollo':
            return {
                ...base,
                tipo_respuesta: tipo,
                contenido: {
                    enunciado: 'Explica el procedimiento.',
                    dificultad: 'dificil',
                    puntaje_max: 3,
                    solucion_referencia: 'Aplicar la regla indicada.',
                },
            };
    }
}

function detalle(
    propuestas: PropuestaGeneracionIa[],
): GeneracionIaDetalle {
    return {
        generacion_id: 12,
        estado: 'completada',
        tipo_respuesta: propuestas[0]?.tipo_respuesta ?? 'opcion_unica',
        dificultad: 'media',
        cantidad: propuestas.length,
        cantidad_generada: propuestas.length,
        materia_id: 2,
        materia: 'Matemática',
        tema_id: 4,
        tema: 'Funciones',
        proveedor: 'fake',
        modelo: 'fake',
        tokens: { entrada: 1, salida: 2, total: 3 },
        error_mensaje: null,
        iniciada_en: null,
        finalizada_en: null,
        fecha: '2026-11-04T20:00:00.000Z',
        materiales: [{ material_id: 5, titulo: 'Apuntes de funciones' }],
        propuestas,
    };
}

describe('RevisionGeneracionIa', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });
    afterEach(cleanup);

    it.each([
        ['opcion_unica', '¿Cuál es correcta?'],
        ['opcion_multiple', 'Selecciona todas las correctas.'],
        ['verdadero_falso', 'La afirmación es correcta.'],
        ['numerica', '¿Cuánto es 2 + 2?'],
        ['desarrollo', 'Explica el procedimiento.'],
    ] as const)(
        'muestra preguntas de tipo %s',
        async (tipo, enunciado) => {
            vi.mocked(iageneracionService.obtener).mockResolvedValue(
                detalle([propuesta(tipo)]),
            );

            render(<RevisionGeneracionIa generacionId={12} />);

            expect(await screen.findByText(enunciado)).toBeTruthy();
            expect(
                screen.getByText('Apuntes de funciones'),
            ).toBeTruthy();
            expect(
                screen.getByText('Respuesta de referencia'),
            ).toBeTruthy();
            expect(
                screen.queryByRole('button', { name: 'Insertar en el banco' }),
            ).toBeNull();
        },
    );

    it('muestra correctamente acentos, eñes y signos de interrogación ya normalizados', async () => {
        vi.mocked(iageneracionService.obtener).mockResolvedValue(
            detalle([
                {
                    propuesta_id: 15,
                    tipo_respuesta: 'opcion_unica',
                    estado: 'pendiente',
                    pregunta_id: null,
                    contenido: {
                        enunciado:
                            '¿Cuál es la función de la mitocondria en la célula?',
                        dificultad: 'media',
                        puntaje_max: 2,
                        opciones: [
                            {
                                texto_opcion: 'Producir energía para la célula',
                                es_correcta: true,
                            },
                            {
                                texto_opcion: 'Almacenar agua y desechos',
                                es_correcta: false,
                            },
                        ],
                        explicacion:
                            'La mitocondria genera energía; ¡es el motor de la célula!',
                    },
                },
            ]),
        );

        render(<RevisionGeneracionIa generacionId={12} />);

        expect(
            await screen.findByText(
                '¿Cuál es la función de la mitocondria en la célula?',
            ),
        ).toBeTruthy();
        expect(
            screen.getAllByText('Producir energía para la célula').length,
        ).toBeGreaterThan(0);
        expect(
            screen.getAllByText('Almacenar agua y desechos').length,
        ).toBeGreaterThan(0);
        expect(
            screen.getByText(
                /La mitocondria genera energía; ¡es el motor de la célula!/,
            ),
        ).toBeTruthy();
        // No debe quedar ninguna entidad HTML visible en pantalla.
        expect(screen.queryByText(/&(?:uacute|iquest|ntilde);/)).toBeNull();
    });

    it('valida la edición y envía el contenido válido actualizado', async () => {
        const inicial = detalle([propuesta('opcion_unica')]);
        const propuestaUnica = propuesta('opcion_unica');
        if (propuestaUnica.tipo_respuesta !== 'opcion_unica') {
            throw new Error('El helper debe producir una pregunta de opción única');
        }
        const actualizado = detalle([
            {
                ...propuestaUnica,
                contenido: {
                    ...propuestaUnica.contenido,
                    enunciado: 'Enunciado editado',
                },
            },
        ]);
        vi.mocked(iageneracionService.obtener)
            .mockResolvedValueOnce(inicial)
            .mockResolvedValueOnce(actualizado);
        vi.mocked(iageneracionService.actualizarPropuesta).mockResolvedValue({
            propuesta_id: 15,
            contenido: propuestaUnica.contenido,
            estado: 'pendiente',
            pregunta_id: null,
        });

        render(<RevisionGeneracionIa generacionId={12} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

        fireEvent.change(screen.getByLabelText('Enunciado'), {
            target: { value: '' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        expect(
            await screen.findByText('Escribe el enunciado de la pregunta.'),
        ).toBeTruthy();
        expect(
            iageneracionService.actualizarPropuesta,
        ).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText('Enunciado'), {
            target: { value: 'Enunciado editado' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        await waitFor(() =>
            expect(
                iageneracionService.actualizarPropuesta,
            ).toHaveBeenCalledWith(
                12,
                15,
                expect.objectContaining({
                    enunciado: 'Enunciado editado',
                    dificultad: 'media',
                    opciones: [
                        { texto_opcion: 'Respuesta A', es_correcta: true },
                        { texto_opcion: 'Respuesta B', es_correcta: false },
                    ],
                }),
            ),
        );
        expect(await screen.findByText('Enunciado editado')).toBeTruthy();
    });

    it.each([
        ['aceptar', 'aceptarPropuesta', 'aceptada'],
        ['descartar', 'descartarPropuesta', 'descartada'],
    ] as const)(
        '%s actualiza el estado de la propuesta tras confirmación',
        async (accion, metodo, nuevoEstado) => {
            const pendiente = detalle([propuesta('opcion_unica')]);
            const revisada = detalle([
                { ...propuesta('opcion_unica'), estado: nuevoEstado },
            ]);
            vi.mocked(iageneracionService.obtener)
                .mockResolvedValueOnce(pendiente)
                .mockResolvedValueOnce(revisada);
            vi.mocked(iageneracionService[metodo]).mockResolvedValue({
                propuesta_id: 15,
                contenido: propuesta('opcion_unica').contenido,
                estado: nuevoEstado,
                pregunta_id: null,
            });

            render(<RevisionGeneracionIa generacionId={12} />);
            fireEvent.click(
                await screen.findByRole('button', {
                    name: accion === 'aceptar' ? 'Aceptar propuesta' : 'Descartar',
                }),
            );

            await waitFor(() => {
                expect(iageneracionService[metodo]).toHaveBeenCalledWith(
                    12,
                    15,
                );
            });
            expect(
                await screen.findByText(
                    nuevoEstado === 'aceptada' ? 'Aceptada' : 'Descartada',
                ),
            ).toBeTruthy();
            expect(window.confirm).toHaveBeenCalled();

            if (nuevoEstado === 'aceptada') {
                expect(
                    screen.getByRole('button', {
                        name: 'Insertar en el banco',
                    }),
                ).toBeTruthy();
            }
        },
    );

    it('muestra la dificultad de la generación y la de cada propuesta', async () => {
        const propuestaDificil = propuesta('desarrollo');
        vi.mocked(iageneracionService.obtener).mockResolvedValue({
            ...detalle([propuestaDificil]),
            dificultad: 'dificil',
        });

        render(<RevisionGeneracionIa generacionId={12} />);

        await screen.findByText('Explica el procedimiento.');
        expect(screen.getByText('Difícil')).toBeTruthy();
        expect(
            screen.getByTitle(DESCRIPCIONES_DIFICULTAD.dificil),
        ).toBeTruthy();
    });

    it('permite cambiar la dificultad al editar y la envía al guardar', async () => {
        const original = propuesta('opcion_unica');

        if (original.tipo_respuesta !== 'opcion_unica') {
            throw new Error('El helper debe producir una pregunta de opción única');
        }

        const editada: PropuestaGeneracionIa = {
            ...original,
            contenido: {
                ...original.contenido,
                dificultad: 'dificil',
            },
        };
        vi.mocked(iageneracionService.obtener)
            .mockResolvedValueOnce(detalle([original]))
            .mockResolvedValueOnce({ ...detalle([editada]), dificultad: 'dificil' });
        vi.mocked(iageneracionService.actualizarPropuesta).mockResolvedValue({
            propuesta_id: 15,
            contenido: editada.contenido,
            estado: 'pendiente',
            pregunta_id: null,
        });

        render(<RevisionGeneracionIa generacionId={12} />);
        fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));

        fireEvent.change(screen.getByLabelText('Dificultad'), {
            target: { value: 'dificil' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        await waitFor(() =>
            expect(
                iageneracionService.actualizarPropuesta,
            ).toHaveBeenCalledWith(
                12,
                15,
                expect.objectContaining({
                    dificultad: 'dificil',
                    enunciado: '¿Cuál es correcta?',
                }),
            ),
        );
        expect(
            await screen.findByTitle(DESCRIPCIONES_DIFICULTAD.dificil),
        ).toBeTruthy();
    });

    it('explica la diferencia entre aceptar e insertar en el banco', async () => {
        const pendiente = detalle([propuesta('opcion_unica')]);
        const aceptada = detalle([
            { ...propuesta('opcion_unica'), estado: 'aceptada' },
        ]);
        const insertada = detalle([
            {
                ...propuesta('opcion_unica'),
                estado: 'aceptada',
                pregunta_id: 44,
            },
        ]);
        vi.mocked(iageneracionService.obtener)
            .mockResolvedValueOnce(pendiente)
            .mockResolvedValueOnce(aceptada)
            .mockResolvedValue(insertada);
        vi.mocked(iageneracionService.aceptarPropuesta).mockResolvedValue({
            propuesta_id: 15,
            contenido: propuesta('opcion_unica').contenido,
            estado: 'aceptada',
            pregunta_id: null,
        });
        vi.mocked(iageneracionService.insertarPropuesta).mockResolvedValue({
            propuesta_id: 15,
            pregunta_id: 44,
            estado: 'aceptada',
            insertada: true,
            ya_estaba_insertada: false,
        });

        render(<RevisionGeneracionIa generacionId={12} />);

        expect(
            await screen.findByText(
                /Aceptar no inserta automáticamente la propuesta/,
            ),
        ).toBeTruthy();
        fireEvent.click(
            screen.getByRole('button', { name: 'Aceptar propuesta' }),
        );

        expect(
            await screen.findByText(
                /Propuesta aceptada\. Aún no está en el banco/,
            ),
        ).toBeTruthy();
        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Insertar en el banco',
            }),
        );

        expect(
            await screen.findByText(
                'Pregunta insertada en el banco con ID 44.',
            ),
        ).toBeTruthy();
    });

    it('solo permite insertar propuestas aceptadas sin pregunta asociada', async () => {
        const aceptada = propuesta('opcion_unica');
        const yaInsertada = {
            ...aceptada,
            estado: 'aceptada' as const,
            pregunta_id: 44,
        };
        vi.mocked(iageneracionService.obtener)
            .mockResolvedValueOnce(detalle([{ ...aceptada, estado: 'aceptada' }]))
            .mockResolvedValueOnce(detalle([yaInsertada]));

        const { rerender } = render(
            <RevisionGeneracionIa generacionId={12} />,
        );
        expect(
            await screen.findByRole('button', {
                name: 'Insertar en el banco',
            }),
        ).toBeTruthy();
        vi.mocked(window.confirm).mockReturnValue(false);
        fireEvent.click(
            screen.getByRole('button', { name: 'Insertar en el banco' }),
        );

        expect(window.confirm).toHaveBeenCalledWith(
            '¿Insertar esta propuesta aceptada en el banco de preguntas?',
        );
        expect(iageneracionService.insertarPropuesta).not.toHaveBeenCalled();

        vi.mocked(iageneracionService.obtener).mockResolvedValue(
            detalle([yaInsertada]),
        );
        rerender(<RevisionGeneracionIa generacionId={13} />);
        expect(await screen.findByText('44', { selector: 'strong' })).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'Insertar en el banco' }),
        ).toBeNull();
    });

    it('inserta tras confirmación, bloquea solicitudes repetidas y actualiza al recibir éxito', async () => {
        const aceptada = {
            ...propuesta('opcion_unica'),
            estado: 'aceptada' as const,
        };
        const yaInsertada = { ...aceptada, pregunta_id: 44 };
        vi.mocked(iageneracionService.obtener)
            .mockResolvedValueOnce(detalle([aceptada]))
            .mockResolvedValue(detalle([yaInsertada]));
        let resolver!: (value: {
            propuesta_id: number;
            pregunta_id: number;
            estado: 'aceptada';
            insertada: boolean;
            ya_estaba_insertada: boolean;
        }) => void;
        vi.mocked(iageneracionService.insertarPropuesta).mockReturnValue(
            new Promise((resolve) => {
                resolver = resolve;
            }),
        );

        render(<RevisionGeneracionIa generacionId={12} />);
        const boton = await screen.findByRole('button', {
            name: 'Insertar en el banco',
        });
        fireEvent.click(boton);
        fireEvent.click(boton);

        const botonInsertando = await screen.findByRole('button', {
            name: 'Insertando...',
        });
        expect(botonInsertando.hasAttribute('disabled')).toBe(true);
        expect(iageneracionService.insertarPropuesta).toHaveBeenCalledTimes(1);
        expect(
            screen.queryByText(/ID de pregunta: 44/),
        ).toBeNull();

        resolver({
            propuesta_id: 15,
            pregunta_id: 44,
            estado: 'aceptada',
            insertada: true,
            ya_estaba_insertada: false,
        });

        expect(await screen.findByText('44', { selector: 'strong' })).toBeTruthy();
    });

    it('conserva la acción de inserción y muestra error si falla el endpoint', async () => {
        const aceptada = {
            ...propuesta('opcion_unica'),
            estado: 'aceptada' as const,
        };
        vi.mocked(iageneracionService.obtener).mockResolvedValue(
            detalle([aceptada]),
        );
        vi.mocked(iageneracionService.insertarPropuesta).mockRejectedValue(
            new Error('Error del servidor'),
        );

        render(<RevisionGeneracionIa generacionId={12} />);
        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Insertar en el banco',
            }),
        );

        expect(
            await screen.findByText(
                'No se pudo insertar la propuesta en el banco.',
            ),
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Insertar en el banco' }),
        ).toBeTruthy();
        expect(screen.queryByText(/ID de pregunta:/)).toBeNull();
    });

    it('muestra errores al cargar y al guardar una propuesta', async () => {
        vi.mocked(iageneracionService.obtener).mockRejectedValueOnce(
            new Error('Falló la carga'),
        );
        const { rerender } = render(
            <RevisionGeneracionIa generacionId={12} />,
        );

        expect(
            await screen.findByText('No se pudo cargar la generación.'),
        ).toBeTruthy();

        vi.mocked(iageneracionService.obtener).mockResolvedValue(
            detalle([propuesta('opcion_unica')]),
        );
        rerender(<RevisionGeneracionIa generacionId={13} />);
        vi.mocked(iageneracionService.aceptarPropuesta).mockRejectedValueOnce(
            new Error('Falló la aceptación'),
        );
        fireEvent.click(
            await screen.findByRole('button', { name: 'Aceptar propuesta' }),
        );

        expect(
            await screen.findByText('No se pudo aceptar la propuesta.'),
        ).toBeTruthy();
    });
});
