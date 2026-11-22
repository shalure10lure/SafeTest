import {
  ErrorValidacionCorreccionIa,
  validarResultadoCorreccionIa,
  validarSolicitudCorreccionIa,
} from './correccionia.validacion';
import type {
  EntradaValidacionResultadoCorreccionIa,
  EntradaValidacionSolicitudCorreccionIa,
} from './correccionia.validacion';

const solicitudValida: EntradaValidacionSolicitudCorreccionIa = {
  estado_correccion: 'pendiente',
  estado_rendicion: 'enviada',
  puntaje_obtenido: null,
  tipo_respuesta: 'desarrollo',
  respuesta_texto: 'Explicación del estudiante',
  opciones_marcadas: 0,
  puntaje_max: '10.00',
  solucion_inciso: {
    valor_correcto: '10',
    rubrica: 'Incluye el razonamiento y la conclusión.',
  },
};

const resultadoValido: EntradaValidacionResultadoCorreccionIa = {
  puntaje_max: '10.00',
  puntaje_sugerido: '5.00',
  confianza: '0.75',
};

function esperarError(
  validar: () => void,
  codigo: string,
  motivo: string,
): void {
  let error: unknown;
  try {
    validar();
  } catch (capturado) {
    error = capturado;
  }

  expect(error).toBeInstanceOf(ErrorValidacionCorreccionIa);
  expect(error).toMatchObject({
    codigo,
    motivo: expect.stringContaining(motivo),
  });
}

describe('validarSolicitudCorreccionIa', () => {
  it('acepta solicitud pendiente sin puntaje sugerido ni confianza', () => {
    expect(() => validarSolicitudCorreccionIa(solicitudValida)).not.toThrow();
  });

  it.each(['automatica', 'manual', 'revisada'])(
    'rechaza un inciso ya corregido en estado %s con puntaje oficial',
    (estado_correccion) => {
      esperarError(
        () =>
          validarSolicitudCorreccionIa({
            ...solicitudValida,
            estado_correccion,
            puntaje_obtenido: '5.00',
          }),
        'INCISO_NO_PENDIENTE',
        'pendiente de revisión manual',
      );
    },
  );

  it.each([null, undefined, ''])(
    'acepta un inciso sin puntaje aunque el estado no sea pendiente (%s)',
    (puntaje_obtenido) => {
      expect(() =>
        validarSolicitudCorreccionIa({
          ...solicitudValida,
          estado_correccion: 'automatica',
          puntaje_obtenido,
        }),
      ).not.toThrow();
    },
  );

  it('acepta puntaje oficial igual a cero como inciso ya corregido', () => {
    esperarError(
      () =>
        validarSolicitudCorreccionIa({
          ...solicitudValida,
          estado_correccion: 'manual',
          puntaje_obtenido: '0',
        }),
      'INCISO_NO_PENDIENTE',
      'pendiente de revisión manual',
    );
  });

  it.each(['en_curso', 'anulada'])(
    'rechaza una rendición en estado %s',
    (estado_rendicion) => {
      esperarError(
        () =>
          validarSolicitudCorreccionIa({
            ...solicitudValida,
            estado_rendicion,
          }),
        'RENDICION_NO_ENVIADA',
        'enviada o corregida',
      );
    },
  );

  it.each(['enviada', 'corregida'])(
    'acepta una rendición en estado %s',
    (estado_rendicion) => {
      expect(() =>
        validarSolicitudCorreccionIa({ ...solicitudValida, estado_rendicion }),
      ).not.toThrow();
    },
  );

  it.each([
    ['texto vacío', { tipo_respuesta: 'desarrollo', respuesta_texto: '   ' }],
    [
      'opciones sin marcar',
      {
        tipo_respuesta: 'opcion_multiple',
        respuesta_texto: null,
        opciones_marcadas: 0,
      },
    ],
  ])('rechaza %s con el código RESPUESTA_VACIA', (_, cambios) => {
    esperarError(
      () => validarSolicitudCorreccionIa({ ...solicitudValida, ...cambios }),
      'RESPUESTA_VACIA',
      'vacía',
    );
  });

  it('acepta soluciones existentes y referencias revisadas como criterios', () => {
    expect(() =>
      validarSolicitudCorreccionIa({
        ...solicitudValida,
        tipo_respuesta: 'numerica',
        respuesta_texto: '12',
        solucion_inciso: { valor_correcto: '12', rubrica: '' },
      }),
    ).not.toThrow();
    expect(() =>
      validarSolicitudCorreccionIa({
        ...solicitudValida,
        solucion_inciso: null,
        solucion_referencia: {
          revisada_en: new Date('2026-01-01T00:00:00.000Z'),
        },
      }),
    ).not.toThrow();
  });

  it('permite desarrollo sin criterios: se usa el criterio predeterminado', () => {
    expect(() =>
      validarSolicitudCorreccionIa({
        ...solicitudValida,
        tipo_respuesta: 'desarrollo',
        solucion_inciso: { valor_correcto: null, rubrica: '  ' },
        solucion_referencia: null,
      }),
    ).not.toThrow();
  });

  it('rechaza criterios insuficientes con un motivo comprensible', () => {
    esperarError(
      () =>
        validarSolicitudCorreccionIa({
          ...solicitudValida,
          tipo_respuesta: 'numerica',
          respuesta_texto: '42',
          solucion_inciso: {
            valor_correcto: 'no numérico',
            rubrica: '  ',
          },
          solucion_referencia: { revisada_en: null },
        }),
      'SIN_CRITERIOS',
      'rúbrica',
    );
  });

  it('rechaza un puntaje máximo inválido al solicitar la propuesta', () => {
    esperarError(
      () =>
        validarSolicitudCorreccionIa({
          ...solicitudValida,
          puntaje_max: 'Infinity',
        }),
      'PUNTAJE_MAX_INVALIDO',
      'finito mayor que 0',
    );
  });
});

