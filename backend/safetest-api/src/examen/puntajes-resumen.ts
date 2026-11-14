/**
 * Cálculo derivado de puntajes para el resumen de publicación.
 *
 * El puntaje máximo pertenece al inciso. El total de una pregunta es la suma
 * de sus incisos y ya llega calculado desde la consulta (`puntos`). Estas
 * funciones no vuelven a sumar incisos: solo agregan preguntas y evitan
 * duplicarlas.
 */

import {
  multiplicarPuntajeDecimal,
  parsearPuntajeDecimal,
  puntajeDecimalANumero,
  puntajesDecimalesIguales,
  sumarPuntajesDecimales,
} from './puntajes-decimales';
import type { PuntajeDecimal } from './puntajes-decimales';

export type MotivoPreguntaSinPuntaje =
  | 'sin_incisos'
  | 'inciso_sin_puntaje'
  | 'puntaje_no_finito';

export interface PreguntaPuntajeResumen {
  pregunta_id: number;
  enunciado: string;
  puntos: number;
  total_incisos: number;
  incisos_sin_puntaje: number;
  tema: {
    tema_id: number;
    nombre_tema: string;
  };
}

export interface DistribucionTemaResumen {
  tema_id: number;
  nombre_tema: string;
  cantidad: number;
  puntos: number;
}

export interface PreguntaSinPuntajeResumen {
  pregunta_id: number;
  enunciado: string;
  motivo: MotivoPreguntaSinPuntaje;
}

export interface DistribucionPuntajesResumen {
  /**
   * `true` cuando las preguntas ya están seleccionadas y sus puntajes pueden
   * sumarse. En modo aleatorio la selección ocurre al iniciar la rendición.
   */
  distribucion_disponible: boolean;
  /** Suma derivada de las preguntas. `null` si no puede determinarse. */
  puntaje_total: number | null;
  distribucion_temas: DistribucionTemaResumen[];
  preguntas_sin_puntaje: PreguntaSinPuntajeResumen[];
}

function motivoSinPuntaje(
  puntos: number,
  totalIncisos: number,
  incisosSinPuntaje: number,
): MotivoPreguntaSinPuntaje | null {
  if (!Number.isFinite(puntos)) {
    return 'puntaje_no_finito';
  }

  if (totalIncisos === 0) {
    return 'sin_incisos';
  }

  if (incisosSinPuntaje > 0 || puntos <= 0) {
    return 'inciso_sin_puntaje';
  }

  return null;
}

/**
 * Agrega los puntajes de las preguntas seleccionadas.
 *
 * - Deduplica por `pregunta_id` para no sumar dos veces la misma pregunta.
 * - No multiplica por la cantidad de incisos: `puntos` ya es el total de la
 *   pregunta.
 * - Una pregunta inválida se cuenta en su tema con 0 puntos y se informa en
 *   `preguntas_sin_puntaje`.
 */
export function calcularDistribucionPuntajes(
  preguntas: PreguntaPuntajeResumen[],
  modoSeleccion: string,
): DistribucionPuntajesResumen {
  if (modoSeleccion !== 'manual') {
    return {
      distribucion_disponible: false,
      puntaje_total: null,
      distribucion_temas: [],
      preguntas_sin_puntaje: [],
    };
  }

  const preguntasUnicas = new Map<number, PreguntaPuntajeResumen>();

  for (const pregunta of preguntas) {
    if (!preguntasUnicas.has(pregunta.pregunta_id)) {
      preguntasUnicas.set(pregunta.pregunta_id, pregunta);
    }
  }

  const temas = new Map<number, DistribucionTemaResumen>();
  const preguntasSinPuntaje: PreguntaSinPuntajeResumen[] = [];
  let puntajeTotal = 0;

  for (const pregunta of preguntasUnicas.values()) {
    const puntos = Number(pregunta.puntos);
    const totalIncisos = Number(pregunta.total_incisos);
    const incisosSinPuntaje = Number(pregunta.incisos_sin_puntaje);
    const motivo = motivoSinPuntaje(
      puntos,
      totalIncisos,
      incisosSinPuntaje,
    );
    const puntosValidos = motivo === null ? puntos : 0;

    const tema = temas.get(pregunta.tema.tema_id) ?? {
      tema_id: pregunta.tema.tema_id,
      nombre_tema: pregunta.tema.nombre_tema,
      cantidad: 0,
      puntos: 0,
    };

    tema.cantidad += 1;
    tema.puntos += puntosValidos;
    temas.set(tema.tema_id, tema);

    if (motivo !== null) {
      preguntasSinPuntaje.push({
        pregunta_id: pregunta.pregunta_id,
        enunciado: pregunta.enunciado,
        motivo,
      });
      continue;
    }

    puntajeTotal += puntosValidos;
  }

  return {
    distribucion_disponible: true,
    puntaje_total: puntajeTotal,
    distribucion_temas: [...temas.values()].sort((a, b) =>
      a.nombre_tema.localeCompare(b.nombre_tema, 'es'),
    ),
    preguntas_sin_puntaje: preguntasSinPuntaje,
  };
}

