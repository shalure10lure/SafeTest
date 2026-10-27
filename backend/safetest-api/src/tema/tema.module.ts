import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Tema } from './entity/tema.entity';
import { Materia } from '../materia/entity/materia.entity';
import { TemaController } from './tema.controller';
import { TemaService } from './tema.service';

@Module({
    imports: [TypeOrmModule.forFeature([Tema, Materia])],
    controllers: [TemaController],
    providers: [TemaService],
})
export class TemaModule { }