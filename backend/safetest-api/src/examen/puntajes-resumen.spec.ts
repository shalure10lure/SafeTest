import {
  calcularDistribucionPuntajes,
  calcularPuntajesAleatorioBorrador,
  calcularPuntajesInstantanea,
  calcularPuntajesManual,
  type PreguntaPuntajeCalculo,
  type PreguntaPuntajeResumen,
} from './puntajes-resumen';
import type { PuntajeDecimal } from './puntajes-decimales';

function decimal(coeficiente: number, escala = 0): PuntajeDecimal {
  return { coeficiente: BigInt(coeficiente), escala };
}

function candidata(
  sobrescribir: Partial<PreguntaPuntajeCalculo> = {},
): PreguntaPuntajeCalculo {
  return {
    pregunta_id: 1,
    tema_id: 1,
    enunciado: 'Pregunta',
    puntaje: decimal(5),
    motivo: null,
    incisos: [{ letra: 'a', puntaje: decimal(5) }],
    ...sobrescribir,
  };
}

function pregunta(
  sobrescribir: Partial<PreguntaPuntajeResumen> = {},
): PreguntaPuntajeResumen {
  return {
    pregunta_id: 1,
    enunciado: 'Pregunta',
    puntos: 5,
    total_incisos: 1,
    incisos_sin_puntaje: 0,
    tema: { tema_id: 1, nombre_tema: 'Tema 1' },
    ...sobrescribir,
  };
}

