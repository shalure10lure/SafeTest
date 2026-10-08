import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { AuthService } from './auth.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // REGISTRAR DOCENTE
  
  @Post('register/docente')
  async registerDocente(
    @Body()
    body: {
      nombre: string;
      correo: string;
      password: string;
    },
  ) {
    return this.authService.registerDocente(
      body.nombre,
      body.correo,
      body.password,
    );
  }

  // REGISTRAR ESTUDIANTE
  
  @Post('register/estudiante')
  async registerEstudiante(
    @Body()
    body: {
      nombre_completo: string;
      celular: string;
      correo_institucional: string;
      password: string;
    },
  ) {
    return this.authService.registerEstudiante(
      body.nombre_completo,
      body.celular,
      body.correo_institucional,
      body.password,
    );
  }

  // LOGIN
  
  @Post('login')
  async login(
    @Body()
    body: {
      correo: string;
      password: string;
    },
    @Res({ passthrough: true })
    response: Response,
  ) {
    const resultado =
      await this.authService.login(
        body.correo,
        body.password,
      );

    response.cookie(
      'refresh_token',
      resultado.refreshToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );

    return {
      message: resultado.message,
      accessToken: resultado.accessToken,
      usuario: resultado.usuario,
    };
  }

  // LOGOUT
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const usuario = request.user as {
      id: number;
      tipo: 'docente' | 'estudiante';
    };

    response.clearCookie('refresh_token');

    return this.authService.logout(
      usuario.id,
      usuario.tipo,
    );
  }

  // REFRESH TOKEN
  
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const refreshToken =
      request.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token no encontrado',
      );
    }

    const payload =
      await this.authService.verifyRefreshToken(
        refreshToken,
      );

    const resultado =
      await this.authService.refreshToken(
        payload.id,
        payload.tipo,
        refreshToken,
      );

    response.cookie(
      'refresh_token',
      resultado.refreshToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );

    return {
      accessToken: resultado.accessToken,
      usuario: resultado.usuario,
    };
  }

  // CHECK STATUS

  @Get('check-status')
  @UseGuards(JwtAuthGuard)
  async checkStatus(
    @Req() request: Request,
  ) {
    const usuario = request.user as {
      id: number;
      tipo: 'docente' | 'estudiante';
    };

    return this.authService.checkStatus(
      usuario.id,
      usuario.tipo,
    );
  }
}