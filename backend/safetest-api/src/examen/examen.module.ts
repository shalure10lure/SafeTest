import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Examen } from './entity/examen.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Semestre } from '../semestre/entity/semestre.entity';
import { Paralelo } from '../paralelo/entity/paralelo.entity';
import { ParaleloExamen } from '../paraleloexamen/entity/paraleloexamen.entity';

import { ExamenController } from './examen.controller';
import { ExamenService } from './examen.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Examen,
            Materia,
            Semestre,
            Paralelo,
            ParaleloExamen,
        ]),
    ],
    controllers: [ExamenController],
    providers: [ExamenService],
})
export class ExamenModule { }