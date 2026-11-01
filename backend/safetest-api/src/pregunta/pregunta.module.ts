
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Pregunta } from './entity/pregunta.entity';
import { Tema } from '../tema/entity/tema.entity';
import { PreguntaController } from './pregunta.controller';
import { PreguntaService } from './pregunta.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pregunta, Tema, Materia, ExamenPregunta]),
  ],
  controllers: [PreguntaController],
  providers: [PreguntaService],
  exports: [PreguntaService],
})
export class PreguntaModule {}
