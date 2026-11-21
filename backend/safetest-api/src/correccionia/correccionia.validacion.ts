import { incisoRespondido } from '../rendicion/validacion-respuesta';
import type { IaSolucionReferencia } from '../iasolucionreferencia/entity/iasolucionreferencia.entity';
import type { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';

export type CodigoErrorValidacionCorreccionIa =
  | 'RESPUESTA_VACIA'
  | 'SIN_CRITERIOS'
  | 'INCISO_NO_PENDIENTE'
  | 'PUNTAJE_MAX_INVALIDO'
  | 'PUNTAJE_FUERA_DE_RANGO'
  | 'CONFIANZA_FUERA_DE_RANGO';

export class ErrorValidacionCorreccionIa extends Error {
  constructor(
    readonly codigo: CodigoErrorValidacionCorreccionIa,
    readonly motivo: string,
  ) {
    super(motivo);
    this.name = 'ErrorValidacionCorreccionIa';
  }
}

export interface EntradaValidacionSolicitudCorreccionIa {
  estado_correccion: string;
  tipo_respuesta: string;
  respuesta_texto: string | null;
  opciones_marcadas: number;
  puntaje_max: number | string;
  solucion_inciso?: Pick<SolucionInciso, 'valor_correcto' | 'rubrica'> | null;
  solucion_referencia?: Pick<IaSolucionReferencia, 'revisada_en'> | null;
}

export interface EntradaValidacionResultadoCorreccionIa {
  puntaje_max: number | string;
  puntaje_sugerido: number | string | null;
  confianza: number | string | null;
}

export function validarSolicitudCorreccionIa(
  entrada: EntradaValidacionSolicitudCorreccionIa,
): void {
  if (entrada.estado_correccion !== 'pendiente') {
    throw new ErrorValidacionCorreccionIa(
      'INCISO_NO_PENDIENTE',
      'El inciso ya fue corregido y no está pendiente de revisión manual.',
    );
  }

  if (
    !incisoRespondido(
      entrada.tipo_respuesta,
      entrada.respuesta_texto,
      entrada.opciones_marcadas,
    )
  ) {
    throw new ErrorValidacionCorreccionIa(
      'RESPUESTA_VACIA',
      'La respuesta está vacía o incompleta para el tipo de inciso.',
    );
  }

  validarCriteriosSuficientes(entrada);
  validarPuntajeMaximo(entrada.puntaje_max);
}

export function validarResultadoCorreccionIa(
  entrada: EntradaValidacionResultadoCorreccionIa,
): void {
  const puntajeMaximo = validarPuntajeMaximo(entrada.puntaje_max);

  const puntajeSugerido = convertirNumeroFinito(entrada.puntaje_sugerido);
  if (
    puntajeSugerido === null ||
    puntajeSugerido < 0 ||
    puntajeSugerido > puntajeMaximo
  ) {
    throw new ErrorValidacionCorreccionIa(
      'PUNTAJE_FUERA_DE_RANGO',
      'El puntaje sugerido debe ser un número finito entre 0 y el puntaje máximo.',
    );
  }

  if (entrada.confianza !== null) {
    const confianza = convertirNumeroFinito(entrada.confianza);
    if (confianza === null || confianza < 0 || confianza > 1) {
      throw new ErrorValidacionCorreccionIa(
        'CONFIANZA_FUERA_DE_RANGO',
        'La confianza debe ser nula o un número entre 0 y 1.',
      );
    }
  }
}

function validarPuntajeMaximo(valor: number | string): number {
  const puntajeMaximo = convertirNumeroFinito(valor);
  if (puntajeMaximo === null || puntajeMaximo <= 0) {
    throw new ErrorValidacionCorreccionIa(
      'PUNTAJE_MAX_INVALIDO',
      'El puntaje máximo debe ser un número finito mayor que 0.',
    );
  }
  return puntajeMaximo;
}

function validarCriteriosSuficientes(
  entrada: Pick<
    EntradaValidacionSolicitudCorreccionIa,
    'solucion_inciso' | 'solucion_referencia'
  >,
): void {
  const valorCorrecto = entrada.solucion_inciso?.valor_correcto;
  const tieneValorCorrectoFinito =
    convertirNumeroFinito(valorCorrecto) !== null;
  const tieneRubrica =
    (entrada.solucion_inciso?.rubrica.trim().length ?? 0) > 0;
  const fechaRevision = entrada.solucion_referencia?.revisada_en;
  const tieneReferenciaRevisada =
    fechaRevision instanceof Date && Number.isFinite(fechaRevision.getTime());

  if (!tieneValorCorrectoFinito && !tieneRubrica && !tieneReferenciaRevisada) {
    throw new ErrorValidacionCorreccionIa(
      'SIN_CRITERIOS',
      'No hay un valor correcto finito, una rúbrica no vacía ni una solución de referencia revisada.',
    );
  }
}

function convertirNumeroFinito(
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