describe('calcularDistribucionPuntajes', () => {
  it('suma varios incisos de una pregunta sin multiplicar el total', () => {
    const resultado = calcularDistribucionPuntajes(
      [pregunta({ puntos: 12, total_incisos: 3 })],
      'manual',
    );

    expect(resultado.puntaje_total).toBe(12);
    expect(resultado.distribucion_temas).toEqual([
      { tema_id: 1, nombre_tema: 'Tema 1', cantidad: 1, puntos: 12 },
    ]);
    expect(resultado.preguntas_sin_puntaje).toEqual([]);
  });

  it('usa el puntaje propio de la evaluación en lugar del banco', () => {
    const resultado = calcularDistribucionPuntajes(
      [
        pregunta({
          puntos: 2,
          puntaje: 5,
          tema: { tema_id: 1, nombre_tema: 'Tema 1' },
        }),
        pregunta({
          pregunta_id: 2,
          puntos: 10,
          puntaje: 8.5,
          tema: { tema_id: 1, nombre_tema: 'Tema 1' },
        }),
      ],
      'manual',
    );

    expect(resultado.puntaje_total).toBe(13.5);
    expect(resultado.distribucion_temas[0]).toMatchObject({
      cantidad: 2,
      puntos: 13.5,
    });
    expect(resultado.preguntas_sin_puntaje).toEqual([]);
  });

  it('usa el banco cuando la fila guardada no tiene puntaje propio', () => {
    const resultado = calcularDistribucionPuntajes(
      [pregunta({ puntos: 12, puntaje: null, total_incisos: 3 })],
      'manual',
    );

    expect(resultado.puntaje_total).toBe(12);
  });

  it('suma los puntajes de varias preguntas', () => {
    const resultado = calcularDistribucionPuntajes(
      [
        pregunta({ pregunta_id: 1, puntos: 5 }),
        pregunta({
          pregunta_id: 2,
          puntos: 7.5,
          tema: { tema_id: 1, nombre_tema: 'Tema 1' },
        }),
      ],
      'manual',
    );

    expect(resultado.puntaje_total).toBe(12.5);
    expect(resultado.distribucion_temas[0]).toMatchObject({
      cantidad: 2,
      puntos: 12.5,
    });
  });

  it('agrupa cantidad y puntos por tema', () => {
    const resultado = calcularDistribucionPuntajes(
      [
        pregunta({
          pregunta_id: 1,
          puntos: 5,
          tema: { tema_id: 1, nombre_tema: 'Álgebra' },
        }),
        pregunta({
          pregunta_id: 2,
          puntos: 3,
          tema: { tema_id: 1, nombre_tema: 'Álgebra' },
        }),
        pregunta({
          pregunta_id: 3,
          puntos: 2,
          tema: { tema_id: 2, nombre_tema: 'Geometría' },
        }),
      ],
      'manual',
    );

    expect(resultado.distribucion_temas).toEqual([
      { tema_id: 1, nombre_tema: 'Álgebra', cantidad: 2, puntos: 8 },
      { tema_id: 2, nombre_tema: 'Geometría', cantidad: 1, puntos: 2 },
    ]);
  });

  it('informa una pregunta sin incisos y no la suma', () => {
    const resultado = calcularDistribucionPuntajes(
      [
        pregunta({
          pregunta_id: 4,
          puntos: 0,
          total_incisos: 0,
        }),
      ],
      'manual',
    );

    expect(resultado.puntaje_total).toBe(0);
    expect(resultado.preguntas_sin_puntaje).toEqual([
      {
        pregunta_id: 4,
        enunciado: 'Pregunta',
        motivo: 'sin_incisos',
      },
    ]);
    expect(resultado.distribucion_temas[0]).toMatchObject({
      cantidad: 1,
      puntos: 0,
    });
  });

  it('informa incisos sin un puntaje válido y no los suma', () => {
    const resultado = calcularDistribucionPuntajes(
      [
        pregunta({
          pregunta_id: 5,
          puntos: 5,
          total_incisos: 2,
          incisos_sin_puntaje: 1,
        }),
      ],
      'manual',
    );

    expect(resultado.puntaje_total).toBe(0);
    expect(resultado.preguntas_sin_puntaje[0].motivo).toBe(
      'inciso_sin_puntaje',
    );
    expect(resultado.distribucion_temas[0].puntos).toBe(0);
  });

  it('considera inválida una pregunta cuyo total es cero', () => {
    const resultado = calcularDistribucionPuntajes(
      [pregunta({ puntos: 0, total_incisos: 1 })],
      'manual',
    );

    expect(resultado.puntaje_total).toBe(0);
    expect(resultado.preguntas_sin_puntaje[0].motivo).toBe(
      'inciso_sin_puntaje',
    );
  });

  it('considera inválido un puntaje no finito', () => {
    const resultado = calcularDistribucionPuntajes(
      [pregunta({ puntos: Number.NaN, total_incisos: 1 })],
      'manual',
    );

    expect(resultado.puntaje_total).toBe(0);
    expect(resultado.preguntas_sin_puntaje[0].motivo).toBe(
      'puntaje_no_finito',
    );
  });

  it('no duplica preguntas repetidas en la selección', () => {
    const resultado = calcularDistribucionPuntajes(
      [
        pregunta({ pregunta_id: 7, puntos: 5 }),
        pregunta({ pregunta_id: 7, puntos: 20 }),
      ],
      'manual',
    );

    expect(resultado.puntaje_total).toBe(5);
    expect(resultado.distribucion_temas[0]).toMatchObject({
      cantidad: 1,
      puntos: 5,
    });
  });

  it('no determina la distribución en modo aleatorio', () => {
    const resultado = calcularDistribucionPuntajes(
      [pregunta({ puntos: 5 })],
      'aleatorio',
    );

    expect(resultado).toEqual({
      distribucion_disponible: false,
      puntaje_total: null,
      distribucion_temas: [],
      preguntas_sin_puntaje: [],
    });
  });

  it('devuelve un resumen vacío cuando no hay preguntas manuales', () => {
    const resultado = calcularDistribucionPuntajes([], 'manual');

    expect(resultado).toEqual({
      distribucion_disponible: true,
      puntaje_total: 0,
      distribucion_temas: [],
      preguntas_sin_puntaje: [],
    });
  });
});

