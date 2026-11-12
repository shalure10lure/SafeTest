/**
 * Cálculo puro del puntaje de un inciso.
 *
 * No accede a la base de datos ni conoce reglas completas: recibe la
 * configuración ya normalizada y los valores de la solución almacenada. Los
 * resultados siempre quedan dentro de [0, puntaje_max] y se redondean a dos
 * decimales, que es la precisión con la que se guarda `puntaje_obtenido`.
 */

const DECIMALES_PUNTAJE = 2;

/** Redondeo decimal seguro para evitar ruido de punto flotante. */
export function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

/** Formato con el que se persiste `puntaje_obtenido` (numeric). */
export function formatearPuntaje(valor: number): string {
  return redondear(valor, DECIMALES_PUNTAJE).toFixed(DECIMALES_PUNTAJE);
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

function puntajeSeguro(puntajeMax: number): number {
  if (!Number.isFinite(puntajeMax) || puntajeMax <= 0) return 0;

  return redondear(puntajeMax, DECIMALES_PUNTAJE);
}

export interface EntradaSeleccionUnica {
  puntajeMax: number;
  correctas: readonly number[];
  seleccionadas: readonly number[];
}

/**
 * Opción única y verdadero/falso.
 *
 * Solo se otorga el puntaje completo cuando la selección coincide exactamente
 * con la solución. Una respuesta vacía nunca es correcta.
 */
export function puntajeSeleccionUnica({
  puntajeMax,
  correctas,
  seleccionadas,
}: EntradaSeleccionUnica): number {
  const esperadas = new Set(correctas);
  const marcadas = new Set(seleccionadas);

  if (esperadas.size === 0 || marcadas.size === 0) return 0;
  if (esperadas.size !== marcadas.size) return 0;

  for (const opcion of esperadas) {
    if (!marcadas.has(opcion)) return 0;
  }

  return puntajeSeguro(puntajeMax);
}

export interface EntradaSeleccionMultiple extends EntradaSeleccionUnica {
  puntajeParcial: boolean;
  penalizarIncorrectas: boolean;
}

/**
 * Opción múltiple.
 *
 * - Sin puntaje parcial: hay que marcar todas las correctas. Si además se
 *   penaliza, cada opción incorrecta resta en proporción a la solución.
 * - Con puntaje parcial: cada acierto suma y, si corresponde, cada opción
 *   incorrecta resta; el resultado se limita a [0, puntaje_max].
 */
export function puntajeSeleccionMultiple({
  puntajeMax,
  correctas,
  seleccionadas,
  puntajeParcial,
  penalizarIncorrectas,
}: EntradaSeleccionMultiple): number {
  const esperadas = new Set(correctas);
  const marcadas = new Set(seleccionadas);

  if (esperadas.size === 0 || marcadas.size === 0) return 0;

  const aciertos = [...marcadas].filter((opcion) =>
    esperadas.has(opcion),
  ).length;
  const errores = marcadas.size - aciertos;

  if (!puntajeParcial) {
    if (aciertos !== esperadas.size) return 0;

    const penalizacion = penalizarIncorrectas
      ? (puntajeMax * errores) / esperadas.size
      : 0;

    return redondear(
      limitar(puntajeMax - penalizacion, 0, puntajeMax),
      DECIMALES_PUNTAJE,
    );
  }

  const bruto =
    (puntajeMax * (aciertos - (penalizarIncorrectas ? errores : 0))) /
    esperadas.size;

  return redondear(limitar(bruto, 0, puntajeMax), DECIMALES_PUNTAJE);
}

export interface EntradaNumerica {
  puntajeMax: number;
  respuesta: number;
  valorCorrecto: number;
  tolerancia: number;
  redondeoDecimales: number;
}

/**
 * Respuesta numérica.
 *
 * El redondeo configurado se aplica a la respuesta y a la solución antes de
 * comparar; después se admite la tolerancia almacenada en la solución.
 */
export function puntajeNumerico({
  puntajeMax,
  respuesta,
  valorCorrecto,
  tolerancia,
  redondeoDecimales,
}: EntradaNumerica): number {
  if (!Number.isFinite(respuesta) || !Number.isFinite(valorCorrecto)) {
    return 0;
  }

  const decimales =
    Number.isInteger(redondeoDecimales) &&
    redondeoDecimales >= 0 &&
    redondeoDecimales <= 6
      ? redondeoDecimales
      : 0;

  const diferencia = Math.abs(
    redondear(respuesta, decimales) - redondear(valorCorrecto, decimales),
  );

  const margen =
    Number.isFinite(tolerancia) && tolerancia > 0 ? tolerancia : 0;

  // Pequeño margen para errores de punto flotante al comparar decimales.
  return diferencia <= margen + 1e-9 ? puntajeSeguro(puntajeMax) : 0;
}
