import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

import { Docente } from '../docente/entity/docente.entity';
import { Estudiante } from '../estudiante/entity/estudiante.entity';
import { GoogleAuthService } from './google-auth.service'; 
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DocenteGuard } from './guards/docente.guard';
import { EstudianteGuard } from './guards/estudiante.guard';

@Global()
@Module({
  imports: [
    ConfigModule,

    TypeOrmModule.forFeature([
      Docente,
      Estudiante,
    ]),

    PassportModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),

        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
    GoogleAuthService,
    JwtAuthGuard,
    DocenteGuard,
    EstudianteGuard,
  ],

  exports: [
    AuthService,
    JwtAuthGuard,
    DocenteGuard,
    EstudianteGuard,
  ],
})
export class AuthModule {}