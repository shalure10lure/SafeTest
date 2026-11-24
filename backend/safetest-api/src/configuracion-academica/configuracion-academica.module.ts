import { Module } from '@nestjs/common';

import { ConfiguracionAcademicaController } from './configuracion-academica.controller';
import { ConfiguracionAcademicaService } from './configuracion-academica.service';

/** Usa el DataSource global de TypeORM, por eso no necesita forFeature. */
@Module({
    controllers: [ConfiguracionAcademicaController],
    providers: [ConfiguracionAcademicaService],
})
export class ConfiguracionAcademicaModule {}
