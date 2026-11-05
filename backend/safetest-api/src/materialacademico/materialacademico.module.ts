import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  MATERIALES_CONFIG,
  type MaterialesConfig,
} from '../config/materiales.config';
import { MaterialesConfigModule } from '../config/materiales-config.module';
import { IaGeneracionMaterial } from '../iageneracionmaterial/entity/iageneracionmaterial.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Tema } from '../tema/entity/tema.entity';
import { ALMACEN_ARCHIVOS } from './almacen/almacen-archivos';
import { AlmacenArchivosLocal } from './almacen/almacen-archivos.local';
import { MaterialAcademico } from './entity/materialacademico.entity';
import { ExtractorTextoService } from './extraccion/extractor-texto.service';
import { MaterialAcademicoController } from './materialacademico.controller';
import { MaterialAcademicoService } from './materialacademico.service';
import { MaterialesTamanoFilter } from './materiales-tamano.filter';

/**
 * Materiales académicos con extracción de texto.
 *
 * El límite de tamaño de multer se toma de la misma configuración que valida
 * el servicio, para no aceptar en memoria archivos que luego se rechazarían.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaterialAcademico,
      Materia,
      Tema,
      IaGeneracionMaterial,
    ]),
    MaterialesConfigModule,
    MulterModule.registerAsync({
      imports: [MaterialesConfigModule],
      inject: [MATERIALES_CONFIG],
      useFactory: (config: MaterialesConfig) => ({
        limits: { fileSize: config.maxBytes, files: 1 },
      }),
    }),
  ],
  controllers: [MaterialAcademicoController],
  providers: [
    MaterialAcademicoService,
    ExtractorTextoService,
    MaterialesTamanoFilter,
    {
      provide: ALMACEN_ARCHIVOS,
      useClass: AlmacenArchivosLocal,
    },
  ],
  exports: [MaterialAcademicoService],
})
export class MaterialAcademicoModule {}
