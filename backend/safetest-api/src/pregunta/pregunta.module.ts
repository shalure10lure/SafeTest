
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { Pregunta } from './entity/pregunta.entity';
import { Tema } from '../tema/entity/tema.entity';
import { PreguntaController } from './pregunta.controller';
import { PreguntaService } from './pregunta.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pregunta, Tema,ExamenPregunta,]),
  ],
  controllers: [PreguntaController],
  providers: [PreguntaService],
  exports: [PreguntaService],
})
export class PreguntaModule {}
