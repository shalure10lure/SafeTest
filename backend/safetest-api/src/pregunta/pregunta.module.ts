import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pregunta } from './entity/pregunta.entity';
import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { PreguntaController } from './pregunta.controller';
import { PreguntaService } from './pregunta.service';

@Module({
    imports: [TypeOrmModule.forFeature([Pregunta, ExamenPregunta])],
    controllers: [PreguntaController],
    providers: [PreguntaService],
})
export class PreguntaModule { }