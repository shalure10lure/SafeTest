import type {
  ResultadoGeneracionIa,
  SolicitudGeneracionIa,
} from '../ai.types';

/**
 * Contrato que debe cumplir cualquier proveedor de IA. Los servicios de
 * generación dependen de esta interfaz, nunca de un proveedor concreto.
 */
export interface AiProvider {
  generarPreguntas(
    solicitud: SolicitudGeneracionIa,
  ): Promise<ResultadoGeneracionIa>;
}

/** Token de inyección para el proveedor seleccionado por configuración. */
export const AI_PROVIDER = Symbol('AI_PROVIDER');
