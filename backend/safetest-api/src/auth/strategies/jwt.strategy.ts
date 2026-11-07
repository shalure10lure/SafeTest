import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Docente } from '../../docente/entity/docente.entity';
import { Estudiante } from '../../estudiante/entity/estudiante.entity';

type UserType = 'docente' | 'estudiante';

interface AccessTokenPayload {
  id: number;
  tipo: UserType;
}

interface AuthenticatedUser {
  id: number;
  nombre: string;
  correo: string;
  tipo: UserType;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Docente)
    private readonly docenteRepository: Repository<Docente>,
    @InjectRepository(Estudiante)
    private readonly estudianteRepository: Repository<Estudiante>,
  ) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET no está definido');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: unknown): Promise<AuthenticatedUser> {
    if (!this.isAccessTokenPayload(payload)) {
      throw new UnauthorizedException('Token inválido');
    }

    if (payload.tipo === 'docente') {
      const docente = await this.docenteRepository.findOneBy({
        docente_id: payload.id,
        activo: true,
      });

      if (!docente) {
        throw new UnauthorizedException('Sesión no válida');
      }

      return {
        id: docente.docente_id,
        nombre: docente.nombre,
        correo: docente.correo,
        tipo: 'docente',
      };
    }

    const estudiante = await this.estudianteRepository.findOneBy({
      estudiante_id: payload.id,
      activo: true,
    });

    if (!estudiante) {
      throw new UnauthorizedException('Sesión no válida');
    }

    return {
      id: estudiante.estudiante_id,
      nombre: estudiante.nombre_completo,
      correo: estudiante.correo_institucional,
      tipo: 'estudiante',
    };
  }

  private isAccessTokenPayload(
    payload: unknown,
  ): payload is AccessTokenPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const claims = payload as Record<string, unknown>;

    return (
      Number.isInteger(claims.id) &&
      (claims.tipo === 'docente' || claims.tipo === 'estudiante')
    );
  }
}