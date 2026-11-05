import type { GenerateContentParameters } from '@google/genai';

import { crearClienteGeminiSdk, type SdkGemini } from './gemini-client';
import type { PeticionGemini } from './gemini-client';

const ESQUEMA = { type: 'object', properties: {} };

function crearPeticion(
  sobrescribir: Partial<PeticionGemini> = {},
): PeticionGemini {
  return {
    modelo: 'modelo-de-prueba',
    contenido: 'Materia: Matemática',
    instruccionSistema: 'Eres un docente experto.',
    esquemaJson: ESQUEMA,
    maxOutputTokens: 4096,
    timeoutMs: 5000,
    senalAborto: new AbortController().signal,
    ...sobrescribir,
  };
}

class SdkFalso {
  readonly llamadas: GenerateContentParameters[] = [];

  constructor(private readonly respuesta: unknown) {}

  async generateContent(params: GenerateContentParameters): Promise<unknown> {
    this.llamadas.push(params);

    return this.respuesta;
  }
}

function crearSdk(respuesta: unknown): {
  sdk: SdkGemini;
  llamadas: GenerateContentParameters[];
} {
  const falso = new SdkFalso(respuesta);

  return {
    sdk: { models: falso } as unknown as SdkGemini,
    llamadas: falso.llamadas,
  };
}

describe('crearClienteGeminiSdk', () => {
  it('configura la llamada con salida JSON estructurada y timeout', async () => {
    const { sdk, llamadas } = crearSdk({
      text: '{"preguntas":[]}',
      candidates: [{ finishReason: 'STOP' }],
      usageMetadata: {
        promptTokenCount: 12,
        candidatesTokenCount: 34,
        totalTokenCount: 46,
      },
    });
    const peticion = crearPeticion();

    const cliente = crearClienteGeminiSdk('clave-de-prueba', sdk);
    const respuesta = await cliente.generarContenido(peticion);

    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]).toEqual({
      model: 'modelo-de-prueba',
      contents: 'Materia: Matemática',
      config: {
        systemInstruction: 'Eres un docente experto.',
        responseMimeType: 'application/json',
        responseJsonSchema: ESQUEMA,
        maxOutputTokens: 4096,
        temperature: 0.4,
        abortSignal: peticion.senalAborto,
        httpOptions: { timeout: 5000 },
      },
    });
    expect(respuesta).toEqual({
      texto: '{"preguntas":[]}',
      motivoFinalizacion: 'STOP',
      bloqueo: null,
      tokens: { entrada: 12, salida: 34, total: 46 },
    });
  });

  it('normaliza respuestas sin texto ni metadatos', async () => {
    const { sdk } = crearSdk({});

    const cliente = crearClienteGeminiSdk('clave-de-prueba', sdk);
    const respuesta = await cliente.generarContenido(crearPeticion());

    expect(respuesta.texto).toBeNull();
    expect(respuesta.motivoFinalizacion).toBeNull();
    expect(respuesta.bloqueo).toBeNull();
    expect(respuesta.tokens).toEqual({
      entrada: null,
      salida: null,
      total: null,
    });
  });

  it('expone el bloqueo por filtros de contenido', async () => {
    const { sdk } = crearSdk({ promptFeedback: { blockReason: 'SAFETY' } });

    const cliente = crearClienteGeminiSdk('clave-de-prueba', sdk);
    const respuesta = await cliente.generarContenido(crearPeticion());

    expect(respuesta.bloqueo).toBe('SAFETY');
  });
});