/* ------------------------------------------------------------------ */
/* Contrato del resumen de puntajes (borrador y publicado)            */
/* ------------------------------------------------------------------ */

/** De dónde salen los puntajes que se muestran en el resumen. */
export type OrigenPuntajesResumen =
  /** Preguntas ya elegidas en modo manual. */
  | 'seleccion'
  /** Cálculo previo de un borrador aleatorio. */
  | 'calculo_previo'
  /** Valores definitivos guardados al publicar (instantánea). */
  | 'instantanea';

/** Motivo por el que un tema (o el total) no puede garantizarse. */
export type MotivoPuntajeNoGarantizado =
  | 'sin_criterios'
  | 'cantidad_invalida'
  | 'candidatas_insuficientes'
  | 'puntajes_no_uniformes'
  | 'pregunta_sin_puntaje'
  | 'sin_instantanea'
  | 'instantanea_invalida';

export interface IncisoPuntajeResumen {
  letra: string;
  /** `null` si el valor guardado no es un puntaje válido. */
  puntaje_max: number | null;
}

/** Pregunta que forma parte del pool (candidata o guardada en la instantánea). */
export interface PreguntaPoolResumen {
  pregunta_id: number;
  tema_id: number;
  /** La instantánea no guarda el enunciado; en ese caso es `null`. */
  enunciado: string | null;
  /** Puntaje máximo de la pregunta (suma de sus incisos). */
  puntaje_maximo: number | null;
  incisos: IncisoPuntajeResumen[];
}

export interface TemaPuntajeResumen {
  tema_id: number;
  nombre_tema: string;
  /** Preguntas activas del tema que pueden entrar en el pool. */
  cantidad_candidatas: number;
  /** Preguntas que recibirá cada estudiante de este tema. */
  cantidad_seleccionada: number;
  /**
   * Puntaje máximo por estudiante para el tema. En borrador aleatorio solo
   * tiene valor si puede garantizarse; en publicado es el valor definitivo.
   */
  puntaje_maximo: number | null;
  /** `true` si el valor es definitivo (manual o instantánea) o garantizado. */
  garantizado: boolean;
  motivo: MotivoPuntajeNoGarantizado | null;
  /** Explicación legible del motivo, para mostrar al docente. */
  detalle: string | null;
}

export interface ResumenPuntajes {
  origen: OrigenPuntajesResumen;
  /** `true` si `puntaje_total` puede mostrarse sin riesgo de ser falso. */
  disponible: boolean;
  /** Puntaje máximo (o definitivo) por estudiante. `null` si no se garantiza. */
  puntaje_total: number | null;
  temas: TemaPuntajeResumen[];
  /** Preguntas del pool con su puntaje, cuando la fuente lo permite. */
  preguntas: PreguntaPoolResumen[];
  preguntas_sin_puntaje: PreguntaSinPuntajeResumen[];
  /** Motivo global cuando el total no está disponible. */
  motivo: MotivoPuntajeNoGarantizado | null;
  detalle: string | null;
}

