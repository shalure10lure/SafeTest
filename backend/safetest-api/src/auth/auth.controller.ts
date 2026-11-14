import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { AuthService } from './auth.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { GoogleAuthService } from './google-auth.service';
import { timingSafeEqual } from 'crypto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  // REGISTRAR DOCENTE

  @Post('register/docente')
  @Public()
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
  @Public()
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
  @Public()
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
  @Public()
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

  // CONSULTAR ESTADO DE VINCULACIÓN CON GOOGLE

  @Get('google/estado')
  @UseGuards(JwtAuthGuard)
  async estadoGoogle(@Req() request: Request) {
    const usuario = request.user as {
      id: number;
      tipo: 'docente' | 'estudiante';
    };

    return this.authService.obtenerEstadoGoogle(
      usuario.id,
      usuario.tipo,
    );
  }

  // INICIAR AUTENTICACIÓN CON GOOGLE

  @Get('google')
  @Public()
  async iniciarGoogle(
    @Res() response: Response,
  ) {
    const { url, state, codeVerifier } =
      await this.googleAuthService.crearSolicitud();

    const opciones = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/auth/google/callback',
      maxAge: 5 * 60 * 1000,
    };

    // Cookies temporales para validar el flujo OAuth.
    response.cookie(
      'safetest_google_state',
      state,
      opciones,
    );

    response.cookie(
      'safetest_google_pkce',
      codeVerifier,
      opciones,
    );

    response.clearCookie('safetest_google_link', {
      path: '/auth/google/callback',
    });
    return response.redirect(url);
  }

  // CONECTAR GOOGLE A UNA CUENTA AUTENTICADA

  @Post('google/vincular')
  @UseGuards(JwtAuthGuard)
  async prepararVinculacionGoogle(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const usuario = request.user as {
      id: number;
      tipo: 'docente' | 'estudiante';
    };

    const { url, state, codeVerifier } =
      await this.googleAuthService.crearSolicitud();

    const opciones = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/auth/google/callback',
      maxAge: 5 * 60 * 1000,
    };

    // Guardar estado y PKCE del nuevo flujo
    response.cookie(
      'safetest_google_state',
      state,
      opciones,
    );

    response.cookie(
      'safetest_google_pkce',
      codeVerifier,
      opciones,
    );

    // Asociar la autorización con el usuario actual
    const tokenVinculacion =
      await this.authService.crearTokenVinculacion(
        usuario.id,
        usuario.tipo,
        state,
      );

    response.cookie(
      'safetest_google_link',
      tokenVinculacion,
      opciones,
    );

    // El frontend abre esta URL para autorizar Google
    return { url };
  }


  // RECIBIR LA RESPUESTA DE GOOGLE

  @Get('google/callback')
  @Public()
  async googleCallback(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:3000';

    const codigo = request.query.code;
    const estado = request.query.state;

    const estadoGuardado =
      request.cookies?.safetest_google_state;

    const verificador =
      request.cookies?.safetest_google_pkce;
    const tokenVinculacion =
      request.cookies?.safetest_google_link;
    const esVinculacion = typeof tokenVinculacion === 'string';

    // Eliminar las cookies temporales después del intento.
    response.clearCookie('safetest_google_state', {
      path: '/auth/google/callback',
    });

    response.clearCookie('safetest_google_pkce', {
      path: '/auth/google/callback',
    });
    response.clearCookie('safetest_google_link', {
      path: '/auth/google/callback',
    });

    if (
      typeof codigo !== 'string' ||
      typeof estado !== 'string' ||
      typeof estadoGuardado !== 'string' ||
      typeof verificador !== 'string'
    ) {
      return response.redirect(
        esVinculacion
          ? `${frontendUrl}/google/resultado?link_error=cancelado`
          : `${frontendUrl}/login?google_error=cancelado`,
      );
    }

    // Evitar solicitudes de autenticación falsificadas.
    const recibido = Buffer.from(estado);
    const esperado = Buffer.from(estadoGuardado);

    if (
      recibido.length !== esperado.length ||
      !timingSafeEqual(recibido, esperado)
    ) {
      return response.redirect(
        esVinculacion
          ? `${frontendUrl}/google/resultado?link_error=estado`
          : `${frontendUrl}/login?google_error=estado`,
      );
    }

    try {
      // Validar la identidad mediante Google.
      const perfil =
        await this.googleAuthService.validarRespuesta(
          codigo,
          verificador,
        );

      // Vincular la cuenta existente o iniciar sesión con Google.
      let resultado;

      if (typeof tokenVinculacion === 'string') {
        // Google se está vinculando a un usuario
        // que ya inició sesión con su contraseña.
        const vinculacion =
          await this.authService.verificarTokenVinculacion(
            tokenVinculacion,
            estado,
          );

        resultado =
          await this.authService.vincularCuentaGoogle(
            vinculacion.id,
            vinculacion.tipo,
            perfil,
          );
      } else {
        // Inicio de sesión normal con Google
        resultado =
          await this.authService.loginConGoogle(perfil);
      }

      // Guardamos el refresh token en cookie HttpOnly.
      response.cookie(
        'refresh_token',
        resultado.refreshToken,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      );

      // Sin enviar access tokens en la URL.
      return response.redirect(
        `${frontendUrl}/google/resultado`,
      );
    } catch (error) {
      // La vinculación desde el perfil NO es un inicio de sesión.
      // Ante un error, mantenemos la cookie de sesión existente.
      if (esVinculacion) {
        let motivo = 'fallo';

        if (error instanceof BadRequestException) {
          motivo = 'correo_no_coincide';
        } else if (error instanceof ConflictException) {
          motivo = 'google_ya_vinculado';
        } else if (
          error instanceof UnauthorizedException ||
          error instanceof NotFoundException
        ) {
          motivo = 'cuenta_no_disponible';
        }

        return response.redirect(
          `${frontendUrl}/google/resultado?link_error=${motivo}`,
        );
      }

      // Inicio de sesión con Google: cuenta no registrada en SafeTest.
      if (error instanceof NotFoundException) {
        return response.redirect(
          `${frontendUrl}/login?google_error=cuenta_no_registrada`,
        );
      }

      // La cuenta existe, pero aún no está vinculada a Google.
      if (error instanceof ConflictException) {
        return response.redirect(
          `${frontendUrl}/login?google_error=cuenta_existente`,
        );
      }

      return response.redirect(
        `${frontendUrl}/login?google_error=autenticacion`,
      );
    }
  }
}
