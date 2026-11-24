import type {
  ResultadoCorreccionRespuesta,
  ResultadoGeneracionIa,
  SolicitudCorreccionRespuesta,
  SolicitudGeneracionIa,
} from '../ai.types';

/**
 * Contrato que debe cumplir cualquier proveedor de IA. Los servicios de
 * generación y corrección dependen de esta interfaz, nunca de un proveedor
 * concreto.
 */
export interface AiProvider {
  generarPreguntas(
    solicitud: SolicitudGeneracionIa,
  ): Promise<ResultadoGeneracionIa>;

  corregirRespuesta(
    solicitud: SolicitudCorreccionRespuesta,
  ): Promise<ResultadoCorreccionRespuesta>;
}

/** Token de inyección para el proveedor seleccionado por configuración. */
export const AI_PROVIDER = Symbol('AI_PROVIDER');

/** Token independiente para el proveedor de corrección de HU-45. */
export const AI_CORRECCION_PROVIDER = Symbol('AI_CORRECCION_PROVIDER');
