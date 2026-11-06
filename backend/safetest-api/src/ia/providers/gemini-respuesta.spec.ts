import type { TipoRespuesta } from '../../pregunta/entity/dtos/create-pregunta.dto';
import { validarRespuestaGemini } from './gemini-respuesta';

const PREGUNTA_UNICA = {
  enunciado: '¿Cuál es la derivada de x²?',
  opciones: [
    { texto_opcion: '2x', es_correcta: true },
    { texto_opcion: 'x', es_correcta: false },
  ],
};

function validar(
  preguntas: unknown[],
  dificultad: 'facil' | 'media' | 'dificil' = 'media',
) {
  return validarRespuestaGemini({
    texto: JSON.stringify({ preguntas }),
    tipoRespuesta: 'opcion_unica',
    cantidad: preguntas.length,
    dificultad,
  });
}

function validarConTipo(
  preguntas: unknown[],
  tipoRespuesta: TipoRespuesta,
  dificultad: 'facil' | 'media' | 'dificil' = 'media',
) {
  return validarRespuestaGemini({
    texto: JSON.stringify({ preguntas }),
    tipoRespuesta,
    cantidad: preguntas.length,
    dificultad,
  });
}

describe('validarRespuestaGemini', () => {
  it('completa la dificultad solicitada aunque el modelo no la declare', () => {
    const resultado = validar([PREGUNTA_UNICA], 'dificil');

    expect(resultado.preguntas).toHaveLength(1);
    expect(resultado.preguntas[0].dificultad).toBe('dificil');
  });

  it('acepta la dificultad declarada cuando coincide con la solicitada', () => {
    const resultado = validar(
      [{ ...PREGUNTA_UNICA, dificultad: 'facil' }],
      'facil',
    );

    expect(resultado.preguntas).toHaveLength(1);
    expect(resultado.preguntas[0].dificultad).toBe('facil');
  });

  it('descarta una propuesta que declara una dificultad distinta', () => {
    const resultado = validar(
      [{ ...PREGUNTA_UNICA, dificultad: 'dificil' }],
      'media',
    );

    expect(resultado.preguntas).toHaveLength(0);
    expect(resultado.descartadas).toBe(1);
  });

  it('descarta una dificultad inválida declarada por el modelo', () => {
    const resultado = validar(
      [{ ...PREGUNTA_UNICA, dificultad: 'extrema' }],
      'media',
    );

    expect(resultado.preguntas).toHaveLength(0);
    expect(resultado.descartadas).toBe(1);
  });

  it('mantiene la validación estructural de las opciones', () => {
    const resultado = validar([
      {
        ...PREGUNTA_UNICA,
        opciones: [
          { texto_opcion: '2x', es_correcta: true },
          { texto_opcion: 'x', es_correcta: true },
        ],
      },
    ]);

    expect(resultado.preguntas).toHaveLength(0);
    expect(resultado.descartadas).toBe(1);
  });

  it('no intenta medir la complejidad semántica del enunciado', () => {
    // Limitación documentada: una pregunta simple con metadatos "difícil"
    // sigue siendo estructuralmente válida. La calidad real se revisa con
    // Gemini o con el docente, no con heurísticas de palabras.
    const resultado = validar(
      [{ ...PREGUNTA_UNICA, dificultad: 'dificil' }],
      'dificil',
    );

    expect(resultado.preguntas).toHaveLength(1);
  });

  it('decodifica entidades HTML nombradas en enunciado, opciones y explicación', () => {
    const resultado = validar([
      {
        enunciado: '&iquest;Cu&aacute;l es la funci&oacute;n del n&uacute;cleo?',
        explicacion:
          'El n&uacute;cleo controla la c&eacute;lula y la e&ntilde;e es parte del texto.',
        opciones: [
          { texto_opcion: 'Almacenar &uacute;nicamente energ&iacute;a', es_correcta: false },
          { texto_opcion: 'Coordinar la c&eacute;lula', es_correcta: true },
        ],
      },
    ]);

    expect(resultado.descartadas).toBe(0);
    expect(resultado.preguntas).toHaveLength(1);

    const pregunta = resultado.preguntas[0];
    expect(pregunta.enunciado).toBe(
      '¿Cuál es la función del núcleo?',
    );
    expect(pregunta.explicacion).toBe(
      'El núcleo controla la célula y la eñe es parte del texto.',
    );
    expect(pregunta.opciones).toEqual([
      { texto_opcion: 'Almacenar únicamente energía', es_correcta: false },
      { texto_opcion: 'Coordinar la célula', es_correcta: true },
    ]);
  });

  it('decodifica entidades HTML numéricas en todos los campos de texto', () => {
    const resultado = validar([
      {
        enunciado: '&#191;Cu&#225;l es la suma &#241;?',
        explicacion: 'Se obtiene &#250;nicamente con &#xBF;atenci&#xF3;n.',
        opciones: [
          { texto_opcion: '&#225;rea &#x26; per&#237;metro', es_correcta: false },
          { texto_opcion: '&#250;nico valor', es_correcta: true },
        ],
      },
    ]);

    const pregunta = resultado.preguntas[0];
    expect(pregunta.enunciado).toBe('¿Cuál es la suma ñ?');
    expect(pregunta.explicacion).toBe(
      'Se obtiene únicamente con ¿atención.',
    );
    expect(pregunta.opciones?.[0].texto_opcion).toBe(
      'área & perímetro',
    );
    expect(pregunta.opciones?.[1].texto_opcion).toBe('único valor');
  });

  it('decodifica la solución de referencia de una pregunta de desarrollo', () => {
    const resultado = validarConTipo(
      [
        {
          enunciado: '&iquest;Qu&eacute; regla se aplica?',
          solucion_referencia:
            'Se aplica la regla de la cadena: &part;f/&part;x &#183; &#x2202;g/&#x2202;x.',
        },
      ],
      'desarrollo',
    );

    const pregunta = resultado.preguntas[0];
    expect(pregunta.enunciado).toBe('¿Qué regla se aplica?');
    expect(pregunta.solucion_referencia).toBe(
      'Se aplica la regla de la cadena: ∂f/∂x · ∂g/∂x.',
    );
  });

  it('no vuelve a decodificar texto que ya está limpio ni altera entidades desconocidas', () => {
    const resultado = validar([
      {
        enunciado: '¿Cuál es la función de la mitocondria?',
        explicacion: 'Texto &amp;uacute; con entidad desconocida &foo; intacta.',
        opciones: [
          { texto_opcion: 'Producir energía', es_correcta: true },
          { texto_opcion: 'Almacenar agua', es_correcta: false },
        ],
      },
    ]);

    const pregunta = resultado.preguntas[0];
    expect(pregunta.enunciado).toBe(
      '¿Cuál es la función de la mitocondria?',
    );
    // `&amp;uacute;` se decodifica una sola vez y la entidad desconocida
    // `&foo;` se conserva tal cual.
    expect(pregunta.explicacion).toBe(
      'Texto &uacute; con entidad desconocida &foo; intacta.',
    );
  });
});