describe('calcularPuntajesManual', () => {
  it('conserva el total y agrega candidatas y seleccionadas por tema', () => {
    const resultado = calcularPuntajesManual([
      pregunta({ pregunta_id: 1, puntos: 5 }),
      pregunta({ pregunta_id: 2, puntos: 7.5 }),
    ]);

    expect(resultado).toMatchObject({
      origen: 'seleccion',
      disponible: true,
      puntaje_total: 12.5,
      motivo: null,
    });
    expect(resultado.temas).toEqual([
      {
        tema_id: 1,
        nombre_tema: 'Tema 1',
        cantidad_candidatas: 2,
        cantidad_seleccionada: 2,
        puntaje_maximo: 12.5,
        garantizado: true,
        motivo: null,
        detalle: null,
      },
    ]);
    expect(resultado.preguntas).toEqual([
      {
        pregunta_id: 1,
        tema_id: 1,
        enunciado: 'Pregunta',
        puntaje_maximo: 5,
        incisos: [],
      },
      {
        pregunta_id: 2,
        tema_id: 1,
        enunciado: 'Pregunta',
        puntaje_maximo: 7.5,
        incisos: [],
      },
    ]);
    expect(resultado.preguntas_sin_puntaje).toEqual([]);
  });

  it('expone el puntaje propio de cada pregunta en el resumen', () => {
    const resultado = calcularPuntajesManual([
      pregunta({ pregunta_id: 1, puntos: 2, puntaje: 6 }),
      pregunta({ pregunta_id: 2, puntos: 10, puntaje: null }),
    ]);

    expect(resultado.puntaje_total).toBe(16);
    expect(resultado.preguntas).toEqual([
      {
        pregunta_id: 1,
        tema_id: 1,
        enunciado: 'Pregunta',
        puntaje_maximo: 6,
        incisos: [],
      },
      {
        pregunta_id: 2,
        tema_id: 1,
        enunciado: 'Pregunta',
        puntaje_maximo: 10,
        incisos: [],
      },
    ]);
  });
});

