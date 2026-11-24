import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  BandejaCorreccionesIaResponse,
  CorreccionIa,
} from '../correccion-ia.types';
import BandejaCorreccionesIa from './BandejaCorreccionesIa';

const mocks = vi.hoisted(() => ({
  listarPorExamen: vi.fn(),
  aceptar: vi.fn(),
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

vi.mock('../services/correccion-ia.service', () => ({
  correccionIaService: {
    listarPorExamen: mocks.listarPorExamen,
    aceptar: mocks.aceptar,
  },
  mensajeErrorCorreccionIa: (error: unknown) =>
    error instanceof Error ? error.message : 'Error al cargar propuestas.',
}));

function propuesta(
  cambios: Partial<CorreccionIa> = {},
): CorreccionIa {
  return {
    propuesta_id: 7,
    examen_id: 12,
    estudiante_id: 45,
    pregunta_id: 31,
    letra: 'a',
    estado: 'generada',
    puntaje_sugerido: '4.25',
    puntaje_max_inciso: '5.00',
    valoracion: 'Respuesta correcta en lo esencial.',
    explicacion: 'Aplicó el procedimiento esperado.',
    errores: [],
    confianza: '0.90',
    criterio_fuente: 'solucion_referencia',
    criterio_hash: 'abc123',
    modelo: 'fake',
    proveedor: 'fake',
    intento: 1,
    version: 1,
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

function respuesta(
  propuestas: CorreccionIa[] = [propuesta()],
  total = propuestas.length,
): BandejaCorreccionesIaResponse {
  return { total, propuestas };
}

beforeEach(() => {
  mocks.aceptar.mockReset().mockResolvedValue({ propuesta: { estado: 'aceptada' }, advertencias: [] });
  mocks.listarPorExamen.mockReset().mockResolvedValue(respuesta());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('BandejaCorreccionesIa', () => {
  it('muestra propuestas provisionales con estado, puntaje sugerido y acceso al inciso, sin acciones de decisión', async () => {
    render(<BandejaCorreccionesIa examenId={12} />);

    expect(
      await screen.findByText('Resultado provisional (generado con IA)'),
    ).toBeDefined();
    expect(screen.getAllByText('Generada').length).toBeGreaterThan(0);
    expect(screen.getByText('Espera decisión docente')).toBeDefined();
    expect(
      screen.getByText('Puntaje sugerido: 4.25 / 5.00'),
    ).toBeDefined();
    expect(
      screen.getByRole('link', { name: 'Abrir inciso →' }).getAttribute('href'),
    ).toBe(
      '/docente/evaluaciones/12/calificaciones/45#revision-31-a',
    );
    expect(screen.queryByRole('button', { name: 'Aceptar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modificar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
  });

  it('envía filtros por estado, estudiante y revisión pendiente al endpoint de bandeja', async () => {
    render(<BandejaCorreccionesIa examenId={12} />);
    await screen.findByText('Resultado provisional (generado con IA)');

    fireEvent.change(screen.getByLabelText('Filtrar propuestas por estado'), {
      target: { value: 'error' },
    });
    await waitFor(() =>
      expect(mocks.listarPorExamen).toHaveBeenLastCalledWith(
        12,
        expect.objectContaining({ estado: 'error', desplazamiento: 0 }),
      ),
    );

    fireEvent.change(screen.getByLabelText('Filtrar propuestas por estudiante'), {
      target: { value: '45' },
    });
    fireEvent.change(screen.getByLabelText('Filtrar propuestas por estado'), {
      target: { value: 'generada' },
    });
    fireEvent.click(screen.getByLabelText('Solo pendientes de revisión'));

    await waitFor(() =>
      expect(mocks.listarPorExamen).toHaveBeenLastCalledWith(
        12,
        expect.objectContaining({
          estado: 'generada',
          estudiante_id: 45,
          solo_pendientes_revision: true,
          desplazamiento: 0,
        }),
      ),
    );
  });

  it('página los resultados usando el desplazamiento del servicio', async () => {
    mocks.listarPorExamen.mockResolvedValue(respuesta([propuesta()], 25));
    render(<BandejaCorreccionesIa examenId={12} />);
    await screen.findByText('Resultado provisional (generado con IA)');

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() =>
      expect(mocks.listarPorExamen).toHaveBeenLastCalledWith(
        12,
        expect.objectContaining({ limite: 10, desplazamiento: 10 }),
      ),
    );
    expect(await screen.findByText('Página 2 de 3')).toBeDefined();
  });

  it('muestra estado vacío cuando no hay propuestas', async () => {
    mocks.listarPorExamen.mockResolvedValue(respuesta([], 0));
    render(<BandejaCorreccionesIa examenId={12} />);

    expect(
      await screen.findByText('No hay propuestas que coincidan con los filtros.'),
    ).toBeDefined();
  });

  it('expone el error de carga y permite reintentar', async () => {
    mocks.listarPorExamen
      .mockRejectedValueOnce(new Error('No fue posible cargar propuestas IA.'))
      .mockResolvedValueOnce(respuesta());
    render(<BandejaCorreccionesIa examenId={12} />);

    expect(
      await screen.findByText('No fue posible cargar propuestas IA.'),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByText('Resultado provisional (generado con IA)'),
    ).toBeDefined();
    expect(mocks.listarPorExamen).toHaveBeenCalledTimes(2);
  });

  it('actualiza durante el lote y limpia el temporizador al desmontar', async () => {
    vi.useFakeTimers();
    mocks.listarPorExamen
      .mockResolvedValueOnce(
        respuesta([propuesta({ estado: 'procesando', puntaje_sugerido: null })]),
      )
      .mockResolvedValueOnce(
        respuesta([propuesta({ estado: 'procesando', puntaje_sugerido: null })]),
      );
    const alFinalizar = vi.fn();
    const bandeja = render(
      <BandejaCorreccionesIa
        examenId={12}
        seguimientoLote
        onSeguimientoFinalizado={alFinalizar}
      />,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mocks.listarPorExamen).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(mocks.listarPorExamen).toHaveBeenCalledTimes(2);
    expect(alFinalizar).not.toHaveBeenCalled();
    expect(screen.getAllByText('En proceso').length).toBeGreaterThan(0);

    bandeja.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mocks.listarPorExamen).toHaveBeenCalledTimes(2);
  });

  it('refleja el estado generado al siguiente sondeo y finaliza el seguimiento', async () => {
    vi.useFakeTimers();
    mocks.listarPorExamen
      .mockResolvedValueOnce(
        respuesta([propuesta({ estado: 'procesando', puntaje_sugerido: null })]),
      )
      .mockResolvedValueOnce(respuesta([propuesta({ estado: 'generada' })]));
    const alFinalizar = vi.fn();
    render(
      <BandejaCorreccionesIa
        examenId={12}
        seguimientoLote
        onSeguimientoFinalizado={alFinalizar}
      />,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(mocks.listarPorExamen).toHaveBeenCalledTimes(2);
    expect(alFinalizar).toHaveBeenCalledOnce();
    expect(screen.getAllByText('Generada').length).toBeGreaterThan(0);
  });
});




describe('aceptación desde la bandeja', () => {
  it('acepta solo las propuestas seleccionadas con su versión y puntaje', async () => {
    const lista = [
      propuesta({ propuesta_id: 1, version: 2 }),
      propuesta({ propuesta_id: 2, pregunta_id: 32, puntaje_sugerido: '3.00' }),
    ];
    mocks.listarPorExamen.mockResolvedValue(respuesta(lista));
    const alAceptar = vi.fn();
    render(<BandejaCorreccionesIa examenId={12} onPropuestasAceptadas={alAceptar} />);

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar propuesta 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar seleccionadas (1)' }));

    await waitFor(() => expect(mocks.aceptar).toHaveBeenCalledTimes(1));
    expect(mocks.aceptar).toHaveBeenCalledWith(1, { version: 2, puntaje_confirmado: '4.25' });
    const resultado = await screen.findByRole('status', { name: 'Resultado de la aceptación' });
    expect(resultado.textContent).toContain('Aceptadas: 1');
    expect(alAceptar).toHaveBeenCalledTimes(1);
  });

  it('el botón de seleccionadas está deshabilitado sin selección', async () => {
    render(<BandejaCorreccionesIa examenId={12} />);
    const boton = await screen.findByRole('button', { name: 'Aceptar seleccionadas (0)' });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
  });

  it('acepta una propuesta con su botón individual', async () => {
    render(<BandejaCorreccionesIa examenId={12} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar propuesta 7' }));
    await waitFor(() => expect(mocks.aceptar).toHaveBeenCalledWith(7, { version: 1, puntaje_confirmado: '4.25' }));
  });

  it('no ofrece selección de propuestas con error, pendientes ni sin puntaje', async () => {
    mocks.listarPorExamen.mockResolvedValue(
      respuesta([
        propuesta({ propuesta_id: 1, estado: 'error', puntaje_sugerido: null, error_mensaje: 'fallo' }),
        propuesta({ propuesta_id: 2, estado: 'procesando', puntaje_sugerido: null }),
        propuesta({ propuesta_id: 3, estado: 'aceptada' }),
      ]),
    );
    render(<BandejaCorreccionesIa examenId={12} />);

    await screen.findByText('fallo');
    expect(screen.queryAllByRole('checkbox', { name: /Seleccionar propuesta/ })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^Aceptar propuesta/ })).toBeNull();
  });

  it('«Aceptar todas» pide confirmación, excluye criterio predeterminado y no toca errores', async () => {
    mocks.listarPorExamen.mockImplementation(async (_examen: number, filtros: { estado?: string }) => {
      if (filtros.estado === 'generada') {
        return respuesta([
          propuesta({ propuesta_id: 1 }),
          propuesta({ propuesta_id: 2, criterio_fuente: 'predeterminado' }),
        ]);
      }
      if (filtros.estado === 'modificada') {
        return respuesta([propuesta({ propuesta_id: 3, estado: 'modificada', puntaje_sugerido: '2.00' })]);
      }
      return respuesta([propuesta()]);
    });
    render(<BandejaCorreccionesIa examenId={12} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar todas las listas' }));
    const confirmacion = await screen.findByRole('region', { name: 'Confirmar aceptación de todas las propuestas' });
    expect(confirmacion.textContent).toContain('2');
    expect(confirmacion.textContent).toContain('criterio predeterminado');
    expect(mocks.aceptar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y aceptar 2' }));

    await waitFor(() => expect(mocks.aceptar).toHaveBeenCalledTimes(2));
    expect(mocks.aceptar.mock.calls.map((llamada) => llamada[0]).sort()).toEqual([1, 3]);
  });

  it('cancelar la confirmación no acepta nada', async () => {
    render(<BandejaCorreccionesIa examenId={12} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aceptar todas las listas' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(mocks.aceptar).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: /Confirmar aceptación/ })).toBeNull();
  });

  it('informa las que fallan sin detener las demás', async () => {
    mocks.listarPorExamen.mockResolvedValue(
      respuesta([propuesta({ propuesta_id: 1 }), propuesta({ propuesta_id: 2, pregunta_id: 32 })]),
    );
    mocks.aceptar
      .mockRejectedValueOnce(new Error('La propuesta cambió; recárgala.'))
      .mockResolvedValueOnce({ propuesta: { estado: 'aceptada' }, advertencias: [] });
    render(<BandejaCorreccionesIa examenId={12} />);

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar propuesta 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar propuesta 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar seleccionadas (2)' }));

    const resultado = await screen.findByRole('status', { name: 'Resultado de la aceptación' });
    expect(resultado.textContent).toContain('Aceptadas: 1');
    expect(resultado.textContent).toContain('No aceptadas: 1');
    expect(resultado.textContent).toContain('La propuesta cambió; recárgala.');
  });

  it('en solo lectura no muestra ninguna acción de aceptación', async () => {
    render(<BandejaCorreccionesIa examenId={12} soloLectura />);
    await screen.findByText(/Estudiante #45/);
    expect(screen.queryByRole('button', { name: /Aceptar/ })).toBeNull();
    expect(screen.queryAllByRole('checkbox', { name: /Seleccionar propuesta/ })).toHaveLength(0);
  });
});
