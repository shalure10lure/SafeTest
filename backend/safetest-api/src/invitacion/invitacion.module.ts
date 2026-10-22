
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Invitacion } from './entity/invitacion.entity';
import { Paralelo } from '../paralelo/entity/paralelo.entity';
import { Estudiante } from '../estudiante/entity/estudiante.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';

import { InvitacionController } from './invitacion.controller';
import { InvitacionService } from './invitacion.service';
import { ConexionCorreoModule } from '../conexion-correo/conexion-correo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invitacion,
      Paralelo,
      Estudiante,
      Inscripcion,
    ]),
    ConexionCorreoModule,
  ],
  controllers: [InvitacionController],
  providers: [InvitacionService],
})
export class InvitacionModule {}
