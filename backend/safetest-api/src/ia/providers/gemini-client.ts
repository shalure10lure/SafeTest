import { GoogleGenAI } from '@google/genai';

import type { TokensIa } from '../ai.types';

/** Respuesta normalizada que el adaptador necesita del SDK. */
export interface RespuestaGemini {
  texto: string | null;
  /** `finishReason` del primer candidato, si el SDK lo informa. */
  motivoFinalizacion: string | null;
  /** Motivo de bloqueo por filtros de contenido, si aplica. */
  bloqueo: string | null;
  tokens: TokensIa;
}

/** Petición de generación ya preparada por el adaptador. */
export interface PeticionGemini {
  modelo: string;
  contenido: string;
  instruccionSistema: string;
  esquemaJson: unknown;
  maxOutputTokens: number;
  timeoutMs: number;
  senalAborto: AbortSignal;
}

/**
 * Puerto que aísla al adaptador del SDK concreto. Permite probar la lógica de
 * validación y de errores sin red ni credenciales.
 */
export interface ClienteGemini {
  generarContenido(peticion: PeticionGemini): Promise<RespuestaGemini>;
}

/** Parte del SDK que se utiliza; facilita inyectar un doble en pruebas. */
export type SdkGemini = Pick<GoogleGenAI, 'models'>;

/**
 * Crea el cliente real sobre `@google/genai`. La API key se mantiene en el
 * backend y nunca se registra en logs ni se incluye en las respuestas.
 */
export function crearClienteGeminiSdk(
  apiKey: string,
  sdk: SdkGemini = new GoogleGenAI({ apiKey }),
): ClienteGemini {
  return {
    async generarContenido(peticion) {
      const respuesta = await sdk.models.generateContent({
        model: peticion.modelo,
        contents: peticion.contenido,
        config: {
          systemInstruction: peticion.instruccionSistema,
          responseMimeType: 'application/json',
          responseJsonSchema: peticion.esquemaJson,
          maxOutputTokens: peticion.maxOutputTokens,
          // Baja la variabilidad sin volver las preguntas repetitivas.
          temperature: 0.4,
          abortSignal: peticion.senalAborto,
          httpOptions: { timeout: peticion.timeoutMs },
        },
      });

      return {
        texto: respuesta.text ?? null,
        motivoFinalizacion: respuesta.candidates?.[0]?.finishReason ?? null,
        bloqueo: respuesta.promptFeedback?.blockReason ?? null,
        tokens: {
          entrada: respuesta.usageMetadata?.promptTokenCount ?? null,
          salida: respuesta.usageMetadata?.candidatesTokenCount ?? null,
          total: respuesta.usageMetadata?.totalTokenCount ?? null,
        },
      };
    },
  };
}
