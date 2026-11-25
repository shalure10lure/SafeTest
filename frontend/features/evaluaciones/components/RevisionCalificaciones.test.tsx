import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type {
  BandejaCorreccionesIaResponse,
  CorreccionIa,
} from '../correccion-ia.types';
import type { ResumenCalificaciones } from '../calificaciones.types';
import type { ResultadoLoteCorreccionIa } from '../correccion-ia.types';
import RevisionCalificaciones from './RevisionCalificaciones';

const mocks = vi.hoisted(() => ({
  resumen: vi.fn(),
  listarPorExamen: vi.fn(),
  revisarTodo: vi.fn(),
  revisarEstudiante: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
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

vi.mock('../services/calificaciones.service', () => ({
  calificacionesService: {
    resumen: mocks.resumen,
  },
  mensajeErrorCalificaciones: () => 'Error de calificaciones',
}));

vi.mock('../services/correccion-ia.service', () => ({
  correccionIaService: {
    listarPorExamen: mocks.listarPorExamen,
    revisarTodo: mocks.revisarTodo,
    revisarEstudiante: mocks.revisarEstudiante,
  },
  mensajeErrorCorreccionIa: () => 'Error de propuestas',
}));

vi.mock('./CorreoResultadosPanel', () => ({ default: () => null }));

function resumen(
  cambios: Partial<ResumenCalificaciones> = {},
): ResumenCalificaciones {
  return {
    examen_id: 12,
    titulo: 'Evaluación publicada',
    puntaje_total: '5.00',
    calificaciones_revisadas_en: '2026-06-25T10:00:00.000Z',
    resultados_publicados_en: '2026-06-25T11:00:00.000Z',
    respuestas_publicadas_en: null,
    disponible_hasta: '2026-06-24T11:00:00.000Z',
    total_rendiciones: 1,
    total_listas: 1,
    total_pendientes: 0,
    estudiantes: [
      {
        estudiante_id: 45,
        nombre_completo: 'Estudiante de prueba',
        estado: 'corregida',
        nota_final: '4.25',
        fecha_envio: null,
        total_incisos: 1,
        pendientes_revision: 0,
        lista_para_publicar: true,
      },
    ],
    ...cambios,
  };
}

function propuesta(): CorreccionIa {
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
  };
}

beforeEach(() => {
  mocks.push.mockReset();
  mocks.revisarEstudiante.mockReset().mockResolvedValue({
    solicitadas: 1,
    omitidas: 0,
    detalle_omitidas: [],
  });
  mocks.resumen.mockReset().mockResolvedValue(resumen());
  mocks.revisarTodo.mockReset().mockResolvedValue({
    solicitadas: 0,
    omitidas: 0,
    detalle_omitidas: [],
  });
  const respuesta: BandejaCorreccionesIaResponse = {
    total: 1,
    propuestas: [propuesta()],
  };
  mocks.listarPorExamen.mockReset().mockResolvedValue(respuesta);
});

afterEach(() => {
  cleanup();
});

it('solicita el lote y muestra cuántas se omitieron y el motivo en español', async () => {
  mocks.resumen.mockResolvedValue(
    resumen({
      calificaciones_revisadas_en: null,
      resultados_publicados_en: null,
    }),
  );
  mocks.revisarTodo.mockResolvedValueOnce({
    solicitadas: 2,
    omitidas: 1,
    detalle_omitidas: [
      {
        estudiante_id: 46,
        pregunta_id: 32,
        letra: 'b',
        motivo: 'La rendición no está enviada.',
      },
    ],
  });
  render(<RevisionCalificaciones examenId={12} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Revisar todo con IA' }));

  expect(mocks.revisarTodo).toHaveBeenCalledExactlyOnceWith(12);
  const resumenLote = await screen.findByRole('status', {
    name: 'Resumen de solicitudes de corrección IA',
  });
  await waitFor(() => {
    expect(resumenLote.textContent).toContain(
      'Solicitadas: 2 · Omitidas: 1',
    );
    expect(resumenLote.textContent).toContain(
      'Estudiante #46, pregunta #32, inciso b: La rendición no está enviada.',
    );
  });
});

it('deshabilita el botón mientras se solicita el lote', async () => {
  mocks.resumen.mockResolvedValue(
    resumen({
      calificaciones_revisadas_en: null,
      resultados_publicados_en: null,
    }),
  );
  let finalizarLote!: (resultado: ResultadoLoteCorreccionIa) => void;
  mocks.revisarTodo.mockReturnValueOnce(
    new Promise<ResultadoLoteCorreccionIa>((resolve) => {
      finalizarLote = resolve;
    }),
  );
  render(<RevisionCalificaciones examenId={12} />);

  const boton = await screen.findByRole('button', {
    name: 'Revisar todo con IA',
  });
  fireEvent.click(boton);

  expect((boton as HTMLButtonElement).disabled).toBe(true);
  expect(
    screen.getByRole('button', { name: 'Solicitando…' }),
  ).toBeDefined();
  await act(async () => {
    finalizarLote({ solicitadas: 0, omitidas: 0, detalle_omitidas: [] });
  });
  await screen.findByRole('status', {
    name: 'Resumen de solicitudes de corrección IA',
  });
});

it('oculta la solicitud por lote cuando la revisión está cerrada', async () => {
  mocks.resumen.mockResolvedValue(
    resumen({
      calificaciones_revisadas_en: '2026-06-25T10:00:00.000Z',
      resultados_publicados_en: null,
    }),
  );
  render(<RevisionCalificaciones examenId={12} />);

  await screen.findByRole('heading', {
    name: 'Revisión general de resultados',
  });
  expect(
    screen.queryByRole('button', { name: 'Revisar todo con IA' }),
  ).toBeNull();
  expect(mocks.revisarTodo).not.toHaveBeenCalled();
});

it('sigue mostrando la bandeja histórica, solo de lectura, tras confirmar y publicar resultados', async () => {
  render(<RevisionCalificaciones examenId={12} />);

  expect(
    await screen.findByText('Resultado provisional (generado con IA)'),
  ).toBeDefined();
  expect(
    (screen.getByRole('button', { name: 'Resultados publicados' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByRole('link', { name: 'Abrir inciso →' })).toBeDefined();
  expect(screen.queryByRole('button', { name: 'Aceptar' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Modificar' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
});




const pendiente = () =>
  resumen({
    calificaciones_revisadas_en: null,
    resultados_publicados_en: null,
    total_pendientes: 1,
    estudiantes: [
      {
        estudiante_id: 46,
        nombre_completo: 'Ana Pérez',
        estado: 'enviada',
        nota_final: null,
        fecha_envio: null,
        total_incisos: 2,
        pendientes_revision: 2,
        lista_para_publicar: false,
      },
    ],
  });

it('muestra «Revisar con IA» junto a «Revisar resultado» y envía el estudiante_id', async () => {
  mocks.resumen.mockResolvedValue(pendiente());
  render(<RevisionCalificaciones examenId={12} />);

  const ia = await screen.findByRole('button', { name: /Revisar con IA/ });
  const enlace = screen.getByRole('link', { name: /Revisar resultado/ });
  expect(enlace.parentElement).toBe(ia.parentElement);

  fireEvent.click(ia);

  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/docente/evaluaciones/12/calificaciones/46'));
  expect(mocks.revisarEstudiante).toHaveBeenCalledExactlyOnceWith(12, 46);
  expect(mocks.revisarTodo).not.toHaveBeenCalled();
});

it('no ofrece «Revisar con IA» por estudiante si no hay pendientes o la revisión está cerrada', async () => {
  mocks.resumen.mockResolvedValue(resumen());
  render(<RevisionCalificaciones examenId={12} />);
  await screen.findByRole('link', { name: /Revisar resultado/ });
  expect(screen.queryByRole('button', { name: /Revisar con IA/ })).toBeNull();
});

it('no navega y explica el motivo cuando la IA no pudo solicitar nada', async () => {
  mocks.resumen.mockResolvedValue(pendiente());
  mocks.revisarEstudiante.mockResolvedValue({
    solicitadas: 0,
    omitidas: 1,
    detalle_omitidas: [
      { estudiante_id: 46, pregunta_id: 1, letra: 'a', motivo: 'No hay un valor correcto finito.' },
    ],
  });
  render(<RevisionCalificaciones examenId={12} />);

  fireEvent.click(await screen.findByRole('button', { name: /Revisar con IA/ }));

  const alerta = await screen.findByRole('alert');
  expect(alerta.textContent).toContain('No hay un valor correcto finito.');
  expect(mocks.push).not.toHaveBeenCalled();
});

it('abre la revisión si solo había propuestas activas ya existentes', async () => {
  mocks.resumen.mockResolvedValue(pendiente());
  mocks.revisarEstudiante.mockResolvedValue({
    solicitadas: 0,
    omitidas: 1,
    detalle_omitidas: [
      { estudiante_id: 46, pregunta_id: 1, letra: 'a', motivo: 'Ya existe una propuesta activa.' },
    ],
  });
  render(<RevisionCalificaciones examenId={12} />);

  fireEvent.click(await screen.findByRole('button', { name: /Revisar con IA/ }));

  await waitFor(() => expect(mocks.push).toHaveBeenCalled());
});
