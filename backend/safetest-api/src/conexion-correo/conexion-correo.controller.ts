
import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConexionCorreoService } from './conexion-correo.service';

@Controller('correo/google')
export class ConexionCorreoController {
  constructor(
    private readonly conexionCorreoService:
      ConexionCorreoService,
  ) {}

  // INICIAR CONEXIÓN CON GMAIL
  @Post('iniciar')
  @UseGuards(JwtAuthGuard)
  async iniciar(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const usuario = request.user as {
      id: number;
      tipo: 'docente' | 'estudiante';
    };

    if (usuario.tipo !== 'docente') {
      throw new ForbiddenException(
        'Solo los docentes pueden conectar Gmail.',
      );
    }

    const resultado =
      await this.conexionCorreoService.iniciarConexion(
        usuario.id,
      );

    response.cookie(
      'safetest_gmail_oauth',
      resultado.cookieCifrada,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/correo/google/callback',
        maxAge: 5 * 60 * 1000,
      },
    );

    return {
      url: resultado.url,
    };
  }

  // RECIBIR RESPUESTA DE GOOGLE
  @Get('callback')
  async callback(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const frontendUrl =
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    const codigo = request.query.code;
    const estado = request.query.state;

    const cookieCifrada =
      request.cookies?.safetest_gmail_oauth;

    response.clearCookie(
      'safetest_gmail_oauth',
      {
        path: '/correo/google/callback',
      },
    );

    if (
      typeof codigo !== 'string' ||
      typeof estado !== 'string' ||
      typeof cookieCifrada !== 'string'
    ) {
      return response.redirect(
        `${frontendUrl}/docente?gmail=cancelado`,
      );
    }

    try {
      await this.conexionCorreoService
        .completarConexion(
          codigo,
          estado,
          cookieCifrada,
        );

      return response.redirect(
        `${frontendUrl}/docente?gmail=conectada`,
      );
    } catch {
      return response.redirect(
        `${frontendUrl}/docente?gmail=error`,
      );
    }
  }

  // VER ESTADO DE GMAIL
  @Get('estado')
  @UseGuards(JwtAuthGuard)
  async estado(
    @Req() request: Request,
  ) {
    const usuario = request.user as {
      id: number;
      tipo: 'docente' | 'estudiante';
    };

    if (usuario.tipo !== 'docente') {
      throw new ForbiddenException(
        'Solo los docentes pueden consultar Gmail.',
      );
    }

    return this.conexionCorreoService
      .obtenerEstado(usuario.id);
  }
}
