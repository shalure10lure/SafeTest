import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Materia } from './entity/materia.entity';
import { MateriaController } from './materia.controller';
import { MateriaService } from './materia.service';

@Module({
    imports: [TypeOrmModule.forFeature([Materia])],
    controllers: [MateriaController],
    providers: [MateriaService],
    exports: [MateriaService],
})
export class MateriaModule { }