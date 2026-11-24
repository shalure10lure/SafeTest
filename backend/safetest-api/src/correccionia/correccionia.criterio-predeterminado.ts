import type { CriterioCorreccionIa } from '../ia/ai.types';

/**
 * Criterio académico predeterminado para incisos de desarrollo que el docente
 * no dotó de rúbrica, valor correcto ni solución de referencia revisada.
 *
 * Reglas de diseño:
 * - No inventa una respuesta correcta: solo describe QUÉ se valora.
 * - Los pesos son porcentajes del puntaje máximo, por lo que nunca superan el
 *   máximo (25 + 40 + 25 + 10 = 100) y permiten respuestas parciales.
 * - Obliga a señalar que la valoración requiere revisión docente.
 *
 * Solo aplica a `desarrollo`: en los demás tipos (opciones, verdadero/falso y
 * numérica) la corrección depende de una solución concreta y sin ella no se
 * debe proponer nada.
 */
export const TIPOS_CON_CRITERIO_PREDETERMINADO = ['desarrollo'] as const;

export const RUBRICA_PREDETERMINADA_DESARROLLO = [
  'Criterio predeterminado: el docente no registró rúbrica ni solución de referencia para este inciso.',
  'Valora únicamente con lo que el enunciado solicita y reparte el puntaje máximo así:',
  '1) Pertinencia (hasta 25 %): la respuesta aborda lo que pide el enunciado.',
  '2) Corrección conceptual o procedimental (hasta 40 %): afirmaciones y procedimientos coherentes, sin errores evidentes.',
  '3) Completitud (hasta 25 %): cubre los aspectos solicitados; una respuesta parcial recibe puntaje proporcional.',
  '4) Claridad y justificación (hasta 10 %): la respuesta está explicada de forma comprensible.',
  'Una respuesta vacía, irrelevante o que no intenta responder recibe 0.',
  'No supongas una única respuesta correcta ni completes datos que el enunciado no da.',
  'Si el enunciado no permite valorar con certeza, indícalo en la explicación como "requiere revisión docente" y usa una confianza baja.',
].join(' ');

/** Tope de confianza cuando la corrección usa el criterio predeterminado. */
export const CONFIANZA_MAXIMA_CRITERIO_PREDETERMINADO = 0.5;

export function admiteCriterioPredeterminado(tipoRespuesta: string): boolean {
  return (TIPOS_CON_CRITERIO_PREDETERMINADO as readonly string[]).includes(
    tipoRespuesta,
  );
}

export function criterioPredeterminado(
  tipoRespuesta: string,
): CriterioCorreccionIa | null {
  if (!admiteCriterioPredeterminado(tipoRespuesta)) {
    return null;
  }

  return { rubrica: RUBRICA_PREDETERMINADA_DESARROLLO };
}