export interface CriterioPuntajeResumen {
  tema_id: number;
  nombre_tema: string;
  /** Cantidad que se seleccionará por estudiante. */
  cantidad: number;
}

/** Pregunta candidata ya resuelta a puntaje decimal. */
export interface PreguntaPuntajeCalculo {
  pregunta_id: number;
  tema_id: number;
  enunciado: string | null;
  puntaje: PuntajeDecimal | null;
  motivo: MotivoPreguntaSinPuntaje | null;
  incisos: { letra: string; puntaje: PuntajeDecimal }[];
}

export interface TemaInstantaneaPuntaje {
  tema_id: number;
  nombre_tema: string;
  cantidad_seleccionada: number;
  cantidad_candidatas: number;
  puntaje_maximo_tema: string;
}

export interface PreguntaInstantaneaPuntaje {
  pregunta_id: number;
  tema_id: number;
  puntaje_maximo_pregunta: string;
  incisos: { letra: string; puntaje_max: string }[];
}

/** Datos crudos leídos de las tablas `examen_pool_snapshot*`. */
export interface DatosInstantaneaResumen {
  puntaje_maximo_garantizado: string;
  temas: TemaInstantaneaPuntaje[];
  preguntas: PreguntaInstantaneaPuntaje[];
}

function puntajeANumero(puntaje: PuntajeDecimal | null): number | null {
  if (!puntaje) return null;

  const numero = puntajeDecimalANumero(puntaje);
  return Number.isFinite(numero) ? numero : null;
}

function resumenSinPuntajes(
  origen: OrigenPuntajesResumen,
  motivo: MotivoPuntajeNoGarantizado,
  detalle: string,
): ResumenPuntajes {
  return {
    origen,
    disponible: false,
    puntaje_total: null,
    temas: [],
    preguntas: [],
    preguntas_sin_puntaje: [],
    motivo,
    detalle,
  };
}

/**
 * Resumen de una evaluación manual: las preguntas ya están elegidas y sus
 * puntajes se suman igual que en el comportamiento anterior.
 */
export function calcularPuntajesManual(
  preguntas: PreguntaPuntajeResumen[],
): ResumenPuntajes {
  const distribucion = calcularDistribucionPuntajes(preguntas, 'manual');
  const unicas = new Map<number, PreguntaPuntajeResumen>();

  for (const pregunta of preguntas) {
    if (!unicas.has(pregunta.pregunta_id)) {
      unicas.set(pregunta.pregunta_id, pregunta);
    }
  }

  return {
    origen: 'seleccion',
    disponible: true,
    puntaje_total: distribucion.puntaje_total,
    temas: distribucion.distribucion_temas.map((tema) => ({
      tema_id: tema.tema_id,
      nombre_tema: tema.nombre_tema,
      cantidad_candidatas: tema.cantidad,
      cantidad_seleccionada: tema.cantidad,
      puntaje_maximo: tema.puntos,
      garantizado: true,
      motivo: null,
      detalle: null,
    })),
    preguntas: [...unicas.values()].map((pregunta) => ({
      pregunta_id: pregunta.pregunta_id,
      tema_id: pregunta.tema.tema_id,
      enunciado: pregunta.enunciado,
      puntaje_maximo: Number.isFinite(Number(pregunta.puntos))
        ? Number(pregunta.puntos)
        : null,
      incisos: [],
    })),
    preguntas_sin_puntaje: distribucion.preguntas_sin_puntaje,
    motivo: null,
    detalle: null,
  };
}

/**
 * Cálculo previo de un borrador aleatorio.
 *
 * Reglas T3.2:
 * - Seleccionar todo el pool: se suman todos los puntajes.
 * - Seleccionar una parte: todas las candidatas deben tener el mismo puntaje.
 *
 * Si un tema no cumple la regla, su puntaje queda en `null` y el total de la
 * evaluación tampoco se informa: nunca se presenta un total no garantizado.
 */
