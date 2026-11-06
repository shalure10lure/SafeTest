import { decodificarEntidadesHtml } from './html-entities';

describe('decodificarEntidadesHtml', () => {
  it('decodifica entidades nombradas con acentos y eñes', () => {
    expect(
      decodificarEntidadesHtml(
        '&iquest;Cu&aacute;l es la funci&oacute;n de la mitocondria?',
      ),
    ).toBe('¿Cuál es la función de la mitocondria?');
    expect(decodificarEntidadesHtml('&Ntilde;and&uacute;')).toBe('Ñandú');
    expect(decodificarEntidadesHtml('dise&ntilde;o &uacute;til')).toBe(
      'diseño útil',
    );
  });

  it('decodifica signos de apertura y puntuación', () => {
    expect(
      decodificarEntidadesHtml('&iexcl;Atenci&oacute;n! &iquest;Listo?'),
    ).toBe('¡Atención! ¿Listo?');
    expect(decodificarEntidadesHtml('a &lt; b &amp;&amp; b &gt; c')).toBe(
      'a < b && b > c',
    );
    expect(decodificarEntidadesHtml('&laquo;texto&raquo;')).toBe(
      '«texto»',
    );
  });

  it('decodifica entidades numéricas decimales y hexadecimales', () => {
    expect(decodificarEntidadesHtml('&#250; &#191; &#241;')).toBe(
      'ú ¿ ñ',
    );
    expect(decodificarEntidadesHtml('&#xFA; &#xBF; &#xF1;')).toBe(
      'ú ¿ ñ',
    );
    expect(decodificarEntidadesHtml('&#39;texto&#39;')).toBe("'texto'");
    expect(decodificarEntidadesHtml('&#x1F600;')).toBe('😀');
  });

  it('no modifica el texto que no contiene entidades', () => {
    const texto = '¿Cuál es la derivada de x²? Justifica tu respuesta.';

    expect(decodificarEntidadesHtml(texto)).toBe(texto);
    expect(decodificarEntidadesHtml('')).toBe('');
  });

  it('deja intactas las entidades desconocidas y las referencias sin punto y coma', () => {
    expect(decodificarEntidadesHtml('&entidadDesconocida; &uacute')).toBe(
      '&entidadDesconocida; &uacute',
    );
    expect(decodificarEntidadesHtml('A & B')).toBe('A & B');
  });

  it('no altera las etiquetas HTML, solo las entidades del texto', () => {
    expect(
      decodificarEntidadesHtml(
        '<p class="nota">&iquest;Cu&aacute;l?</p>',
      ),
    ).toBe('<p class="nota">¿Cuál?</p>');
  });

  it('no decodifica de forma recursiva en una sola pasada', () => {
    expect(decodificarEntidadesHtml('&amp;uacute;')).toBe('&uacute;');
    expect(decodificarEntidadesHtml('&amp;iquest;')).toBe('&iquest;');
  });

  it('rechaza puntos de código inválidos o de control', () => {
    expect(decodificarEntidadesHtml('&#0;')).toBe('&#0;');
    expect(decodificarEntidadesHtml('&#xD800;')).toBe('&#xD800;');
    expect(decodificarEntidadesHtml('&#x110000;')).toBe('&#x110000;');
    expect(decodificarEntidadesHtml('&#1;')).toBe('&#1;');
  });

  it('mantiene tabuladores y saltos de línea numéricos válidos', () => {
    expect(decodificarEntidadesHtml('a&#9;b&#10;c')).toBe('a\tb\nc');
  });
});
