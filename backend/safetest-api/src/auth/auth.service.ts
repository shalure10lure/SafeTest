import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtService } from '@nestjs/jwt';

import { Docente } from '../docente/entity/docente.entity';
import { Estudiante } from '../estudiante/entity/estudiante.entity';

import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Docente)
    private readonly docenteRepository: Repository<Docente>,

    @InjectRepository(Estudiante)
    private readonly estudianteRepository: Repository<Estudiante>,

    private readonly jwtService: JwtService,
  ) {}

  // REGISTRAR DOCENTE
 
  async registerDocente(
    nombre: string,
    correo: string,
    password: string,
  ) {
    const docenteExistente = await this.docenteRepository.findOne({
      where: { correo },
    });

    if (docenteExistente) {
      throw new ConflictException(
        'Ya existe un docente con ese correo',
      );
    }

    const passwordHash = await argon2.hash(password);

    const docente = this.docenteRepository.create({
      nombre,
      correo,
      passwordHash,
    });

    const docenteGuardado =
      await this.docenteRepository.save(docente);

    return {
      message: 'Docente registrado correctamente',
      docente: {
        id: docenteGuardado.docente_id,
        nombre: docenteGuardado.nombre,
        correo: docenteGuardado.correo,
      },
    };
  }

  // REGISTRAR ESTUDIANTE
  
  async registerEstudiante(
    nombre_completo: string,
    celular: string,
    correo_institucional: string,
    password: string,
  ) {
    const estudianteExistente =
      await this.estudianteRepository.findOne({
        where: { correo_institucional },
      });

    if (estudianteExistente) {
      throw new ConflictException(
        'Ya existe un estudiante con ese correo',
      );
    }

    const passwordHash = await argon2.hash(password);

    const estudiante =
      this.estudianteRepository.create({
        nombre_completo,
        celular,
        correo_institucional,
        passwordHash,
      });

    const estudianteGuardado =
      await this.estudianteRepository.save(estudiante);

    return {
      message: 'Estudiante registrado correctamente',
      estudiante: {
        id: estudianteGuardado.estudiante_id,
        nombre: estudianteGuardado.nombre_completo,
        correo: estudianteGuardado.correo_institucional,
      },
    };
  }

   // LOGIN
  
  async login(
    correo: string,
    password: string,
  ) {
    // Primero buscamos si es DOCENTE
    
    const docente = await this.docenteRepository
      .createQueryBuilder('docente')
      .addSelect('docente.passwordHash')
      .where('docente.correo = :correo', { correo })
      .getOne();

    if (docente) {
      const passwordValida = await argon2.verify(
        docente.passwordHash,
        password,
      );

      if (!passwordValida) {
        throw new UnauthorizedException(
          'Correo o contraseña incorrectos',
        );
      }

      return this.generarTokens(
        docente.docente_id,
        docente.nombre,
        docente.correo,
        'docente',
      );
    }

    // Si no es docente, buscamos ESTUDIANTE
    
    const estudiante =
      await this.estudianteRepository
        .createQueryBuilder('estudiante')
        .addSelect('estudiante.passwordHash')
        .where(
          'estudiante.correo_institucional = :correo',
          { correo },
        )
        .getOne();

    if (!estudiante) {
      throw new UnauthorizedException(
        'Correo o contraseña incorrectos',
      );
    }

    const passwordValida = await argon2.verify(
      estudiante.passwordHash,
      password,
    );

    if (!passwordValida) {
      throw new UnauthorizedException(
        'Correo o contraseña incorrectos',
      );
    }

    return this.generarTokens(
      estudiante.estudiante_id,
      estudiante.nombre_completo,
      estudiante.correo_institucional,
      'estudiante',
    );
  }

 // GENERAR TOKENS
 
  private async generarTokens(
    id: number,
    nombre: string,
    correo: string,
    tipo: 'docente' | 'estudiante',
  ) {
    const payload = {
      id,
      nombre,
      correo,
      tipo,
    };

    const accessToken =
      await this.jwtService.signAsync(payload);

    const refreshToken =
      await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      });

    // Guardamos el refresh token HASHED
    const refreshTokenHash =
      await argon2.hash(refreshToken);

    if (tipo === 'docente') {
      await this.docenteRepository.update(
        id,
        {
          refreshToken: refreshTokenHash,
        },
      );
    } else {
      await this.estudianteRepository.update(
        id,
        {
          refreshToken: refreshTokenHash,
        },
      );
    }

    return {
      message: 'Inicio de sesión exitoso',
      accessToken,
      refreshToken,
      usuario: {
        id,
        nombre,
        correo,
        tipo,
      },
    };
  }

  // LOGOUT
 
  async logout(
    id: number,
    tipo: 'docente' | 'estudiante',
  ) {
    if (tipo === 'docente') {
      await this.docenteRepository.update(id, {
        refreshToken: null,
      });
    } else {
      await this.estudianteRepository.update(id, {
        refreshToken: null,
      });
    }

    return {
      message: 'Sesión cerrada correctamente',
    };
  }

  // VERIFICAR REFRESH TOKEN

async verifyRefreshToken(refreshToken: string) {
  try {
    return await this.jwtService.verifyAsync(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
  } catch {
    throw new UnauthorizedException(
      'Refresh token inválido o expirado',
    );
  }
}
 // REFRESH TOKEN

  async refreshToken(
    id: number,
    tipo: 'docente' | 'estudiante',
    refreshToken: string,
  ) {
    try {
      await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token inválido o expirado',
      );
    }

    let usuario: Docente | Estudiante | null = null;

    if (tipo === 'docente') {
      usuario =
        await this.docenteRepository
          .createQueryBuilder('docente')
          .addSelect('docente.refreshToken')
          .where('docente.docente_id = :id', { id })
          .getOne();
    } else {
      usuario =
        await this.estudianteRepository
          .createQueryBuilder('estudiante')
          .addSelect('estudiante.refreshToken')
          .where('estudiante.estudiante_id = :id', { id })
          .getOne();
    }

    if (!usuario || !usuario.refreshToken) {
      throw new UnauthorizedException(
        'No existe una sesión válida',
      );
    }

    const tokenValido = await argon2.verify(
      usuario.refreshToken,
      refreshToken,
    );

    if (!tokenValido) {
      throw new UnauthorizedException(
        'Refresh token inválido',
      );
    }

    const nombre =
      tipo === 'docente'
        ? (usuario as Docente).nombre
        : (usuario as Estudiante).nombre_completo;

    const correo =
      tipo === 'docente'
        ? (usuario as Docente).correo
        : (usuario as Estudiante)
            .correo_institucional;

    return this.generarTokens(
      id,
      nombre,
      correo,
      tipo,
    );
  }

  // OBTENER USUARIO ACTUAL
  
  async checkStatus(
    id: number,
    tipo: 'docente' | 'estudiante',
  ) {
    if (tipo === 'docente') {
      const docente =
        await this.docenteRepository.findOne({
          where: {
            docente_id: id,
          },
        });

      if (!docente) {
        throw new UnauthorizedException(
          'Docente no encontrado',
        );
      }

      return {
        id: docente.docente_id,
        nombre: docente.nombre,
        correo: docente.correo,
        tipo: 'docente',
      };
    }

    const estudiante =
      await this.estudianteRepository.findOne({
        where: {
          estudiante_id: id,
        },
      });

    if (!estudiante) {
      throw new UnauthorizedException(
        'Estudiante no encontrado',
      );
    }

    return {
      id: estudiante.estudiante_id,
      nombre: estudiante.nombre_completo,
      correo: estudiante.correo_institucional,
      tipo: 'estudiante',
    };
  }
}