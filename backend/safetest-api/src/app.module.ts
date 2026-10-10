import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { CategoriaModule } from './categoria/categoria.module';
import { AuthModule } from './auth/auth.module';

import { AsignacionPregunta } from './asignacionpregunta/entity/asignacionpregunta.entity';
import { Categoria } from './categoria/entity/categoria.entity';
import { Docente } from './docente/entity/docente.entity';
import { EnvioCalificacion } from './enviocalificacion/entity/enviocalificacion.entity';
import { Estudiante } from './estudiante/entity/estudiante.entity';
import { EventoSeguridad } from './eventoseguridad/entity/eventoseguridad.entity';
import { Examen } from './examen/entity/examen.entity';
import { ExamenPregunta } from './examenpregunta/entity/examenpregunta.entity';
import { ExamenTema } from './examentema/entity/examentema.entity';
import { Formula } from './formula/entity/formula.entity';
import { FormulaElegida } from './formulaelegida/entity/formulaelegida.entity';
import { Inciso } from './inciso/entity/inciso.entity';
import { Inscripcion } from './inscripcion/entity/inscripcion.entity';
import { Materia } from './materia/entity/materia.entity';
import { Opcion } from './opcion/entity/opcion.entity';
import { OpcionMarcada } from './opcionmarcada/entity/opcionmarcada.entity';
import { Paralelo } from './paralelo/entity/paralelo.entity';
import { ParaleloExamen } from './paraleloexamen/entity/paraleloexamen.entity';
import { ParaleloPregunta } from './paralelopregunta/entity/paralelopregunta.entity';
import { Pregunta } from './pregunta/entity/pregunta.entity';
import { PreguntaCompetencia } from './preguntacompetencia/entity/preguntacompetencia.entity';
import { PreguntaRecurso } from './preguntarecurso/entity/preguntarecurso.entity';
import { Rendicion } from './rendicion/entity/rendicion.entity';
import { RespuestaInciso } from './respuestainciso/entity/respuestainciso.entity';
import { Semestre } from './semestre/entity/semestre.entity';
import { SolucionFormula } from './solucionformula/entity/solucionformula.entity';
import { SolucionInciso } from './solucioninciso/entity/solucioninciso.entity';
import { SolucionOpcion } from './solucionopcion/entity/solucionopcion.entity';
import { SolucionTexto } from './soluciontexto/entity/soluciontexto.entity';
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
          AsignacionPregunta,
          Categoria,
          Docente,
          EnvioCalificacion,
          Estudiante,
          EventoSeguridad,
          Examen,
          ExamenPregunta,
          ExamenTema,
          Formula,
          FormulaElegida,
          Inciso,
          Inscripcion,
          Materia,
          Opcion,
          OpcionMarcada,
          Paralelo,
          ParaleloExamen,
          ParaleloPregunta,
          Pregunta,
          PreguntaCompetencia,
          PreguntaRecurso,
          Rendicion,
          RespuestaInciso,
          Semestre,
          SolucionFormula,
          SolucionInciso,
          SolucionOpcion,
          SolucionTexto,
          Tema,
        ],
        autoLoadEntities: true,
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