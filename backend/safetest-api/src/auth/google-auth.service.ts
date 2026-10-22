
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { OAuth2Client, 
         CodeChallengeMethod, 
        } from 'google-auth-library';
import { randomBytes } from 'crypto';

@Injectable()
export class GoogleAuthService {
  private readonly googleClient: OAuth2Client;
  private readonly clientId: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.clientId =
      this.configService.getOrThrow<string>(
        'GOOGLE_CLIENT_ID',
      );

    const clientSecret =
      this.configService.getOrThrow<string>(
        'GOOGLE_CLIENT_SECRET',
      );

    const redirectUri =
      this.configService.getOrThrow<string>(
        'GOOGLE_REDIRECT_URI',
      );

    this.googleClient = new OAuth2Client(
      this.clientId,
      clientSecret,
      redirectUri,
    );
  }

  // GENERAR URL PARA INICIAR SESIÓN CON GOOGLE

  async crearSolicitud() {
    const state = randomBytes(32).toString('hex');

    const { codeVerifier, codeChallenge } =
      await this.googleClient.generateCodeVerifierAsync();

    const url = this.googleClient.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });

    return {
      url,
      state,
      codeVerifier,
    };
  }

  // VERIFICAR LA IDENTIDAD DEVUELTA POR GOOGLE

  async validarRespuesta(
    code: string,
    codeVerifier: string,
  ) {
    const { tokens } = await this.googleClient.getToken({
      code,
      codeVerifier,
    });

    if (!tokens.id_token) {
      throw new UnauthorizedException(
        'Google no devolvió un token de identidad.',
      );
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId,
    });

    const perfil = ticket.getPayload();

    if (
      !perfil?.sub ||
      !perfil.email ||
      perfil.email_verified !== true
    ) {
      throw new UnauthorizedException(
        'No se pudo verificar la identidad de Google.',
      );
    }

    return {
      googleSub: perfil.sub,
      nombre: perfil.name ?? perfil.email.split('@')[0],
      correo: perfil.email.trim().toLowerCase(),
    };
  }
}
