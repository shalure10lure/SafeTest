import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExamenModule } from '../examen/examen.module';
import { CorreccionIa } from './entity/correccionia.entity';
import { CorreccionIaService } from './correccionia.service';

@Module({
  imports: [TypeOrmModule.forFeature([CorreccionIa]), ExamenModule],
  providers: [CorreccionIaService],
  exports: [CorreccionIaService],
})
export class CorreccionIaModule {}
