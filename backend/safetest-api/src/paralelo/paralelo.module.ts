
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Paralelo } from './entity/paralelo.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Semestre } from '../semestre/entity/semestre.entity';

import { ParaleloController } from './paralelo.controller';
import { ParaleloService } from './paralelo.service';
import { Estudiante } from '../estudiante/entity/estudiante.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';

import { ParaleloEstudiantesController } from './paralelo-estudiantes.controller';
import { ParaleloEstudiantesService } from './paralelo-estudiantes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Paralelo,
      Materia,
      Semestre,
      Inscripcion,
      Estudiante,
    ]),
  ],
  controllers: [ParaleloController, ParaleloEstudiantesController],
  providers: [ParaleloService, ParaleloEstudiantesService],
})
export class ParaleloModule {}
