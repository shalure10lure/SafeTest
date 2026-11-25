import { createHash } from 'node:crypto';

import type { CriterioCorreccionIa } from '../ia/ai.types';
import { criterioPredeterminado } from './correccionia.criterio-predeterminado';
import type { FuenteCriterioCorreccionIa } from './correccionia.types';
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

/**
 * Única fuente de verdad del criterio con el que se corrige un inciso. La usan
 * el worker (para pedir la propuesta) y la aceptación (para detectar si el
 * criterio cambió), de modo que ambos siempre coinciden.
 *
 * - `valor_correcto` solo cuenta en incisos numéricos: en `solucion_inciso` la
 *   columna es NOT NULL y vale 0 por omisión, de modo que en un inciso de
 *   desarrollo ese 0 es un marcador y NO una respuesta correcta.
 * - Rúbrica y solución de referencia revisada se envían juntas si existen.
 * - Solo si no hay nada, y solo para desarrollo, se usa el criterio
 *   predeterminado. Devuelve `null` si no hay criterio utilizable.
 */
export function resolverCriterio(
  tipoRespuesta: string,
  solucion: Pick<
    SolucionInciso,
    'valor_correcto' | 'tolerancia' | 'rubrica'
  > | null,
  referencia: Pick<IaSolucionReferencia, 'contenido'> | null,
): { criterio: CriterioCorreccionIa; fuente: FuenteCriterioCorreccionIa } | null {
  const rubrica = solucion?.rubrica?.trim() ?? '';
  const textoReferencia = textoDesdeContenido(referencia?.contenido);
  const valorCorrecto =
    tipoRespuesta === 'numerica'
      ? convertirNumero(solucion?.valor_correcto)
      : null;

  if (valorCorrecto !== null) {
    const criterio: CriterioCorreccionIa = {
      valor_correcto: valorCorrecto,
      tolerancia: convertirNumero(solucion?.tolerancia) ?? 0,
    };
    if (rubrica) {
      criterio.rubrica = rubrica;
    }
    return { criterio, fuente: 'solucion_inciso' };
  }

  if (rubrica || textoReferencia) {
    const criterio: CriterioCorreccionIa = {};
    if (rubrica) {
      criterio.rubrica = rubrica;
    }
    if (textoReferencia) {
      criterio.solucion_referencia = textoReferencia;
    }
    return { criterio, fuente: rubrica ? 'rubrica' : 'solucion_referencia' };
  }

  const predeterminado = criterioPredeterminado(tipoRespuesta);
  return predeterminado
    ? { criterio: predeterminado, fuente: 'predeterminado' }
    : null;
}

export function crearHashCriterioActual(
  tipoRespuesta: string,
  solucion: Pick<
    SolucionInciso,
    'valor_correcto' | 'tolerancia' | 'rubrica'
  > | null,
  referencia: Pick<IaSolucionReferencia, 'contenido'> | null,
): string | null {
  const resuelto = resolverCriterio(tipoRespuesta, solucion, referencia);
  return resuelto ? crearHashCriterio(resuelto.criterio) : null;
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


