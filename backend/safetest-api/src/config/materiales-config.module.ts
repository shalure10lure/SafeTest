import { Module } from '@nestjs/common';

import {
  cargarConfiguracionMateriales,
  MATERIALES_CONFIG,
} from './materiales.config';

/**
 * Expone la configuración de materiales como módulo propio para que
 * `MulterModule.registerAsync` pueda inyectarla sin duplicar la lectura del
 * entorno.
 */
@Module({
  providers: [
    {
      provide: MATERIALES_CONFIG,
      useFactory: () => cargarConfiguracionMateriales(process.env),
    },
  ],
  exports: [MATERIALES_CONFIG],
})
export class MaterialesConfigModule {}
