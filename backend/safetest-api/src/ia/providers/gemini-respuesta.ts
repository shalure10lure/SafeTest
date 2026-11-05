import type { TipoRespuesta } from '../../pregunta/entity/dtos/create-pregunta.dto';
import {
  validarConfiguracionRespuesta,
  type ConfiguracionRespuesta,
} from '../../pregunta/validators/configuracion-respuesta.validator';
import type { PreguntaIa } from '../ai.types';
import { ErrorGeneracionIa } from '../ia.errors';

/** Límites defensivos para descartar propuestas anómalas del modelo. */
const MAX_ENUNCIADO = 4_000;
const MAX_OPCION = 500;
const MAX_EXPLICACION = 2_000;
const MAX_SOLUCION = 4_000;

export interface RespuestaValidada {
  preguntas: PreguntaIa[];
  /** Propuestas recibidas que no cumplieron las reglas del banco. */
  descartadas: number;
}

export interface EntradaValidacion {
  texto: string;
  tipoRespuesta: TipoRespuesta;
  cantidad: number;
}

/**
 * Convierte el texto devuelto por Gemini en propuestas validadas.
 *
 * La estructura la garantiza `responseJsonSchema`, pero las reglas de negocio
 * (una sola opción correcta, etiquetas de verdadero/falso, tolerancia, etc.)
 * se validan aquí reutilizando el mismo validador del banco de preguntas.
 *
 * @throws ErrorGeneracionIa cuando la respuesta no es JSON o no trae la lista.
 */
export function validarRespuestaGemini(
  entrada: EntradaValidacion,
): RespuestaValidada {
  const datos = parsearJson(entrada.texto);
  const lista = leerListaPreguntas(datos);
  const limite = Math.max(0, Math.floor(entrada.cantidad));

  const preguntas: PreguntaIa[] = [];
  const enunciados = new Set<string>();
  let descartadas = 0;

  for (const cruda of lista) {
    const pregunta = normalizarPregunta(cruda, entrada.tipoRespuesta);

    if (!pregunta) {
      descartadas += 1;
      continue;
    }

    const enunciadoNormalizado = pregunta.enunciado
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('es');

    if (enunciados.has(enunciadoNormalizado)) {
      descartadas += 1;
      continue;
    }

    enunciados.add(enunciadoNormalizado);
    preguntas.push(pregunta);

    if (preguntas.length >= limite) {
      break;
    }
  }

  return { preguntas, descartadas };
}

function parsearJson(texto: string): unknown {
  const limpio = quitarCercas(texto);

  try {
    return JSON.parse(limpio);
  } catch {
    throw new ErrorGeneracionIa(
      'respuesta_invalida',
      'La respuesta del proveedor no es JSON válido.',
    );
  }
}

function leerListaPreguntas(datos: unknown): unknown[] {
  if (!esObjeto(datos) || !Array.isArray(datos.preguntas)) {
    throw new ErrorGeneracionIa(
      'respuesta_invalida',
      'La respuesta del proveedor no incluye la lista de preguntas.',
    );
  }

  return datos.preguntas;
}

function normalizarPregunta(
  cruda: unknown,
  tipo: TipoRespuesta,
): PreguntaIa | null {
  if (!esObjeto(cruda)) {
    return null;
  }

  const enunciado = leerTexto(cruda.enunciado, MAX_ENUNCIADO);

  if (!enunciado) {
    return null;
  }

  const explicacion = leerTexto(cruda.explicacion, MAX_EXPLICACION);
  if (cruda.explicacion !== undefined && !explicacion) {
    return null;
  }
  const conOpciones =
    tipo === 'opcion_unica' ||
    tipo === 'opcion_multiple' ||
    tipo === 'verdadero_falso';

  let configuracion: ConfiguracionRespuesta;

  try {
    configuracion = validarConfiguracionRespuesta({
      tipo_respuesta: tipo,
      opciones: conOpciones ? leerOpciones(cruda.opciones) : undefined,
      valor_correcto:
        tipo === 'numerica' ? leerNumero(cruda.valor_correcto) : undefined,
      tolerancia: tipo === 'numerica' ? leerNumero(cruda.tolerancia) : undefined,
      solucion_referencia:
        tipo === 'desarrollo'
          ? (leerTexto(cruda.solucion_referencia, MAX_SOLUCION) ?? undefined)
          : undefined,
    });
  } catch {
    return null;
  }

  const pregunta: PreguntaIa = { enunciado, tipo_respuesta: tipo };

  if (explicacion) {
    pregunta.explicacion = explicacion;
  }

  if (configuracion.opciones.length > 0) {
    pregunta.opciones = configuracion.opciones.map((opcion) => ({
      texto_opcion: opcion.texto_opcion,
      es_correcta: opcion.es_correcta,
    }));
  }

  if (configuracion.valorCorrecto !== null) {
    pregunta.valor_correcto = configuracion.valorCorrecto;
    pregunta.tolerancia = configuracion.tolerancia ?? 0;
  }

  if (configuracion.solucionReferencia) {
    pregunta.solucion_referencia = configuracion.solucionReferencia;
  }

  return pregunta;
}

type OpcionLeida = { texto_opcion: string; es_correcta: boolean };

/**
 * Devuelve `undefined` ante cualquier opción mal formada; el validador del
 * banco se encarga de rechazar la pregunta completa.
 */
function leerOpciones(valor: unknown): OpcionLeida[] | undefined {
  if (!Array.isArray(valor)) {
    return undefined;
  }

  const opciones = valor.map((opcion): OpcionLeida | null => {
    if (
      !esObjeto(opcion) ||
      typeof opcion.texto_opcion !== 'string' ||
      typeof opcion.es_correcta !== 'boolean'
    ) {
      return null;
    }

    const texto = opcion.texto_opcion.trim();

    if (!texto || texto.length > MAX_OPCION) {
      return null;
    }

    return { texto_opcion: texto, es_correcta: opcion.es_correcta };
  });

  return opciones.every((opcion) => opcion !== null)
    ? opciones.filter((opcion): opcion is OpcionLeida => opcion !== null)
    : undefined;
}

function leerTexto(valor: unknown, maximo: number): string | null {
  if (typeof valor !== 'string') {
    return null;
  }

  const texto = valor.trim();

  return texto && texto.length <= maximo ? texto : null;
}

function leerNumero(valor: unknown): number | undefined {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return undefined;
  }

  return valor;
}

/** Algunos modelos envuelven el JSON en un bloque Markdown. */
function quitarCercas(texto: string): string {
  const limpio = texto.trim();

  if (!limpio.startsWith('```')) {
    return limpio;
  }

  return limpio
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}
