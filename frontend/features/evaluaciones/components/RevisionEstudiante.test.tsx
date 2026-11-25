import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DetalleCalificacion,
  IncisoCalificacion,
  ResumenCalificaciones,
} from '../calificaciones.types';
import type {
  AceptarCorreccionIaResponse,
  CorreccionIa,
} from '../correccion-ia.types';
import PropuestaCorreccionIa from './PropuestaCorreccionIa';
import RevisionEstudiante from './RevisionEstudiante';

const mocks = vi.hoisted(() => ({
  detalle: vi.fn(),
  resumen: vi.fn(),
  valorar: vi.fn(),
  regenerar: vi.fn(),
  listarPorExamen: vi.fn(),
  obtenerDetalle: vi.fn(),
  modificar: vi.fn(),
  descartar: vi.fn(),
  aceptar: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('../services/calificaciones.service', () => ({
  calificacionesService: {
    detalle: mocks.detalle,
    resumen: mocks.resumen,
    valorar: mocks.valorar,
  },
  mensajeErrorCalificaciones: (error: unknown) =>
    error instanceof Error ? error.message : 'Error de calificaciones',
}));

vi.mock('../services/correccion-ia.service', () => ({
  correccionIaService: {
    regenerar: mocks.regenerar,
    listarPorExamen: mocks.listarPorExamen,
    obtenerDetalle: mocks.obtenerDetalle,
    modificar: mocks.modificar,
    descartar: mocks.descartar,
    aceptar: mocks.aceptar,
  },
  mensajeErrorCorreccionIa: (error: unknown) =>
    error instanceof Error ? error.message : 'Error de corrección IA',
}));

function inciso(
  cambios: Partial<IncisoCalificacion> = {},
): IncisoCalificacion {
  return {
    letra: 'a',
    enunciado_inciso: 'Resuelve 2x = 8.',
    tipo_respuesta: 'desarrollo',
    puntaje_max: '5.00',
    respuesta_texto: 'x = 4',
    puntaje_obtenido: null,
    estado_correccion: 'pendiente',
    pendiente_revision: true,
    retroalimentacion: null,
    opciones: [],
    solucion_numerica: null,
    solucion_referencia: 'x = 4',
    procedimiento: null,
    ...cambios,
  };
}

function detalle(
  cambios: Partial<DetalleCalificacion> = {},
): DetalleCalificacion {
  return {
    examen_id: 12,
    estudiante_id: 8,
    nombre_completo: 'Estudiante de prueba',
    titulo: 'Evaluación de álgebra',
    estado_rendicion: 'corregida',
    nota_final: null,
    calificaciones_revisadas_en: null,
    resultados_publicados_en: null,
    preguntas: [
      {
        pregunta_id: 31,
        orden: 1,
        enunciado: 'Resuelve la ecuación.',
        puntaje_maximo_evaluacion: 5,
        incisos: [inciso()],
      },
    ],
    ...cambios,
  };
}

function resumen(): ResumenCalificaciones {
  return {
    examen_id: 12,
    titulo: 'Evaluación de álgebra',
    puntaje_total: '5.00',
    calificaciones_revisadas_en: null,
    resultados_publicados_en: null,
    respuestas_publicadas_en: null,
    disponible_hasta: null,
    total_rendiciones: 1,
    total_listas: 1,
    total_pendientes: 1,
    estudiantes: [
      {
        estudiante_id: 8,
        nombre_completo: 'Estudiante de prueba',
        estado: 'corregida',
        nota_final: null,
        fecha_envio: null,
        total_incisos: 1,
        pendientes_revision: 1,
        lista_para_publicar: false,
      },
    ],
  };
}

function propuesta(
  cambios: Partial<CorreccionIa> = {},
): CorreccionIa {
  return {
    propuesta_id: 77,
    examen_id: 12,
    estudiante_id: 8,
    pregunta_id: 31,
    letra: 'a',
    estado: 'generada',
    puntaje_sugerido: '3.50',
    puntaje_max_inciso: '5.00',
    valoracion: 'Correcto en lo esencial.',
    explicacion: 'Despejó correctamente la variable.',
    errores: [
      { tipo: 'presentacion', descripcion: 'Faltó mostrar una comprobación.' },
    ],
    confianza: '0.85',
    criterio_fuente: 'solucion_referencia',
    criterio_hash: 'abc123',
    modelo: 'fake',
    proveedor: 'fake',
    intento: 1,
    version: 2,
    creada_en: '2026-06-25T10:00:00.000Z',
    iniciada_en: null,
    finalizada_en: '2026-06-25T10:00:01.000Z',
    actualizada_en: '2026-06-25T10:00:01.000Z',
    revisada_en: null,
    revisada_por_docente_id: null,
    reemplazada_por_id: null,
    error_codigo: null,
    error_mensaje: null,
    motivo: null,
    ...cambios,
  };
}

function resultadoAceptacion(
  puntaje = '3.50',
): AceptarCorreccionIaResponse {
  return {
    propuesta: { propuesta_id: 77, estado: 'aceptada' },
    calificacion: {
      puntaje_obtenido: puntaje,
      estado_correccion: 'manual',
      nota_final: puntaje,
      estado_rendicion: 'corregida',
      pendientes_revision: 0,
    },
    advertencias: [
      {
        codigo: 'CRITERIO_ACTUALIZADO',
        mensaje: 'El criterio cambió desde que se generó la propuesta.',
      },
    ],
  };
}

async function cargarPantalla() {
  render(<RevisionEstudiante examenId={12} estudianteId={8} />);
  await screen.findByRole('heading', { name: 'Revisión manual' });
}

async function avanzarSondeo() {
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 2600));
  });
}