describe('calcularPuntajesAleatorioBorrador', () => {
  const criterio = {
    tema_id: 1,
    nombre_tema: 'Algebra',
    cantidad: 1,
  };

  it('garantiza una selección parcial cuando las candidatas son uniformes', () => {
    const resultado = calcularPuntajesAleatorioBorrador(
      [criterio],
      [
        candidata({ pregunta_id: 1, puntaje: decimal(5) }),
        candidata({ pregunta_id: 2, puntaje: decimal(5) }),
      ],
    );

    expect(resultado).toMatchObject({
      origen: 'calculo_previo',
      disponible: true,
      puntaje_total: 5,
      motivo: null,
      detalle: null,
    });
    expect(resultado.temas[0]).toMatchObject({
      cantidad_candidatas: 2,
      cantidad_seleccionada: 1,
      puntaje_maximo: 5,
      garantizado: true,
    });
    expect(resultado.preguntas).toHaveLength(2);
  });

  it('suma todas las candidatas cuando se selecciona el conjunto completo', () => {
    const resultado = calcularPuntajesAleatorioBorrador(
      [{ ...criterio, cantidad: 2 }],
      [
        candidata({ pregunta_id: 1, puntaje: decimal(3) }),
        candidata({ pregunta_id: 2, puntaje: decimal(7) }),
      ],
    );

    expect(resultado.disponible).toBe(true);
    expect(resultado.puntaje_total).toBe(10);
    expect(resultado.temas[0]).toMatchObject({
      cantidad_seleccionada: 2,
      cantidad_candidatas: 2,
      puntaje_maximo: 10,
      garantizado: true,
    });
  });

  it('no garantiza una selección parcial con puntajes diferentes', () => {
    const resultado = calcularPuntajesAleatorioBorrador(
      [criterio],
      [
        candidata({ pregunta_id: 1, puntaje: decimal(3) }),
        candidata({ pregunta_id: 2, puntaje: decimal(7) }),
      ],
    );

    expect(resultado.disponible).toBe(false);
    expect(resultado.puntaje_total).toBeNull();
    expect(resultado.motivo).toBe('puntajes_no_uniformes');
    expect(resultado.detalle).toContain('puntajes máximos diferentes');
    expect(resultado.temas[0]).toMatchObject({
      cantidad_seleccionada: 1,
      puntaje_maximo: null,
      garantizado: false,
      motivo: 'puntajes_no_uniformes',
    });
  });

  it('informa candidatas insuficientes sin inventar un total', () => {
    const resultado = calcularPuntajesAleatorioBorrador(
      [{ ...criterio, cantidad: 3 }],
      [candidata({ pregunta_id: 1 }), candidata({ pregunta_id: 2 })],
    );

    expect(resultado.disponible).toBe(false);
    expect(resultado.puntaje_total).toBeNull();
    expect(resultado.motivo).toBe('candidatas_insuficientes');
    expect(resultado.temas[0].garantizado).toBe(false);
  });

  it('informa preguntas candidatas sin puntaje válido', () => {
    const resultado = calcularPuntajesAleatorioBorrador(
      [{ ...criterio, cantidad: 2 }],
      [
        candidata({ pregunta_id: 1 }),
        candidata({
          pregunta_id: 2,
          puntaje: null,
          motivo: 'sin_incisos',
          incisos: [],
        }),
      ],
    );

    expect(resultado.disponible).toBe(false);
    expect(resultado.puntaje_total).toBeNull();
    expect(resultado.motivo).toBe('pregunta_sin_puntaje');
    expect(resultado.preguntas_sin_puntaje).toEqual([
      {
        pregunta_id: 2,
        enunciado: 'Pregunta',
        motivo: 'sin_incisos',
      },
    ]);
  });

  it('explica que no hay criterios cuando el pool está vacío', () => {
    const resultado = calcularPuntajesAleatorioBorrador([], []);

    expect(resultado).toMatchObject({
      origen: 'calculo_previo',
      disponible: false,
      puntaje_total: null,
      motivo: 'sin_criterios',
    });
  });
});

describe('calcularPuntajesInstantanea', () => {
  it('devuelve los valores guardados sin recalcularlos', () => {
    const resultado = calcularPuntajesInstantanea({
      puntaje_maximo_garantizado: '18',
      temas: [
        {
          tema_id: 1,
          nombre_tema: 'Algebra',
          cantidad_seleccionada: 2,
          cantidad_candidatas: 3,
          puntaje_maximo_tema: '18',
        },
      ],
      preguntas: [
        {
          pregunta_id: 11,
          tema_id: 1,
          puntaje_maximo_pregunta: '9',
          incisos: [{ letra: 'a', puntaje_max: '9' }],
        },
      ],
    });

    expect(resultado).toMatchObject({
      origen: 'instantanea',
      disponible: true,
      puntaje_total: 18,
      motivo: null,
      detalle: null,
    });
    expect(resultado.temas[0]).toEqual({
      tema_id: 1,
      nombre_tema: 'Algebra',
      cantidad_candidatas: 3,
      cantidad_seleccionada: 2,
      puntaje_maximo: 18,
      garantizado: true,
      motivo: null,
      detalle: null,
    });
    expect(resultado.preguntas).toEqual([
      {
        pregunta_id: 11,
        tema_id: 1,
        enunciado: null,
        puntaje_maximo: 9,
        incisos: [{ letra: 'a', puntaje_max: 9 }],
      },
    ]);
    expect(resultado.preguntas_sin_puntaje).toEqual([]);
  });

  it('no inventa valores cuando falta la instantánea', () => {
    const resultado = calcularPuntajesInstantanea(null);

    expect(resultado).toMatchObject({
      origen: 'instantanea',
      disponible: false,
      puntaje_total: null,
      temas: [],
      motivo: 'sin_instantanea',
    });
  });
});
