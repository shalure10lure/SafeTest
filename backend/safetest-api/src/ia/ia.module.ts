import { Module } from '@nestjs/common';

import {
  cargarConfiguracionIa,
  IA_CONFIG,
  type IaConfig,
} from '../config/ia.config';
import { AI_CORRECCION_PROVIDER, AI_PROVIDER } from './providers/ai.provider';
import {
  crearProveedorCorreccionIa,
  crearProveedorIa,
} from './providers/provider.factory';

/**
 * Expone la configuración de IA y el proveedor seleccionado.
 *
 * Generación y corrección usan tokens separados para poder habilitar el fake
 * de HU-45 sin alterar el proveedor configurado para generar preguntas.
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
    {
      provide: AI_CORRECCION_PROVIDER,
      useFactory: (config: IaConfig) => crearProveedorCorreccionIa(config),
      inject: [IA_CONFIG],
    },
  ],
  exports: [AI_PROVIDER, AI_CORRECCION_PROVIDER, IA_CONFIG],
})
export class IaModule {}
