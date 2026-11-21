import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type {
  BandejaCorreccionesIaResponse,
  CorreccionIa,
} from '../correccion-ia.types';
import type { ResumenCalificaciones } from '../calificaciones.types';
import RevisionCalificaciones from './RevisionCalificaciones';

const mocks = vi.hoisted(() => ({
  resumen: vi.fn(),
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

vi.mock('../services/calificaciones.service', () => ({
  calificacionesService: {
    resumen: mocks.resumen,
  },
  mensajeErrorCalificaciones: () => 'Error de calificaciones',
}));

vi.mock('../services/correccion-ia.service', () => ({
  correccionIaService: { listarPorExamen: mocks.listarPorExamen },
  mensajeErrorCorreccionIa: () => 'Error de propuestas',
}));

vi.mock('./CorreoResultadosPanel', () => ({ default: () => null }));

function resumen(): ResumenCalificaciones {
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
  mocks.resumen.mockReset().mockResolvedValue(resumen());
  const respuesta: BandejaCorreccionesIaResponse = {
    total: 1,
    propuestas: [propuesta()],
  };
  mocks.listarPorExamen.mockReset().mockResolvedValue(respuesta);
});

afterEach(() => {
  cleanup();
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
