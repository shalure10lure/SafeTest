import { Module } from '@nestjs/common';

import { PanelDocenteController } from './panel-docente.controller';
import { PanelDocenteService } from './panel-docente.service';

/**
 * No necesita TypeOrmModule.forFeature: usa el DataSource global que ya
 * registra TypeOrmModule.forRootAsync en AppModule.
 */
@Module({
  controllers: [PanelDocenteController],
  providers: [PanelDocenteService],
})
export class PanelDocenteModule {}
