import {
  cargarConfiguracionIa,
  ErrorConfiguracionIa,
  type IaConfig,
} from '../../config/ia.config';
import { FakeAiProvider } from './fake-ai.provider';
import { GeminiAiProvider } from './gemini-ai.provider';
import { crearProveedorIa } from './provider.factory';

function configGemini(
  base: IaConfig = cargarConfiguracionIa({ IA_PROVIDER: 'fake' }),
  sobrescribir: Partial<IaConfig> = {},
): IaConfig {
  return {
    ...base,
    proveedor: 'gemini',
    apiKey: 'clave-de-prueba',
    modelo: 'modelo-de-prueba',
    ...sobrescribir,
  };
}

describe('crearProveedorIa', () => {
  it('selecciona FakeAiProvider cuando IA_PROVIDER=fake', () => {
    const proveedor = crearProveedorIa(
      cargarConfiguracionIa({ IA_PROVIDER: 'fake' }),
    );

    expect(proveedor).toBeInstanceOf(FakeAiProvider);
  });

  it('exige selección explícita del proveedor', () => {
    expect(() => cargarConfiguracionIa({})).toThrow(ErrorConfiguracionIa);
  });

  it('genera preguntas offline para todos los tipos de respuesta con el fake', async () => {
    const proveedor = crearProveedorIa(
      cargarConfiguracionIa({ IA_PROVIDER: 'fake' }),
    );
    const tipos = [
      'opcion_unica',
      'opcion_multiple',
      'verdadero_falso',
      'numerica',
      'desarrollo',
    ] as const;

    for (const tipo of tipos) {
      const resultado = await proveedor.generarPreguntas({
        materia: 'Matemática',
        tema: 'Derivadas',
        tipo_respuesta: tipo,
        cantidad: 1,
        dificultad: 'media',
        materiales: [],
      });

      expect(resultado.proveedor).toBe('fake');
      expect(resultado.preguntas).toHaveLength(1);
      expect(resultado.preguntas[0].tipo_respuesta).toBe(tipo);
    }
  });

  it('selecciona GeminiAiProvider cuando IA_PROVIDER=gemini y hay credenciales', () => {
    const proveedor = crearProveedorIa(
      cargarConfiguracionIa({
        IA_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'clave-de-prueba',
        GEMINI_MODEL: 'modelo-de-prueba',
      }),
    );

    expect(proveedor).toBeInstanceOf(GeminiAiProvider);
  });

  it('rechaza gemini sin GEMINI_API_KEY', () => {
    expect(() => crearProveedorIa(configGemini(undefined, { apiKey: null })))
      .toThrow(ErrorConfiguracionIa);
  });

  it('rechaza gemini sin GEMINI_MODEL', () => {
    expect(() => crearProveedorIa(configGemini(undefined, { modelo: null })))
      .toThrow(ErrorConfiguracionIa);
  });
});
