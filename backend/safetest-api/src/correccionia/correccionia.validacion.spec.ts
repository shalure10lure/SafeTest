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
    'rechaza un inciso en estado %s',
    (estado_correccion) => {
      esperarError(
        () =>
          validarSolicitudCorreccionIa({
            ...solicitudValida,
            estado_correccion,
          }),
        'INCISO_NO_PENDIENTE',
        'pendiente de revisión manual',
      );
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

  it('rechaza criterios insuficientes con un motivo comprensible', () => {
    esperarError(
      () =>
        validarSolicitudCorreccionIa({
          ...solicitudValida,
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
  ])('rechaza puntaje máximo %s', (_, puntaje_max) => {
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
  ])('rechaza puntaje sugerido %s', (_, puntaje_sugerido) => {
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
  ])('rechaza confianza %s', (_, confianza) => {
    esperarError(
      () => validarResultadoCorreccionIa({ ...resultadoValido, confianza }),
      'CONFIANZA_FUERA_DE_RANGO',
      'entre 0 y 1',
    );
  });
});