describe('validarResultadoCorreccionIa', () => {
  it('acepta puntajes en ambos límites y confianza en ambos límites', () => {
    expect(() =>
      validarResultadoCorreccionIa({
        ...resultadoValido,
        puntaje_sugerido: '0',
        confianza: '0',
      }),
    ).not.toThrow();
    expect(() =>
      validarResultadoCorreccionIa({
        ...resultadoValido,
        puntaje_sugerido: '10',
        confianza: '1',
      }),
    ).not.toThrow();
  });

  it('acepta puntaje sugerido con hasta 2 decimales', () => {
    for (const puntaje_sugerido of ['5', '5.1', '5.01', 7.25]) {
      expect(() =>
        validarResultadoCorreccionIa({ ...resultadoValido, puntaje_sugerido }),
      ).not.toThrow();
    }
  });

  it.each(['5.001', '0.001', 9.999])(
    '[I14] rechaza puntaje sugerido con 3 decimales (%s)',
    (puntaje_sugerido) => {
      esperarError(
        () =>
          validarResultadoCorreccionIa({
            ...resultadoValido,
            puntaje_sugerido,
          }),
        'PUNTAJE_FUERA_DE_RANGO',
        'máximo 2 decimales',
      );
    },
  );

  it('acepta confianza nula', () => {
    expect(() =>
      validarResultadoCorreccionIa({ ...resultadoValido, confianza: null }),
    ).not.toThrow();
  });

  it.each([
    ['cero', '0'],
    ['negativo', '-1'],
    ['no finito', 'Infinity'],
    ['no numérico', 'abc'],
    ['vacío', ' '],
  ])('[I14] rechaza puntaje máximo %s', (_, puntaje_max) => {
    esperarError(
      () =>
        validarResultadoCorreccionIa({
          ...resultadoValido,
          puntaje_max,
        }),
      'PUNTAJE_MAX_INVALIDO',
      'finito mayor que 0',
    );
  });

  it.each([
    ['negativo', '-0.01'],
    ['mayor al máximo', '10.01'],
    ['no finito', 'NaN'],
    ['ausente', null],
  ])('[I14] rechaza puntaje sugerido %s', (_, puntaje_sugerido) => {
    esperarError(
      () =>
        validarResultadoCorreccionIa({
          ...resultadoValido,
          puntaje_sugerido,
        }),
      'PUNTAJE_FUERA_DE_RANGO',
      'entre 0 y el puntaje máximo',
    );
  });

  it.each([
    ['negativa', '-0.01'],
    ['mayor que 1', '1.01'],
    ['no finita', 'NaN'],
  ])('[I14] rechaza confianza %s', (_, confianza) => {
    esperarError(
      () => validarResultadoCorreccionIa({ ...resultadoValido, confianza }),
      'CONFIANZA_FUERA_DE_RANGO',
      'entre 0 y 1',
    );
  });
});


