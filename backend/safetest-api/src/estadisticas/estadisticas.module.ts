import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { Examen } from '../examen/entity/examen.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Semestre } from '../semestre/entity/semestre.entity';
import { Paralelo } from '../paralelo/entity/paralelo.entity';

import { EstadisticasController } from './estadisticas.controller';
import { EstadisticasService } from './estadisticas.service';
import { EstadisticasPanelService } from './estadisticas-panel.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Rendicion,
      Examen,
      Materia,
      Semestre,
      Paralelo,
    ]),
  ],
  controllers: [EstadisticasController],
  providers: [EstadisticasService, EstadisticasPanelService],
  exports: [EstadisticasService, EstadisticasPanelService],
})
export class EstadisticasModule {}
