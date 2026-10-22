
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Docente } from '../docente/entity/docente.entity';
import { ConexionCorreo } from './entity/conexion-correo.entity';

import { ConexionCorreoService } from './conexion-correo.service';
import { ConexionCorreoController } from './conexion-correo.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ConexionCorreo,
      Docente,
    ]),
  ],
  controllers: [
    ConexionCorreoController,
  ],
  providers: [
    ConexionCorreoService,
  ],
  exports: [
    ConexionCorreoService,
  ],
})
export class ConexionCorreoModule {}
