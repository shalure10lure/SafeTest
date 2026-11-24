import {
  admiteCriterioPredeterminado,
  CONFIANZA_MAXIMA_CRITERIO_PREDETERMINADO,
  criterioPredeterminado,
  RUBRICA_PREDETERMINADA_DESARROLLO,
} from './correccionia.criterio-predeterminado';

describe('criterio predeterminado', () => {
  it('solo aplica a desarrollo', () => {
    expect(admiteCriterioPredeterminado('desarrollo')).toBe(true);
    for (const tipo of [
      'numerica',
      'opcion_unica',
      'opcion_multiple',
      'verdadero_falso',
    ]) {
      expect(admiteCriterioPredeterminado(tipo)).toBe(false);
      expect(criterioPredeterminado(tipo)).toBeNull();
    }
  });

  it('no inventa respuesta correcta ni valor numérico', () => {
    const criterio = criterioPredeterminado('desarrollo');
    expect(criterio).toEqual({ rubrica: RUBRICA_PREDETERMINADA_DESARROLLO });
    expect(criterio).not.toHaveProperty('valor_correcto');
    expect(criterio).not.toHaveProperty('solucion_referencia');
  });

  it('los pesos suman el 100 % del puntaje máximo y exige revisión docente', () => {
    const pesos = [...RUBRICA_PREDETERMINADA_DESARROLLO.matchAll(/hasta (\d+) %/g)]
      .map((m) => Number(m[1]));
    expect(pesos.reduce((a, b) => a + b, 0)).toBe(100);
    expect(RUBRICA_PREDETERMINADA_DESARROLLO).toContain('revisión docente');
    expect(CONFIANZA_MAXIMA_CRITERIO_PREDETERMINADO).toBeLessThanOrEqual(0.5);
  });
});
