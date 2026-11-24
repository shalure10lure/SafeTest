import { crearHashCriterioActual, resolverCriterio } from './correccionia.criterio';
import { RUBRICA_PREDETERMINADA_DESARROLLO } from './correccionia.criterio-predeterminado';

const sinRubrica = { valor_correcto: '0', tolerancia: '0', rubrica: '' };

describe('resolverCriterio', () => {
  it('ignora el valor_correcto de relleno (0) en un inciso de desarrollo', () => {
    const resuelto = resolverCriterio('desarrollo', sinRubrica, null);

    expect(resuelto?.fuente).toBe('predeterminado');
    expect(resuelto?.criterio).not.toHaveProperty('valor_correcto');
    expect(resuelto?.criterio.rubrica).toBe(RUBRICA_PREDETERMINADA_DESARROLLO);
  });

  it('usa valor_correcto y tolerancia solo en incisos numéricos', () => {
    const resuelto = resolverCriterio(
      'numerica',
      { valor_correcto: '5', tolerancia: '0.1', rubrica: '' },
      null,
    );

    expect(resuelto).toEqual({
      criterio: { valor_correcto: 5, tolerancia: 0.1 },
      fuente: 'solucion_inciso',
    });
  });

  it('un inciso numérico sin valor utilizable no tiene criterio predeterminado', () => {
    expect(
      resolverCriterio(
        'numerica',
        { valor_correcto: '', tolerancia: '0', rubrica: '' },
        null,
      ),
    ).toBeNull();
  });

  it('envía juntas la rúbrica y la solución de referencia revisada', () => {
    const resuelto = resolverCriterio(
      'desarrollo',
      { ...sinRubrica, rubrica: 'Define magnitud escalar' },
      { contenido: 'Magnitud que se expresa solo con un número y su unidad.' },
    );

    expect(resuelto).toEqual({
      criterio: {
        rubrica: 'Define magnitud escalar',
        solucion_referencia:
          'Magnitud que se expresa solo con un número y su unidad.',
      },
      fuente: 'rubrica',
    });
  });

  it('usa la solución de referencia sola cuando no hay rúbrica', () => {
    const resuelto = resolverCriterio('desarrollo', sinRubrica, {
      contenido: 'La medida es una comparación con una unidad.',
    });

    expect(resuelto?.fuente).toBe('solucion_referencia');
  });

  it('los tipos objetivos sin criterio devuelven null (se corrigen sin IA)', () => {
    for (const tipo of ['opcion_unica', 'opcion_multiple', 'verdadero_falso']) {
      expect(resolverCriterio(tipo, sinRubrica, null)).toBeNull();
    }
  });
});

describe('crearHashCriterioActual', () => {
  it('coincide con el hash de la propuesta generada con criterio predeterminado', () => {
    expect(crearHashCriterioActual('desarrollo', sinRubrica, null)).toBe(
      crearHashCriterioActual('desarrollo', null, null),
    );
    expect(crearHashCriterioActual('desarrollo', null, null)).not.toBeNull();
  });
});
