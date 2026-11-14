import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { ExamenPoolSnapshotInciso } from '../examenpoolsnapshot/entity/examen-pool-snapshot-inciso.entity';
import { ExamenPoolSnapshotPregunta } from '../examenpoolsnapshot/entity/examen-pool-snapshot-pregunta.entity';
import { Materia } from '../materia/entity/materia.entity';
import { PreguntaRecurso } from '../preguntarecurso/entity/preguntarecurso.entity';
import { Pregunta } from './entity/pregunta.entity';
import { Tema } from '../tema/entity/tema.entity';
import { PreguntaCongeladaService } from './pregunta-congelada.service';
import { PreguntaController } from './pregunta.controller';
import { PreguntaService } from './pregunta.service';
import { AlmacenImagenesPregunta } from './recursos/almacen-imagenes-pregunta';
import { RecursosConfigModule } from './recursos/recursos-config.module';
import { RecursosTamanoFilter } from './recursos/recursos-tamano.filter';
import {
  RECURSOS_CONFIG,
  type RecursosConfig,
} from './recursos/recursos.config';
import { PreguntaRecursosService } from './recursos/recursos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pregunta,
      Tema,
      Materia,
      ExamenPregunta,
      ExamenPoolSnapshotInciso,
      ExamenPoolSnapshotPregunta,
      PreguntaRecurso,
    ]),
    RecursosConfigModule,
    // El límite de multer sale de la misma configuración que valida el servicio.
    MulterModule.registerAsync({
      imports: [RecursosConfigModule],
      inject: [RECURSOS_CONFIG],
      useFactory: (config: RecursosConfig) => ({
        limits: { fileSize: config.maxBytesImagen, files: 1 },
      }),
    }),
  ],
  controllers: [PreguntaController],
  providers: [
    PreguntaService,
    PreguntaCongeladaService,
    PreguntaRecursosService,
    AlmacenImagenesPregunta,
    RecursosTamanoFilter,
  ],
  exports: [
    PreguntaService,
    PreguntaRecursosService,
    PreguntaCongeladaService,
  ],
})
export class PreguntaModule {}