beforeEach(() => {
  vi.useRealTimers();
  mocks.detalle.mockReset().mockResolvedValue(detalle());
  mocks.resumen.mockReset().mockResolvedValue(resumen());
  mocks.valorar.mockReset().mockResolvedValue({});
  mocks.regenerar
    .mockReset()
    .mockResolvedValue({ propuesta_id: 78, estado: 'pendiente', intento: 2 });
  mocks.listarPorExamen
    .mockReset()
    .mockResolvedValue({ total: 0, propuestas: [] });
  mocks.obtenerDetalle.mockReset().mockResolvedValue(propuesta());
  mocks.modificar.mockReset().mockResolvedValue(propuesta({ estado: 'modificada' }));
  mocks.descartar
    .mockReset()
    .mockResolvedValue({ propuesta_id: 77, estado: 'descartada' });
  mocks.aceptar.mockReset().mockResolvedValue(resultadoAceptacion());
  mocks.push.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('RevisionEstudiante — propuestas de corrección IA', () => {
  it('recupera la propuesta activa desde la bandeja y ya no ofrece solicitud individual', async () => {
    mocks.listarPorExamen.mockResolvedValue({
      total: 1,
      propuestas: [propuesta({ estado: 'pendiente', puntaje_sugerido: null })],
    });
    await cargarPantalla();

    expect(
      await screen.findByRole('heading', {
        name: 'Resultado provisional (generado con IA)',
      }),
    ).toBeDefined();
    expect(screen.getByText('La propuesta está pendiente de procesamiento.')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Sugerir con IA' })).toBeNull();
    expect(mocks.listarPorExamen).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByLabelText('Puntaje asignado') as HTMLInputElement).value,
    ).toBe('');
  });

  it('avisa que se usó un criterio predeterminado y pide revisión especial', async () => {
    mocks.listarPorExamen.mockResolvedValue({
      total: 1,
      propuestas: [propuesta({ criterio_fuente: 'predeterminado', confianza: '0.50' })],
    });
    await cargarPantalla();

    const aviso = await screen.findByRole('note');
    expect(aviso.textContent).toContain('criterio predeterminado');
    expect(aviso.textContent).toContain('especial cuidado');
  });

  it('no muestra el aviso de criterio predeterminado cuando hay rúbrica o solución', async () => {
    mocks.listarPorExamen.mockResolvedValue({
      total: 1,
      propuestas: [propuesta({ criterio_fuente: 'rubrica' })],
    });
    await cargarPantalla();

    await screen.findByText(/Puntaje sugerido/);
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('conserva la valoración manual sin depender del servicio de IA', async () => {
    await cargarPantalla();
    fireEvent.change(screen.getByLabelText('Puntaje asignado'), {
      target: { value: '4.00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar revisión' }));

    await screen.findByText('Puntaje guardado y calificación recalculada correctamente.');
    expect(mocks.valorar).toHaveBeenCalledWith(12, 8, 31, 'a', {
      puntaje: 4,
      retroalimentacion: null,
    });
  });

  it('muestra la propuesta generada y actualiza la nota oficial solo después de aceptarla', async () => {
    const detalleAceptado = detalle({
      nota_final: '3.50',
      preguntas: [
        {
          pregunta_id: 31,
          orden: 1,
          enunciado: 'Resuelve la ecuación.',
          puntaje_maximo_evaluacion: 5,
          incisos: [
            inciso({
              puntaje_obtenido: '3.50',
              estado_correccion: 'manual',
              pendiente_revision: false,
            }),
          ],
        },
      ],
    });
    mocks.detalle
      .mockReset()
      .mockResolvedValueOnce(detalle())
      .mockResolvedValue(detalleAceptado);

    mocks.listarPorExamen.mockResolvedValue({
      total: 1,
      propuestas: [propuesta({ estado: 'pendiente', puntaje_sugerido: null })],
    });

    await cargarPantalla();
    await screen.findByText('La propuesta está pendiente de procesamiento.');
    expect(
      (screen.getByLabelText('Puntaje asignado') as HTMLInputElement).value,
    ).toBe('');

    mocks.obtenerDetalle.mockResolvedValue(propuesta());
    await avanzarSondeo();

    expect(screen.getByText('Puntaje sugerido:').parentElement?.textContent).toContain(
      '3.50 / 5.00',
    );
    expect(screen.getByText('Correcto en lo esencial.')).toBeDefined();
    expect(screen.getByText('Despejó correctamente la variable.')).toBeDefined();
    expect(screen.getByText('85%')).toBeDefined();
    expect(
      (screen.getByLabelText('Puntaje asignado') as HTMLInputElement).value,
    ).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    await screen.findAllByText('Propuesta aceptada y calificación oficial actualizada.');

    expect(mocks.aceptar).toHaveBeenCalledWith(77, {
      version: 2,
      puntaje_confirmado: '3.50',
    });
    expect(
      (await screen.findByLabelText('Puntaje asignado') as HTMLInputElement)
        .value,
    ).toBe('3.50');
    expect(
      screen.getByText('El criterio cambió desde que se generó la propuesta.'),
    ).toBeDefined();
  });

  it('permite modificar todos los campos y aceptar la versión modificada', async () => {
    const modificada = propuesta({
      estado: 'modificada',
      puntaje_sugerido: '4.25',
      valoracion: 'Valoración docente',
      explicacion: 'Explicación revisada',
      errores: [
        {
          tipo: 'procedimiento',
          descripcion: 'No justificó el último paso.',
          ubicacion: 'Línea 2',
        },
      ],
      version: 3,
    });
    mocks.listarPorExamen.mockResolvedValue({
      total: 1,
      propuestas: [propuesta()],
    });
    mocks.modificar.mockResolvedValue(modificada);

    await cargarPantalla();
    fireEvent.click(await screen.findByRole('button', { name: 'Modificar' }));
    fireEvent.change(screen.getByLabelText('Puntaje sugerido'), {
      target: { value: '4.25' },
    });
    fireEvent.change(screen.getByLabelText('Valoración'), {
      target: { value: 'Valoración docente' },
    });
    fireEvent.change(screen.getByLabelText('Explicación'), {
      target: { value: 'Explicación revisada' },
    });
    fireEvent.change(screen.getByLabelText('Tipo del error 1'), {
      target: { value: 'procedimiento' },
    });
    fireEvent.change(screen.getByLabelText('Descripción del error 1'), {
      target: { value: 'No justificó el último paso.' },
    });
    fireEvent.change(screen.getByLabelText('Ubicación del error 1'), {
      target: { value: 'Línea 2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText('Valoración docente');
    expect(mocks.modificar).toHaveBeenCalledWith(77, {
      puntaje: 4.25,
      valoracion: 'Valoración docente',
      explicacion: 'Explicación revisada',
      errores: [
        {
          tipo: 'procedimiento',
          descripcion: 'No justificó el último paso.',
          ubicacion: 'Línea 2',
        },
      ],
    });
    expect(screen.getByText('modificada')).toBeDefined();
    expect(
      (screen.getByLabelText('Puntaje asignado') as HTMLInputElement).value,
    ).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    await screen.findAllByText('Propuesta aceptada y calificación oficial actualizada.');
    expect(mocks.aceptar).toHaveBeenCalledWith(77, {
      version: 3,
      puntaje_confirmado: '4.25',
    });
  });

  it('permite descartar una propuesta con motivo opcional', async () => {
    mocks.listarPorExamen.mockResolvedValue({
      total: 1,
      propuestas: [propuesta()],
    });

    await cargarPantalla();
    fireEvent.change(
      await screen.findByLabelText('Motivo para descartar (opcional)'),
      { target: { value: 'No corresponde al criterio docente.' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(await screen.findByText('Propuesta descartada.')).toBeDefined();
    expect(mocks.descartar).toHaveBeenCalledWith(77, {
      motivo: 'No corresponde al criterio docente.',
    });
  });

  it('muestra el error del worker y permite regenerar', async () => {
    mocks.listarPorExamen.mockResolvedValue({
      total: 1,
      propuestas: [
        propuesta({
          estado: 'error',
          puntaje_sugerido: null,
          error_codigo: 'PROVEEDOR_ERROR',
          error_mensaje: 'El proveedor no pudo procesar la respuesta.',
        }),
      ],
    });

    await cargarPantalla();
    expect(
      screen.getByText('El proveedor no pudo procesar la respuesta.'),
    ).toBeDefined();
    expect(screen.getByRole('heading', {
      name: 'Resultado provisional (generado con IA)',
    })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Regenerar' }));

    expect(await screen.findByText('La propuesta está pendiente de procesamiento.')).toBeDefined();
    expect(mocks.regenerar).toHaveBeenCalledWith(12, 8, 31, 'a');
  });

  it('recupera varias propuestas con una sola consulta de bandeja por examen y estudiante', async () => {
    mocks.detalle.mockResolvedValue(
      detalle({
        preguntas: [
          {
            pregunta_id: 31,
            orden: 1,
            enunciado: 'Resuelve la ecuación.',
            puntaje_maximo_evaluacion: 10,
            incisos: [inciso(), inciso({ letra: 'b' })],
          },
        ],
      }),
    );
    mocks.listarPorExamen.mockResolvedValue({
      total: 2,
      propuestas: [
        propuesta(),
        propuesta({
          propuesta_id: 78,
          letra: 'b',
          estado: 'procesando',
          puntaje_sugerido: null,
        }),
      ],
    });

    await cargarPantalla();
    expect(
      await screen.findAllByRole('heading', {
        name: 'Resultado provisional (generado con IA)',
      }),
    ).toHaveLength(2);
    expect(mocks.listarPorExamen).toHaveBeenCalledTimes(1);
    expect(mocks.listarPorExamen).toHaveBeenCalledWith(12, {
      estudiante_id: 8,
      limite: 200,
      desplazamiento: 0,
    });
  });

  it('mantiene disponible la revisión manual si falla la recuperación de propuestas IA', async () => {
    mocks.listarPorExamen.mockRejectedValue(
      new Error('No fue posible recuperar las propuestas.'),
    );

    await cargarPantalla();

    expect(
      await screen.findByText('No fue posible recuperar las propuestas.'),
    ).toBeDefined();
    expect(screen.getByLabelText('Puntaje asignado')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Sugerir con IA' })).toBeNull();
  });

  it('limpia el temporizador de sondeo al desmontar la tarjeta', async () => {
    vi.useFakeTimers();
    const tarjeta = render(
      <PropuestaCorreccionIa
        propuesta={propuesta({ estado: 'procesando' })}
        bloqueado={false}
        onAceptada={() => undefined}
      />,
    );

    tarjeta.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mocks.obtenerDetalle).not.toHaveBeenCalled();
  });

  it('mantiene visibles las propuestas provisionales y deshabilita acciones al cerrar la revisión', async () => {
    mocks.detalle.mockResolvedValue(
      detalle({ calificaciones_revisadas_en: '2026-06-25T11:00:00.000Z' }),
    );
    mocks.listarPorExamen.mockResolvedValue({
      total: 1,
      propuestas: [propuesta()],
    });

    render(<RevisionEstudiante examenId={12} estudianteId={8} />);

    expect(
      await screen.findByRole('heading', {
        name: 'Resultado provisional (generado con IA)',
      }),
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Sugerir con IA' })).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Aceptar' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Modificar' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Descartar' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});



describe('propuesta modificada', () => {
  it('no ofrece «Modificar» de nuevo (el backend solo lo permite en estado generada) pero sí aceptar y descartar', async () => {
    mocks.listarPorExamen.mockResolvedValue({
      total: 1,
      propuestas: [propuesta({ estado: 'modificada', puntaje_sugerido: '3.00' })],
    });
    await cargarPantalla();

    await screen.findByRole('button', { name: 'Aceptar' });
    expect(screen.queryByRole('button', { name: 'Modificar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeDefined();
  });
});
