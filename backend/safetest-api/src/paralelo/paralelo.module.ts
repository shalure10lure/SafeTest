
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Paralelo } from './entity/paralelo.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Semestre } from '../semestre/entity/semestre.entity';

import { ParaleloController } from './paralelo.controller';
import { ParaleloService } from './paralelo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Paralelo,
      Materia,
      Semestre,
    ]),
  ],
  controllers: [ParaleloController],
  providers: [ParaleloService],
})
export class ParaleloModule {}
