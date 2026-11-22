import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/lib/axios/client', () => ({
  default: {
    get: mocks.get,
    post: mocks.post,
    patch: mocks.patch,
  },
}));

import {
  correccionIaService,
  mensajeErrorCorreccionIa,
} from './correccion-ia.service';

const propuesta = {
  propuesta_id: 42,
  examen_id: 12,
  estudiante_id: 7,
  pregunta_id: 21,
  letra: 'a',
  estado: 'generada',
  puntaje_sugerido: '3.50',
  puntaje_max_inciso: '5.00',
  valoracion: 'Parcialmente correcta',
  explicacion: 'Falta justificar un paso.',
  errores: [],
  confianza: '0.85',
  criterio_fuente: 'rubrica',
  criterio_hash: 'abc',
  modelo: 'fake',
  proveedor: 'fake',
  intento: 1,
  version: 2,
  creada_en: '2026-11-21T12:00:00.000Z',
  iniciada_en: '2026-11-21T12:00:01.000Z',
  finalizada_en: '2026-11-21T12:00:02.000Z',
  actualizada_en: '2026-11-21T12:00:02.000Z',
  revisada_en: null,
  revisada_por_docente_id: null,
  reemplazada_por_id: null,
  error_codigo: null,
  error_mensaje: null,
  motivo: null,
};

function errorHttp(status: number, codigo?: string) {
  return Object.assign(new Error('Error HTTP'), {
    isAxiosError: true,
    response: {
      status,
      data: codigo ? { codigo } : {},
    },
  });
}

describe('correccionIaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: propuesta });
    mocks.post.mockResolvedValue({ data: propuesta });
    mocks.patch.mockResolvedValue({ data: propuesta });
  });

  it('regenera una propuesta con POST en la ruta de regeneración', async () => {
    await correccionIaService.regenerar(12, 7, 21, 'b');

    expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
      '/examenes/12/calificaciones/7/respuestas/21/b/ia/regenerar',
      undefined,
      undefined,
    );
  });

  it('solicita la revisión en lote con POST sin cuerpo', async () => {
    const respuesta = {
      solicitadas: 2,
      omitidas: 1,
      detalle_omitidas: [
        {
          estudiante_id: 8,
          pregunta_id: 31,
          letra: 'a',
          motivo: 'La rendición no está enviada.',
        },
      ],
    };
    mocks.post.mockResolvedValueOnce({ data: respuesta });

    await expect(correccionIaService.revisarTodo(12)).resolves.toEqual(
      respuesta,
    );
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
      '/examenes/12/correcciones-ia/lote',
      undefined,
      undefined,
    );
  });

  it('consulta la bandeja del examen con filtros como query params', async () => {
    const filtros = {
      estado: 'generada' as const,
      estudiante_id: 7,
      pregunta_id: 21,
      solo_pendientes_revision: true,
      limite: 20,
      desplazamiento: 10,
    };

    await correccionIaService.listarPorExamen(12, filtros);

    expect(mocks.get).toHaveBeenCalledExactlyOnceWith(
      '/examenes/12/correcciones-ia',
      { params: filtros },
    );
  });

  it('obtiene el detalle por propuesta', async () => {
    await correccionIaService.obtenerDetalle(42);

    expect(mocks.get).toHaveBeenCalledExactlyOnceWith(
      '/correcciones-ia/42',
      undefined,
    );
  });

  it('modifica la propuesta con PATCH y solo los campos editables', async () => {
    const cambios = {
      puntaje: 3.5,
      valoracion: 'Correcta',
      explicacion: 'Justifica el resultado.',
      errores: [{ tipo: 'omision', descripcion: 'Faltó un paso.' }],
    };

    await correccionIaService.modificar(42, cambios);

    expect(mocks.patch).toHaveBeenCalledExactlyOnceWith(
      '/correcciones-ia/42',
      cambios,
      undefined,
    );
  });

  it('descarta la propuesta con el motivo opcional', async () => {
    const cuerpo = { motivo: 'Revisaré el criterio antes de aceptarla.' };

    await correccionIaService.descartar(42, cuerpo);

    expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
      '/correcciones-ia/42/descartar',
      cuerpo,
      undefined,
    );
  });

  it('acepta la propuesta con versión, puntaje confirmado y respuesta de aceptación', async () => {
    const entrada = {
      version: 2,
      puntaje_confirmado: '3.50',
      retroalimentacion: 'Revisa la justificación.',
    };
    const respuesta = {
      propuesta: { propuesta_id: 42, estado: 'aceptada' },
      calificacion: {
        puntaje_obtenido: '3.50',
        estado_correccion: 'manual',
        nota_final: '7.20',
        estado_rendicion: 'corregida',
        pendientes_revision: 0,
      },
      advertencias: [
        {
          codigo: 'CRITERIO_ACTUALIZADO',
          mensaje: 'El criterio del inciso cambió.',
        },
      ],
    };
    mocks.post.mockResolvedValueOnce({ data: respuesta });

    await expect(correccionIaService.aceptar(42, entrada)).resolves.toEqual(
      respuesta,
    );
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
      '/correcciones-ia/42/aceptar',
      entrada,
      undefined,
    );
  });
});

describe('mensajeErrorCorreccionIa', () => {
  it.each([
    {
      status: 400,
      codigo: 'SIN_CRITERIOS',
      mensaje:
        'No hay criterios suficientes para corregir esta respuesta. Revisa la solución o la rúbrica del inciso.',
    },
    {
      status: 404,
      codigo: 'PROPUESTA_NO_ENCONTRADA',
      mensaje: 'No se encontró la propuesta o no tienes acceso a ella.',
    },
    {
      status: 409,
      codigo: 'PROPUESTA_DESACTUALIZADA',
      mensaje:
        'La propuesta cambió desde que la consultaste. Actualiza la información e inténtalo de nuevo.',
    },
  ])(
    'traduce $status $codigo a un mensaje para el docente',
    ({ status, codigo, mensaje }) => {
      expect(mensajeErrorCorreccionIa(errorHttp(status, codigo))).toBe(mensaje);
    },
  );

  it('usa un mensaje en español según el estado cuando el código es desconocido', () => {
    expect(mensajeErrorCorreccionIa(errorHttp(409))).toBe(
      'La propuesta cambió o su estado ya no permite esta acción. Actualiza la información e inténtalo de nuevo.',
    );
  });
});
