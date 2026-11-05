import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IaModule } from '../ia/ia.module';
import { IaGeneracionMaterial } from '../iageneracionmaterial/entity/iageneracionmaterial.entity';
import { IaPropuestaPregunta } from '../iapropuestapregunta/entity/iapropuestapregunta.entity';
import { MaterialAcademico } from '../materialacademico/entity/materialacademico.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Tema } from '../tema/entity/tema.entity';
import { IaGeneracion } from './entity/iageneracion.entity';
import { PreguntaModule } from '../pregunta/pregunta.module';
import { IaGeneracionController } from './iageneracion.controller';
import { IaGeneracionService } from './iageneracion.service';
import { IaGeneracionWorker } from './iageneracion.worker';
import { ALMACEN_GENERACIONES } from './iageneracion.types';

/**
 * Generación asíncrona de preguntas con IA.
 *
 * Expone IaGeneracionService para que las capas superiores creen y consulten
 * generaciones; el worker las procesa en segundo plano con AiProvider.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      IaGeneracion,
      IaGeneracionMaterial,
      IaPropuestaPregunta,
      MaterialAcademico,
      Materia,
      Tema,
    ]),
    IaModule,
    PreguntaModule,
  ],
  controllers: [IaGeneracionController],
  providers: [
    IaGeneracionService,
    {
      provide: ALMACEN_GENERACIONES,
      useExisting: IaGeneracionService,
    },
    IaGeneracionWorker,
  ],
  exports: [IaGeneracionService],
})
export class IaGeneracionModule {}
