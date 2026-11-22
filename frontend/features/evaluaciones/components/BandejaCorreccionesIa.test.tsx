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
  correccionIaService: { listarPorExamen: mocks.listarPorExamen },
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
