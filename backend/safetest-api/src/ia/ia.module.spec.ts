import { AI_CORRECCION_PROVIDER, AI_PROVIDER } from './providers/ai.provider';
import { IaModule } from './ia.module';

describe('IaModule', () => {
  it('registra y exporta un token de corrección independiente', () => {
    const providers = Reflect.getMetadata('providers', IaModule) as Array<{
      provide?: unknown;
    }>;
    const exports = Reflect.getMetadata('exports', IaModule) as unknown[];

    expect(providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provide: AI_PROVIDER }),
        expect.objectContaining({ provide: AI_CORRECCION_PROVIDER }),
      ]),
    );
    expect(exports).toContain(AI_PROVIDER);
    expect(exports).toContain(AI_CORRECCION_PROVIDER);
  });
});
