import {
  calcularPasoBorrador,
  contarTiposPregunta,
  estadoEvaluacion,
} from './panel-docente.utils';

const AHORA = new Date('2026-09-20T12:00:00.000Z');

describe('estadoEvaluacion', () => {
  it('un examen sin publicar es borrador', () => {
    expect(
      estadoEvaluacion(
        { estado: 'borrador', disponible_desde: null, disponible_hasta: null },
        AHORA,
      ),
    ).toBe('borrador');
  });

  it('publicado y dentro de la ventana está disponible', () => {
    expect(
      estadoEvaluacion(
        {
          estado: 'publicado',
          disponible_desde: '2026-09-20T08:00:00.000Z',
          disponible_hasta: '2026-09-20T18:00:00.000Z',
        },
        AHORA,
      ),
    ).toBe('disponible');
  });

  it('publicado que aún no abre está pendiente', () => {
    expect(
      estadoEvaluacion(
        {
          estado: 'publicado',
          disponible_desde: '2026-09-21T08:00:00.000Z',
          disponible_hasta: '2026-09-21T18:00:00.000Z',
        },
        AHORA,
      ),
    ).toBe('pendiente');
  });

  it('publicado que ya cerró está finalizado', () => {
    expect(
      estadoEvaluacion(
        {
          estado: 'publicado',
          disponible_desde: '2026-09-19T08:00:00.000Z',
          disponible_hasta: '2026-09-19T18:00:00.000Z',
        },
        AHORA,
      ),
    ).toBe('finalizada');
  });
});

describe('calcularPasoBorrador', () => {
  const base = {
    titulo: 'Parcial 1',
    n_preguntas: 0,
    n_criterios: 0,
    duracion_min: null,
    disponible_desde: null,
    disponible_hasta: null,
    puntaje_total: null,
    n_paralelos: 0,
    n_estudiantes_seleccionados: 0,
  };

  it('sin preguntas se queda en el paso 2', () => {
    expect(calcularPasoBorrador(base).paso).toBe(2);
  });

  it('con preguntas pero sin configurar va al paso 3', () => {
    expect(calcularPasoBorrador({ ...base, n_preguntas: 5 }).paso).toBe(3);
  });

  it('configurado pero sin asignar va al paso 4', () => {
    const configurado = {
      ...base,
      n_criterios: 2,
      duracion_min: 60,
      disponible_desde: '2026-09-20T08:00:00.000Z',
      disponible_hasta: '2026-09-20T18:00:00.000Z',
      puntaje_total: '100.00',
    };

    expect(calcularPasoBorrador(configurado).paso).toBe(4);
  });

  it('todo completo termina en el resumen (paso 5)', () => {
    const completo = {
      ...base,
      n_preguntas: 5,
      duracion_min: 60,
      disponible_desde: '2026-09-20T08:00:00.000Z',
      disponible_hasta: '2026-09-20T18:00:00.000Z',
      puntaje_total: '100.00',
      n_paralelos: 1,
    };

    expect(calcularPasoBorrador(completo).paso).toBe(5);
  });
});

describe('contarTiposPregunta', () => {
  it('agrupa los tipos reales en las categorías del inicio', () => {
    const conteo = contarTiposPregunta([
      'opcion_unica',
      'opcion_multiple',
      'verdadero_falso',
      'desarrollo',
      'numerica',
      'mixto',
    ]);

    expect(conteo).toEqual({
      seleccion_multiple: 2,
      verdadero_falso: 1,
      respuesta_abierta: 1,
      respuesta_numerica: 1,
      varios_incisos: 1,
    });
  });
});
