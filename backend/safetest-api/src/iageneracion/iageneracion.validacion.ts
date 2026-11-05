import type { DificultadIa, OpcionIa } from '../ia/ai.types';
import type { TipoRespuesta } from '../pregunta/entity/dtos/create-pregunta.dto';
import {
  normalizarTextoOpcion,
  validarConfiguracionRespuesta,
  type ConfiguracionRespuesta,
} from '../pregunta/validators/configuracion-respuesta.validator';
import {
  PUNTAJE_MAXIMO_POR_DEFECTO,
  type ContenidoPropuesta,
} from './iageneracion.types';

/** Límites defensivos: descartan propuestas anómalas aunque el proveedor falle. */
const MAX_ENUNCIADO = 4_000;
const MAX_OPCION = 500;
const MAX_EXPLICACION = 2_000;
const MAX_SOLUCION = 4_000;

type OpcionLeida = { texto_opcion: string; es_correcta: boolean };

/**
 * Valida la propuesta de cualquier proveedor antes de persistirla.
 *
 * El proveedor puede devolver datos mal formados o intentar cambiar el tipo de
 * pregunta; en ambos casos la propuesta se descarta. Se reutiliza el mismo
 * validador del banco para que una propuesta inválida nunca llegue a la base.
 */
export function validarPropuesta(
  cruda: unknown,
  tipo: TipoRespuesta,
  dificultad: DificultadIa,
): ContenidoPropuesta | null {
  if (!esObjeto(cruda) || cruda.tipo_respuesta !== tipo) {
    return null;
  }

  const enunciado = leerTexto(cruda.enunciado, MAX_ENUNCIADO);

  if (!enunciado) {
    return null;
  }

  const explicacion = leerTexto(cruda.explicacion, MAX_EXPLICACION);
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

  const propuesta: ContenidoPropuesta = {
    enunciado,
    dificultad,
    puntaje_max: PUNTAJE_MAXIMO_POR_DEFECTO,
  };

  if (explicacion) {
    propuesta.explicacion = explicacion;
  }

  if (configuracion.opciones.length > 0) {
    propuesta.opciones = configuracion.opciones.map(
      (opcion): OpcionIa => ({
        texto_opcion: opcion.texto_opcion,
        es_correcta: opcion.es_correcta,
      }),
    );
  }

  if (configuracion.valorCorrecto !== null) {
    propuesta.valor_correcto = configuracion.valorCorrecto;
    propuesta.tolerancia = configuracion.tolerancia ?? 0;
  }

  if (configuracion.solucionReferencia) {
    propuesta.solucion_referencia = configuracion.solucionReferencia;
  }

  return propuesta;
}

/**
 * Filtra las propuestas válidas, elimina enunciados repetidos y nunca supera
 * la cantidad solicitada.
 */
export function filtrarPropuestasValidas(
  preguntas: unknown[],
  tipo: TipoRespuesta,
  dificultad: DificultadIa,
  cantidad: number,
): ContenidoPropuesta[] {
  const limite = Math.max(0, Math.floor(cantidad));
  const vistos = new Set<string>();
  const propuestas: ContenidoPropuesta[] = [];

  for (const cruda of preguntas) {
    if (propuestas.length >= limite) {
      break;
    }

    const propuesta = validarPropuesta(cruda, tipo, dificultad);

    if (!propuesta) {
      continue;
    }

    const clave = normalizarTextoOpcion(propuesta.enunciado);

    if (vistos.has(clave)) {
      continue;
    }

    vistos.add(clave);
    propuestas.push(propuesta);
  }

  return propuestas;
}

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
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : undefined;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}
