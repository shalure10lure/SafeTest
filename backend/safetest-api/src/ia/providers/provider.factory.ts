import {
  ErrorConfiguracionIa,
  type IaConfig,
} from '../../config/ia.config';
import type { AiProvider } from './ai.provider';
import { FakeAiProvider } from './fake-ai.provider';
import { GeminiAiProvider } from './gemini-ai.provider';
import { crearClienteGeminiSdk } from './gemini-client';

/**
 * T2 usa el proveedor fake de forma independiente al proveedor de generación.
 * La selección de Gemini para corrección se incorpora en T3.
 */
export function crearProveedorCorreccionIa(): AiProvider {
  return new FakeAiProvider({ modelo: 'fake' });
}

/**
 * Construye el proveedor seleccionado por configuración. Para incorporar un
 * proveedor nuevo basta con implementar AiProvider y añadir su caso aquí.
 */
export function crearProveedorIa(config: IaConfig): AiProvider {
  switch (config.proveedor) {
    case 'fake':
      return new FakeAiProvider({ modelo: config.modelo });

    case 'gemini': {
      const { apiKey, modelo } = config;

      if (!apiKey) {
        throw new ErrorConfiguracionIa([
          'GEMINI_API_KEY es obligatoria cuando IA_PROVIDER=gemini.',
        ]);
      }

      if (!modelo) {
        throw new ErrorConfiguracionIa([
          'GEMINI_MODEL es obligatoria cuando IA_PROVIDER=gemini.',
        ]);
      }

      return new GeminiAiProvider({
        config,
        cliente: crearClienteGeminiSdk(apiKey),
      });
    }
  }
}
