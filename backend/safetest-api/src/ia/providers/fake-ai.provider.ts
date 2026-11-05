import type {
  PreguntaIa,
  ResultadoGeneracionIa,
  SolicitudGeneracionIa,
} from '../ai.types';
import type { AiProvider } from './ai.provider';

interface FakeAiProviderOptions {
  modelo: string | null;
}

/**
 * Proveedor simulado para desarrollo, pruebas y CI. No usa red ni consume
 * créditos, y devuelve propuestas deterministas que cumplen las reglas del
 * banco para cada tipo de pregunta.
 */
export class FakeAiProvider implements AiProvider {
  constructor(private readonly options: FakeAiProviderOptions) {}

  async generarPreguntas(
    solicitud: SolicitudGeneracionIa,
  ): Promise<ResultadoGeneracionIa> {
    const cantidad = Math.max(0, Math.floor(solicitud.cantidad));

    const preguntas = Array.from({ length: cantidad }, (_, indice) =>
      this.crearPregunta(solicitud, indice + 1),
    );

    return {
      preguntas,
      proveedor: 'fake',
      modelo: this.options.modelo ?? 'fake',
      tokens: {
        entrada: 250 * cantidad,
        salida: 120 * cantidad,
        total: 370 * cantidad,
      },
    };
  }

  private crearPregunta(
    solicitud: SolicitudGeneracionIa,
    numero: number,
  ): PreguntaIa {
    const base = {
      enunciado: `[Simulada ${numero}] ${solicitud.materia} - ${solicitud.tema} (${solicitud.dificultad})`,
      tipo_respuesta: solicitud.tipo_respuesta,
      explicacion:
        'Propuesta generada por el proveedor fake para pruebas del flujo.',
    };

    switch (solicitud.tipo_respuesta) {
      case 'opcion_unica':
        return {
          ...base,
          opciones: [
            {
              texto_opcion: `Opción correcta ${numero}`,
              es_correcta: true,
            },
            {
              texto_opcion: `Opción incorrecta ${numero}`,
              es_correcta: false,
            },
          ],
        };

      case 'opcion_multiple':
        return {
          ...base,
          opciones: [
            {
              texto_opcion: `Opción correcta A ${numero}`,
              es_correcta: true,
            },
            {
              texto_opcion: `Opción correcta B ${numero}`,
              es_correcta: true,
            },
            {
              texto_opcion: `Opción incorrecta ${numero}`,
              es_correcta: false,
            },
          ],
        };

      case 'verdadero_falso':
        return {
          ...base,
          opciones: [
            {
              texto_opcion: 'Verdadero',
              es_correcta: numero % 2 === 1,
            },
            {
              texto_opcion: 'Falso',
              es_correcta: numero % 2 === 0,
            },
          ],
        };

      case 'numerica':
        return {
          ...base,
          valor_correcto: numero * 10,
          tolerancia: 0.5,
        };

      case 'desarrollo':
        return {
          ...base,
          solucion_referencia: `Respuesta esperada de la pregunta ${numero}: explica el procedimiento y justifica el resultado.`,
        };
    }

    throw new Error(
      `Tipo de pregunta no soportado por el proveedor fake: ${solicitud.tipo_respuesta}`,
    );
  }
}
