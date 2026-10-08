import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CategoriaModule } from './categoria/categoria.module';
import { AuthModule } from './auth/auth.module';

import { Categoria } from './categoria/entity/categoria.entity';
import { Docente } from './docente/entity/docente.entity';
import { Estudiante } from './estudiante/entity/estudiante.entity';
import { Inscripcion } from './inscripcion/entity/inscripcion.entity';
import { Paralelo } from './paralelo/entity/paralelo.entity';
import { Materia } from './materia/entity/materia.entity';
import { Semestre } from './semestre/entity/semestre.entity';
import { Tema } from './tema/entity/tema.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),

        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),

        entities: [
          Categoria,
          Docente,
          Estudiante,
          Inscripcion,
          Paralelo,
          Materia,
          Semestre,
          Tema,
        ],

        synchronize: true,
      }),
    }),

    CategoriaModule,
    AuthModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}