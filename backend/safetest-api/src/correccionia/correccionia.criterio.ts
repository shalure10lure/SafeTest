import { createHash } from 'node:crypto';

import type { CriterioCorreccionIa } from '../ia/ai.types';
import type { IaSolucionReferencia } from '../iasolucionreferencia/entity/iasolucionreferencia.entity';
import type { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';

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

  return createHash('sha256').update(JSON.stringify(normalizado)).digest('hex');
}

export function crearHashCriterioActual(
  solucion: Pick<
    SolucionInciso,
    'valor_correcto' | 'tolerancia' | 'rubrica'
  > | null,
  referencia: Pick<IaSolucionReferencia, 'contenido'> | null,
): string | null {
  const valorCorrecto = convertirNumero(solucion?.valor_correcto);
  const rubrica = solucion?.rubrica?.trim() ?? '';

  if (valorCorrecto !== null) {
    const criterio: CriterioCorreccionIa = {
      valor_correcto: valorCorrecto,
      tolerancia: convertirNumero(solucion?.tolerancia) ?? 0,
    };
    if (rubrica) {
      criterio.rubrica = rubrica;
    }
    return crearHashCriterio(criterio);
  }

  if (rubrica) {
    return crearHashCriterio({ rubrica });
  }

  const textoReferencia = textoDesdeContenido(referencia?.contenido);
  return textoReferencia
    ? crearHashCriterio({ solucion_referencia: textoReferencia })
    : null;
}

function convertirNumero(
  valor: number | string | null | undefined,
): number | null {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    return null;
  }
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function textoDesdeContenido(contenido: unknown): string {
  if (typeof contenido === 'string') {
    return contenido.trim();
  }
  if (typeof contenido !== 'object' || contenido === null) {
    return '';
  }

  const partes: string[] = [];
  for (const [clave, valor] of Object.entries(
    contenido as Record<string, unknown>,
  )) {
    if (valor === null || valor === undefined) {
      continue;
    }
    const texto =
      typeof valor === 'string' ? valor.trim() : JSON.stringify(valor);
    if (texto) {
      partes.push(`${clave}: ${texto}`);
    }
  }
  return partes.join('\n');
}
