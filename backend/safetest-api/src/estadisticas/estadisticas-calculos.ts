/**
 * Funciones PURAS para calcular estadísticas de notas.
 *
 * "Pura" significa que no usa base de datos ni nada externo: recibe datos y
 * devuelve resultados. Por eso es fácil de entender y de probar
 * (ver estadisticas-calculos.spec.ts).
 *
 * Todas las notas se trabajan en escala 0-100 (porcentaje del puntaje total
 * de cada evaluación), así se pueden comparar evaluaciones con puntajes
 * totales distintos (por ejemplo una de 7 puntos con otra de 100).
 */

/** Una nota corregida, ya convertida a porcentaje, con sus datos de contexto. */
export interface FilaNota {
  estudiante_id: number;
  examen_id: number;
  examen_titulo: string;
  paralelo_id: number;
  paralelo_nombre: string;
  materia_id: number;
  semestre_id: number;
  /** Nota en escala 0-100. */
  porcentaje: number;
}

/** Promedio de un grupo (paralelo, periodo, evaluación...). */
export interface PromedioGrupo {
  /** Cantidad de notas del grupo. */
  n: number;
  promedio: number | null;
}

export interface Percentiles {
  min: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  max: number;
}

export interface RangoDistribucion {
  /** Texto para mostrar: "70–79". */
  etiqueta: string;
  cantidad: number;
}

/** Límite inferior de cada rango del histograma (0–49, 50–59, ... 90–100). */
const LIMITES_RANGOS = [0, 50, 60, 70, 80, 90];
const ETIQUETAS_RANGOS = ['0–49', '50–59', '60–69', '70–79', '80–89', '90–100'];

/** Redondea a N decimales (2 por defecto) y evita el "-0". */
export function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales;
  const resultado = Math.round(valor * factor) / factor;
  return Object.is(resultado, -0) ? 0 : resultado;
}

/**
 * Convierte una nota a porcentaje.
 * Devuelve null si no se puede calcular (sin puntaje máximo o datos inválidos).
 *
 * Ejemplo: nota 5 sobre 7 puntos -> 71.43
 */
export function notaEnPorcentaje(
  nota: string | number | null,
  puntajeMaximo: string | number | null,
): number | null {
  if (nota === null || puntajeMaximo === null) return null;

  const notaNumero = Number(nota);
  const maximoNumero = Number(puntajeMaximo);

  if (!Number.isFinite(notaNumero) || !Number.isFinite(maximoNumero)) {
    return null;
  }
  if (maximoNumero <= 0) return null;

  return (notaNumero / maximoNumero) * 100;
}

/** Promedio simple. Devuelve null si no hay valores. */
export function promedio(valores: number[]): number | null {
  if (valores.length === 0) return null;

  const suma = valores.reduce((acumulado, valor) => acumulado + valor, 0);
  return redondear(suma / valores.length);
}

/**
 * Percentil por interpolación lineal (el mismo método de Excel: PERCENTIL.INC).
 * `ordenados` debe venir ordenado de menor a mayor. `p` va de 0 a 100.
 *
 * Ejemplo: [10, 20, 30, 40, 50] -> percentil 50 = 30
 */
export function percentil(ordenados: number[], p: number): number | null {
  if (ordenados.length === 0) return null;

  // Posición "decimal" dentro de la lista. Ej.: 5 valores y p=25 -> 1.0
  const posicion = (p / 100) * (ordenados.length - 1);
  const abajo = Math.floor(posicion);
  const arriba = Math.ceil(posicion);

  // Si cae justo en un valor, lo devolvemos; si no, interpolamos entre vecinos.
  const fraccion = posicion - abajo;
  return (
    ordenados[abajo] + (ordenados[arriba] - ordenados[abajo]) * fraccion
  );
}

/** Mínimo, P25, mediana (P50), P75, P90 y máximo. null si no hay notas. */
export function calcularPercentiles(valores: number[]): Percentiles | null {
  if (valores.length === 0) return null;

  const ordenados = [...valores].sort((a, b) => a - b);
  const calcular = (p: number) => redondear(percentil(ordenados, p) as number);

  return {
    min: redondear(ordenados[0]),
    p25: calcular(25),
    p50: calcular(50),
    p75: calcular(75),
    p90: calcular(90),
    max: redondear(ordenados[ordenados.length - 1]),
  };
}

/**
 * Cuenta cuántas notas caen en cada rango (0–49, 50–59, ... 90–100).
 * Siempre devuelve los 6 rangos, aunque alguno tenga 0.
 */
export function calcularDistribucion(valores: number[]): RangoDistribucion[] {
  const cantidades = LIMITES_RANGOS.map(() => 0);

  for (const valor of valores) {
    // Buscamos el rango más alto cuyo límite inferior sea <= nota.
    // Las notas negativas caen en el primer rango y las > 100 en el último.
    let indice = 0;
    for (let i = 0; i < LIMITES_RANGOS.length; i++) {
      if (valor >= LIMITES_RANGOS[i]) indice = i;
    }
    cantidades[indice] += 1;
  }

  return ETIQUETAS_RANGOS.map((etiqueta, indice) => ({
    etiqueta,
    cantidad: cantidades[indice],
  }));
}

/**
 * Agrupa notas por una clave y calcula el promedio de cada grupo.
 * Mantiene el orden en que aparece cada grupo por primera vez.
 */
export function agruparPromedios<T extends FilaNota>(
  filas: T[],
  clave: (fila: T) => number,
): Map<number, PromedioGrupo & { primera: T }> {
  const grupos = new Map<number, { valores: number[]; primera: T }>();

  for (const fila of filas) {
    const id = clave(fila);
    const grupo = grupos.get(id) ?? { valores: [], primera: fila };
    grupo.valores.push(fila.porcentaje);
    grupos.set(id, grupo);
  }

  const resultado = new Map<number, PromedioGrupo & { primera: T }>();
  for (const [id, grupo] of grupos) {
    resultado.set(id, {
      n: grupo.valores.length,
      promedio: promedio(grupo.valores),
      primera: grupo.primera,
    });
  }
  return resultado;
}
