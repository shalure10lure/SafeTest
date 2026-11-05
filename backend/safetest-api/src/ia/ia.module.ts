import { Module } from '@nestjs/common';

import {
  cargarConfiguracionIa,
  IA_CONFIG,
  type IaConfig,
} from '../config/ia.config';
import { AI_PROVIDER } from './providers/ai.provider';
import { crearProveedorIa } from './providers/provider.factory';

/**
 * Expone la configuración de IA y el proveedor seleccionado.
 *
 * El worker de generación (IaGeneracionModule) consume ambos tokens; los
 * servicios de generación dependen de AI_PROVIDER, nunca de Gemini.
 */
@Module({
  providers: [
    {
      provide: IA_CONFIG,
      useFactory: () => cargarConfiguracionIa(process.env),
    },
    {
      provide: AI_PROVIDER,
      useFactory: (config: IaConfig) => crearProveedorIa(config),
      inject: [IA_CONFIG],
    },
  ],
  exports: [AI_PROVIDER, IA_CONFIG],
})
export class IaModule {}
