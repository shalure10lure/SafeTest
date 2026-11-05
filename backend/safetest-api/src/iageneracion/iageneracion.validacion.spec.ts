import {
  filtrarPropuestasValidas,
  validarPropuesta,
} from './iageneracion.validacion';

describe('validarPropuesta', () => {
  it('acepta una opción única bien formada y completa dificultad y puntaje', () => {
    const propuesta = validarPropuesta(
      {
        enunciado: '¿Cuánto es 2 + 2?',
        tipo_respuesta: 'opcion_unica',
        opciones: [
          { texto_opcion: '4', es_correcta: true },
          { texto_opcion: '5', es_correcta: false },
        ],
        explicacion: 'Suma básica.',
      },
      'opcion_unica',
      'facil',
    );

    expect(propuesta).not.toBeNull();
    expect(propuesta?.dificultad).toBe('facil');
    expect(propuesta?.puntaje_max).toBe(1);
    expect(propuesta?.opciones).toHaveLength(2);
  });

  it('rechaza una propuesta de otro tipo de respuesta', () => {
    expect(
      validarPropuesta(
        {
          enunciado: 'Pregunta',
          tipo_respuesta: 'desarrollo',
          solucion_referencia: 'Algo',
        },
        'numerica',
        'media',
      ),
    ).toBeNull();
  });

  it('rechaza opciones inválidas aunque el proveedor las devuelva', () => {
    expect(
      validarPropuesta(
        {
          enunciado: 'Pregunta',
          tipo_respuesta: 'opcion_unica',
          opciones: [
            { texto_opcion: 'A', es_correcta: true },
            { texto_opcion: 'B', es_correcta: true },
          ],
        },
        'opcion_unica',
        'media',
      ),
    ).toBeNull();
  });

  it('rechaza una numérica sin valor correcto', () => {
    expect(
      validarPropuesta(
        {
          enunciado: 'Pregunta',
          tipo_respuesta: 'numerica',
          tolerancia: 0,
        },
        'numerica',
        'media',
      ),
    ).toBeNull();
  });
});

describe('filtrarPropuestasValidas', () => {
  it('elimina repetidas y respeta la cantidad solicitada', () => {
    const preguntas = [
      {
        enunciado: 'Repetida',
        tipo_respuesta: 'desarrollo',
        solucion_referencia: 'Uno',
      },
      {
        enunciado: '  repetida ',
        tipo_respuesta: 'desarrollo',
        solucion_referencia: 'Dos',
      },
      {
        enunciado: 'Otra',
        tipo_respuesta: 'desarrollo',
        solucion_referencia: 'Tres',
      },
      {
        enunciado: 'Tercera',
        tipo_respuesta: 'desarrollo',
        solucion_referencia: 'Cuatro',
      },
    ];

    const propuestas = filtrarPropuestasValidas(
      preguntas,
      'desarrollo',
      'media',
      2,
    );

    expect(propuestas).toHaveLength(2);
    expect(propuestas[0].enunciado).toBe('Repetida');
    expect(propuestas[1].enunciado).toBe('Otra');
  });

  it('devuelve una lista vacía si ninguna propuesta es válida', () => {
    expect(
      filtrarPropuestasValidas(
        [{ enunciado: '', tipo_respuesta: 'desarrollo' }],
        'desarrollo',
        'media',
        3,
      ),
    ).toEqual([]);
  });
});
