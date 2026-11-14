import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReglaCorreccion } from './entity/reglacorreccion.entity';
import { CorreccionRendicionService } from './correccion-rendicion.service';
import { ReglaCorreccionController } from './reglacorreccion.controller';
import { ReglaCorreccionService } from './reglacorreccion.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReglaCorreccion])],
  controllers: [ReglaCorreccionController],
  providers: [ReglaCorreccionService, CorreccionRendicionService],
  exports: [ReglaCorreccionService, CorreccionRendicionService],
})
export class ReglaCorreccionModule {}