export function calcularPuntajesAleatorioBorrador(
  criterios: CriterioPuntajeResumen[],
  preguntas: PreguntaPuntajeCalculo[],
): ResumenPuntajes {
  if (criterios.length === 0) {
    return resumenSinPuntajes(
      'calculo_previo',
      'sin_criterios',
      'No hay criterios de preguntas aleatorias definidos.',
    );
  }

  const preguntasPorTema = new Map<number, PreguntaPuntajeCalculo[]>();
  const preguntasSinPuntaje: PreguntaSinPuntajeResumen[] = [];

  for (const pregunta of preguntas) {
    const lista = preguntasPorTema.get(pregunta.tema_id) ?? [];
    lista.push(pregunta);
    preguntasPorTema.set(pregunta.tema_id, lista);
  }

  const temas: TemaPuntajeResumen[] = [];
  const puntajesTemas: PuntajeDecimal[] = [];
  let primerMotivo: MotivoPuntajeNoGarantizado | null = null;
  let primerDetalle: string | null = null;
  let todosGarantizados = true;

  for (const criterio of criterios) {
    const candidatas = preguntasPorTema.get(criterio.tema_id) ?? [];
    const cantidad = Number(criterio.cantidad);
    const cantidadValida = Number.isInteger(cantidad) && cantidad > 0;
    const invalidas = candidatas.filter(
      (pregunta) => pregunta.puntaje === null,
    );

    for (const invalida of invalidas) {
      preguntasSinPuntaje.push({
        pregunta_id: invalida.pregunta_id,
        enunciado: invalida.enunciado ?? '',
        motivo: invalida.motivo ?? 'puntaje_no_finito',
      });
    }

    let motivo: MotivoPuntajeNoGarantizado | null = null;
    let detalle: string | null = null;
    let puntajeTema: PuntajeDecimal | null = null;

    if (!cantidadValida) {
      motivo = 'cantidad_invalida';
      detalle = `La cantidad solicitada para el tema "${criterio.nombre_tema}" debe ser un entero mayor que cero.`;
    } else if (cantidad > candidatas.length) {
      motivo = 'candidatas_insuficientes';
      detalle = `El tema "${criterio.nombre_tema}" solo tiene ${candidatas.length} preguntas activas disponibles.`;
    } else if (invalidas.length > 0) {
      motivo = 'pregunta_sin_puntaje';
      detalle = `El tema "${criterio.nombre_tema}" tiene preguntas sin un puntaje válido.`;
    } else if (cantidad === candidatas.length) {
      puntajeTema = sumarPuntajesDecimales(
        candidatas.map((pregunta) => pregunta.puntaje as PuntajeDecimal),
      );
    } else {
      const puntajeComun = candidatas[0].puntaje;

      if (
        !puntajeComun ||
        !candidatas.every((pregunta) =>
          puntajesDecimalesIguales(
            pregunta.puntaje as PuntajeDecimal,
            puntajeComun,
          ),
        )
      ) {
        motivo = 'puntajes_no_uniformes';
        detalle = `El tema "${criterio.nombre_tema}" contiene preguntas con puntajes máximos diferentes; solo se puede seleccionar una parte de un pool con puntajes uniformes.`;
      } else {
        puntajeTema = multiplicarPuntajeDecimal(puntajeComun, cantidad);
      }
    }

    const garantizado = motivo === null && puntajeTema !== null;

    if (garantizado) {
      puntajesTemas.push(puntajeTema as PuntajeDecimal);
    } else {
      todosGarantizados = false;

      if (primerMotivo === null) {
        primerMotivo = motivo;
        primerDetalle = detalle;
      }
    }

    temas.push({
      tema_id: criterio.tema_id,
      nombre_tema: criterio.nombre_tema,
      cantidad_candidatas: candidatas.length,
      cantidad_seleccionada: cantidadValida ? cantidad : 0,
      puntaje_maximo: puntajeANumero(puntajeTema),
      garantizado,
      motivo,
      detalle,
    });
  }

  const disponible = todosGarantizados && temas.length > 0;
  const puntajeTotal = disponible
    ? puntajeANumero(sumarPuntajesDecimales(puntajesTemas))
    : null;

  const preguntasUnicas = new Map<number, PreguntaPuntajeCalculo>();

  for (const pregunta of preguntas) {
    if (!preguntasUnicas.has(pregunta.pregunta_id)) {
      preguntasUnicas.set(pregunta.pregunta_id, pregunta);
    }
  }

  return {
    origen: 'calculo_previo',
    disponible: disponible && puntajeTotal !== null,
    puntaje_total: puntajeTotal,
    temas: temas.sort((a, b) =>
      a.nombre_tema.localeCompare(b.nombre_tema, 'es'),
    ),
    preguntas: [...preguntasUnicas.values()].map((pregunta) => ({
      pregunta_id: pregunta.pregunta_id,
      tema_id: pregunta.tema_id,
      enunciado: pregunta.enunciado,
      puntaje_maximo: puntajeANumero(pregunta.puntaje),
      incisos: pregunta.incisos.map((inciso) => ({
        letra: inciso.letra,
        puntaje_max: puntajeANumero(inciso.puntaje),
      })),
    })),
    preguntas_sin_puntaje: preguntasSinPuntaje,
    motivo: disponible ? null : (primerMotivo ?? 'sin_criterios'),
    detalle: disponible ? null : primerDetalle,
  };
}

