import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Examen } from './entity/examen.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Semestre } from '../semestre/entity/semestre.entity';
import { Paralelo } from '../paralelo/entity/paralelo.entity';
import { ParaleloExamen } from '../paraleloexamen/entity/paraleloexamen.entity';
import { Estudiante } from '../estudiante/entity/estudiante.entity';
import { ExamenEstudiante } from '../examenestudiante/entity/examenestudiante.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';
import { Pregunta } from '../pregunta/entity/pregunta.entity';
import { Tema } from '../tema/entity/tema.entity';
import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';

import { ExamenController } from './examen.controller';
import { ExamenEstudianteController } from './examen-estudiante.controller';
import { ExamenService } from './examen.service';
import { ExamenAccesoService } from './examen-acceso.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Examen,
            Materia,
            Semestre,
            Paralelo,
            ParaleloExamen,
            ExamenEstudiante,
            Estudiante,
            Inscripcion,
            Pregunta,
            Tema,
            ExamenPregunta,
            AsignacionPregunta,
        ]),
    ],
    controllers: [ExamenController, ExamenEstudianteController],
    providers: [ExamenService, ExamenAccesoService],
})
export class ExamenModule { }
