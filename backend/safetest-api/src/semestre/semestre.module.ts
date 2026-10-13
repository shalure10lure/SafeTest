import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Semestre } from './entity/semestre.entity';
import { Materia } from '../materia/entity/materia.entity';
import { SemestreController } from './semestre.controller';
import { SemestreService } from './semestre.service';

@Module({
    imports: [TypeOrmModule.forFeature([Semestre, Materia])],
    controllers: [SemestreController],
    providers: [SemestreService],
})
export class SemestreModule { }