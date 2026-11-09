import { Module } from '@nestjs/common';

import { cargarConfiguracionRecursos, RECURSOS_CONFIG } from './recursos.config';

/** Expone la configuración de recursos para multer, el servicio y el almacén. */
@Module({
  providers: [
    {
      provide: RECURSOS_CONFIG,
      useFactory: () => cargarConfiguracionRecursos(),
    },
  ],
  exports: [RECURSOS_CONFIG],
})
export class RecursosConfigModule {}