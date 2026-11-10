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
import { ExamenTema } from '../examentema/entity/examentema.entity';

import { ExamenController } from './examen.controller';
import { ExamenEstudianteController } from './examen-estudiante.controller';
import { ExamenEstudianteRecursosController } from './examen-estudiante-recursos.controller';
import { PreguntaModule } from '../pregunta/pregunta.module';
import { ExamenService } from './examen.service';
import { ExamenAccesoService } from './examen-acceso.service';
import { RendicionService } from '../rendicion/rendicion.service';
import { RendicionVencimientoWorker } from '../rendicion/rendicion-vencimiento.worker';

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
            ExamenTema,
            AsignacionPregunta,
        ]),
        PreguntaModule,
    ],
    controllers: [
        ExamenController,
        ExamenEstudianteController,
        ExamenEstudianteRecursosController,
    ],
    providers: [
        ExamenService,
        ExamenAccesoService,
        RendicionService,
        RendicionVencimientoWorker,
    ],
})
export class ExamenModule { }
