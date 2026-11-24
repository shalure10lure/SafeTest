import {
  agruparPromedios,
  calcularDistribucion,
  calcularPercentiles,
  notaEnPorcentaje,
  percentil,
  promedio,
  type FilaNota,
} from './estadisticas-calculos';

describe('notaEnPorcentaje', () => {
  it('convierte la nota a escala 0-100', () => {
    expect(notaEnPorcentaje('5', '7')).toBeCloseTo(71.43, 2);
  });

  it('devuelve null si no hay puntaje máximo válido', () => {
    expect(notaEnPorcentaje('5', null)).toBeNull();
    expect(notaEnPorcentaje('5', '0')).toBeNull();
    expect(notaEnPorcentaje('abc', '10')).toBeNull();
  });
});

describe('promedio', () => {
  it('calcula el promedio redondeado a 2 decimales', () => {
    expect(promedio([70, 80, 91])).toBe(80.33);
  });

  it('devuelve null sin valores', () => {
    expect(promedio([])).toBeNull();
  });
});

describe('percentil', () => {
  it('devuelve la mediana de una lista impar', () => {
    expect(percentil([10, 20, 30, 40, 50], 50)).toBe(30);
  });

  it('interpola entre valores vecinos', () => {
    // posición = 0.25 * 3 = 0.75 -> entre 10 y 20
    expect(percentil([10, 20, 30, 40], 25)).toBeCloseTo(17.5, 5);
  });
});

describe('calcularPercentiles', () => {
  it('devuelve null sin notas', () => {
    expect(calcularPercentiles([])).toBeNull();
  });

  it('calcula min, P25, mediana, P75, P90 y max', () => {
    const resultado = calcularPercentiles([50, 60, 70, 80, 90]);

    expect(resultado).toEqual({
      min: 50,
      p25: 60,
      p50: 70,
      p75: 80,
      p90: 86,
      max: 90,
    });
  });
});

describe('calcularDistribucion', () => {
  it('siempre devuelve los 6 rangos', () => {
    expect(calcularDistribucion([])).toHaveLength(6);
  });

  it('ubica cada nota en su rango', () => {
    const rangos = calcularDistribucion([45, 59.9, 60, 79, 80, 100]);
    const cantidades = rangos.map((rango) => rango.cantidad);

    // 0–49, 50–59, 60–69, 70–79, 80–89, 90–100
    expect(cantidades).toEqual([1, 1, 1, 1, 1, 1]);
  });
});

describe('agruparPromedios', () => {
  const fila = (paralelo_id: number, porcentaje: number): FilaNota => ({
    estudiante_id: 1,
    examen_id: 1,
    examen_titulo: 'Parcial',
    paralelo_id,
    paralelo_nombre: `P${paralelo_id}`,
    materia_id: 1,
    semestre_id: 1,
    porcentaje,
  });

  it('promedia por grupo y cuenta las notas', () => {
    const grupos = agruparPromedios(
      [fila(1, 70), fila(1, 90), fila(2, 60)],
      (f) => f.paralelo_id,
    );

    expect(grupos.get(1)?.promedio).toBe(80);
    expect(grupos.get(1)?.n).toBe(2);
    expect(grupos.get(2)?.promedio).toBe(60);
  });
});
