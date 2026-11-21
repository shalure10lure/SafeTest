import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExamenModule } from '../examen/examen.module';
import { IaModule } from '../ia/ia.module';
import { CorreccionIaController } from './correccionia.controller';
import { CorreccionIaService } from './correccionia.service';
import { CorreccionIaPropuestaController } from './correccionia-propuesta.controller';
import { CorreccionIa } from './entity/correccionia.entity';
import { ALMACEN_CORRECCION_IA } from './correccionia.types';
import { CorreccionIaWorker } from './correccionia.worker';
import { CorreccionIaWorkerStore } from './correccionia.worker.store';

@Module({
  imports: [TypeOrmModule.forFeature([CorreccionIa]), ExamenModule, IaModule],
  controllers: [CorreccionIaController, CorreccionIaPropuestaController],
  providers: [
    CorreccionIaService,
    CorreccionIaWorkerStore,
    {
      provide: ALMACEN_CORRECCION_IA,
      useExisting: CorreccionIaWorkerStore,
    },
    CorreccionIaWorker,
  ],
  exports: [CorreccionIaService],
})
export class CorreccionIaModule {}