/**
 * Resumen definitivo leído de la instantánea. No reconstruye ni recalcula
 * nada: solo convierte los valores guardados al contrato del endpoint.
 */
export function calcularPuntajesInstantanea(
  datos: DatosInstantaneaResumen | null,
): ResumenPuntajes {
  if (!datos) {
    return resumenSinPuntajes(
      'instantanea',
      'sin_instantanea',
      'La evaluación está publicada pero no tiene una instantánea del pool aleatorio.',
    );
  }

  const puntajeTotal = parsearPuntajeDecimal(
    datos.puntaje_maximo_garantizado,
  );
  const puntajeTotalNumero = puntajeANumero(puntajeTotal);

  if (!puntajeTotal || puntajeTotalNumero === null) {
    return resumenSinPuntajes(
      'instantanea',
      'instantanea_invalida',
      'La instantánea del pool aleatorio contiene un puntaje total inválido.',
    );
  }

  const temas: TemaPuntajeResumen[] = [];
  let instantaneaValida = true;

  for (const tema of datos.temas) {
    const puntaje = parsearPuntajeDecimal(tema.puntaje_maximo_tema);
    const puntajeNumero = puntajeANumero(puntaje);

    if (puntajeNumero === null) {
      instantaneaValida = false;
    }

    temas.push({
      tema_id: tema.tema_id,
      nombre_tema: tema.nombre_tema,
      cantidad_candidatas: Number(tema.cantidad_candidatas),
      cantidad_seleccionada: Number(tema.cantidad_seleccionada),
      puntaje_maximo: puntajeNumero,
      garantizado: puntajeNumero !== null,
      motivo: puntajeNumero === null ? 'instantanea_invalida' : null,
      detalle:
        puntajeNumero === null
          ? `La instantánea del tema "${tema.nombre_tema}" contiene un puntaje inválido.`
          : null,
    });
  }

  if (!instantaneaValida) {
    return {
      origen: 'instantanea',
      disponible: false,
      puntaje_total: null,
      temas,
      preguntas: [],
      preguntas_sin_puntaje: [],
      motivo: 'instantanea_invalida',
      detalle:
        'La instantánea del pool aleatorio contiene puntajes de tema inválidos.',
    };
  }

  return {
    origen: 'instantanea',
    disponible: true,
    puntaje_total: puntajeTotalNumero,
    temas,
    preguntas: datos.preguntas.map((pregunta) => ({
      pregunta_id: pregunta.pregunta_id,
      tema_id: pregunta.tema_id,
      enunciado: null,
      puntaje_maximo: puntajeANumero(
        parsearPuntajeDecimal(pregunta.puntaje_maximo_pregunta),
      ),
      incisos: pregunta.incisos.map((inciso) => ({
        letra: inciso.letra,
        puntaje_max: puntajeANumero(
          parsearPuntajeDecimal(inciso.puntaje_max),
        ),
      })),
    })),
    preguntas_sin_puntaje: [],
    motivo: null,
    detalle: null,
  };
}
