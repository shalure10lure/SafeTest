import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Examen } from './entity/examen.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Semestre } from '../semestre/entity/semestre.entity';
import { Paralelo } from '../paralelo/entity/paralelo.entity';
import { ParaleloExamen } from '../paraleloexamen/entity/paraleloexamen.entity';
import { ExamenEstudiante } from '../examenestudiante/entity/examenestudiante.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';
import { Pregunta } from '../pregunta/entity/pregunta.entity';
import { Tema } from '../tema/entity/tema.entity';

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
            ExamenEstudiante,
            Inscripcion,
            Pregunta,
            Tema,
        ]),
    ],
    controllers: [ExamenController],
    providers: [ExamenService],
})
export class ExamenModule { }