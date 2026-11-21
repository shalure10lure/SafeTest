import { createHash } from 'node:crypto';

import type { CriterioCorreccionIa } from '../ia/ai.types';

/**
 * SHA-256 del criterio usado para generar la propuesta. Se serializan las
 * claves en orden alfabético para que el mismo criterio produzca siempre el
 * mismo hash, independientemente del orden en que se construyó el objeto.
 */
export function crearHashCriterio(criterio: CriterioCorreccionIa): string {
  const claves = Object.keys(criterio).sort() as Array<
    keyof CriterioCorreccionIa
  >;
  const normalizado: Record<string, unknown> = {};

  for (const clave of claves) {
    const valor = criterio[clave];
    if (valor !== undefined && valor !== null) {
      normalizado[clave] = valor;
    }
  }

  return createHash('sha256')
    .update(JSON.stringify(normalizado))
    .digest('hex');
}
