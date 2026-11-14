import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
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
    correo = correo.trim().toLowerCase();

    const docenteExistente = await this.docenteRepository.findOne({
      where: { correo },
    });

    if (docenteExistente) {
      throw new ConflictException(
        'Ya existe un docente con ese correo',
      );
    }

    // Evitar que el mismo correo pertenezca a ambos roles.
    const estudianteExistente = await this.estudianteRepository.findOne({
      where: { correo_institucional: correo },
    });
    if (estudianteExistente) {
      throw new ConflictException(
        'Este correo ya pertenece a una cuenta estudiante.',
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
    correo_institucional = correo_institucional.trim().toLowerCase();

    const estudianteExistente =
      await this.estudianteRepository.findOne({
        where: { correo_institucional },
      });

    if (estudianteExistente) {
      throw new ConflictException(
        'Ya existe un estudiante con ese correo',
      );
    }

    // Evitar que el mismo correo pertenezca a ambos roles.
    const docenteExistente = await this.docenteRepository.findOne({
      where: { correo: correo_institucional },
    });
    if (docenteExistente) {
      throw new ConflictException(
        'Este correo ya pertenece a una cuenta docente.',
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
    correo = correo.trim().toLowerCase();
    // Primero buscamos si es DOCENTE
    
    const docente = await this.docenteRepository
      .createQueryBuilder('docente')
      .addSelect('docente.passwordHash')
      .where('docente.correo = :correo', { correo })
      .getOne();

    
    if (docente) {
      if (!docente.activo) {
        throw new UnauthorizedException(
          'Correo o contraseña incorrectos',
        );
      }

      // Las cuentas creadas solo con Google
      // no tienen contraseña de SafeTest.
      if (!docente.passwordHash) {
        throw new UnauthorizedException(
          'Correo o contraseña incorrectos',
        );
      }

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

    if (!estudiante.activo) {
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
  
  // CONSULTAR EL ESTADO DE VINCULACIÓN CON GOOGLE

  async obtenerEstadoGoogle(
    id: number,
    tipo: 'docente' | 'estudiante',
  ): Promise<{ vinculado: boolean }> {
    if (tipo === 'docente') {
      const docente = await this.docenteRepository
        .createQueryBuilder('docente')
        .addSelect('docente.googleSub')
        .where('docente.docente_id = :id', { id })
        .getOne();

      if (!docente || !docente.activo) {
        throw new UnauthorizedException('Cuenta docente no disponible.');
      }

      return { vinculado: Boolean(docente.googleSub) };
    }

    const estudiante = await this.estudianteRepository.findOne({
      where: { estudiante_id: id, activo: true },
    });

    if (!estudiante) {
      throw new UnauthorizedException('Cuenta estudiante no disponible.');
    }

    // En este esquema existente, el campo se utiliza como marca
    // de que el estudiante vinculó su Google verificado.
    return { vinculado: estudiante.correoVerificado === true };
  }

  // AUTORIZACIÓN TEMPORAL PARA VINCULAR GOOGLE DESDE UNA SESIÓN

  async crearTokenVinculacion(
    id: number,
    tipo: 'docente' | 'estudiante',
    estado: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { id, tipo, estado, proposito: 'vincular-google' },
      { expiresIn: '5m' },
    );
  }

  async verificarTokenVinculacion(
    token: string,
    estado: string,
  ): Promise<{ id: number; tipo: 'docente' | 'estudiante' }> {
    let payload: {
      id: number;
      tipo: string;
      estado: string;
      proposito: string;
    };

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('La vinculación con Google expiró.');
    }

    if (
      payload.proposito !== 'vincular-google' ||
      payload.estado !== estado ||
      !Number.isInteger(payload.id) ||
      (payload.tipo !== 'docente' && payload.tipo !== 'estudiante')
    ) {
      throw new UnauthorizedException('Solicitud de vinculación inválida.');
    }

    return {
      id: payload.id,
      tipo: payload.tipo as 'docente' | 'estudiante',
    };
  }

  // VINCULAR LA CUENTA GOOGLE SELECCIONADA A LA SESIÓN ACTUAL

  async vincularCuentaGoogle(
    id: number,
    tipo: 'docente' | 'estudiante',
    perfil: { googleSub: string; nombre: string; correo: string },
  ) {
    const correo = perfil.correo.trim().toLowerCase();

    if (tipo === 'docente') {
      const docente = await this.docenteRepository
        .createQueryBuilder('docente')
        .addSelect('docente.googleSub')
        .where('docente.docente_id = :id', { id })
        .getOne();

      if (!docente || !docente.activo) {
        throw new UnauthorizedException('Cuenta docente no disponible.');
      }

      if (docente.correo.toLowerCase() !== correo) {
        throw new BadRequestException(
          'El correo de Google no coincide con el registrado en SafeTest.',
        );
      }

      if (docente.googleSub && docente.googleSub !== perfil.googleSub) {
        throw new ConflictException(
          'La cuenta ya está vinculada a otro usuario de Google.',
        );
      }

      const docenteVinculado = await this.docenteRepository.findOne({
        where: { googleSub: perfil.googleSub },
      });

      if (docenteVinculado && docenteVinculado.docente_id !== id) {
        throw new ConflictException('Esta cuenta de Google ya está vinculada.');
      }

      docente.googleSub = perfil.googleSub;
      await this.docenteRepository.save(docente);

      return this.generarTokens(
        docente.docente_id,
        docente.nombre,
        docente.correo,
        'docente',
      );
    }

    const estudiante = await this.estudianteRepository.findOne({
      where: { estudiante_id: id },
    });

    if (!estudiante || !estudiante.activo) {
      throw new UnauthorizedException('Cuenta estudiante no disponible.');
    }

    if (estudiante.correo_institucional.toLowerCase() !== correo) {
      throw new BadRequestException(
        'El correo de Google no coincide con el registrado en SafeTest.',
      );
    }

    // Sin modificar la tabla: el correo verificado por Google
    // funciona como indicador de vinculación para estudiantes.
    estudiante.correoVerificado = true;
    await this.estudianteRepository.save(estudiante);

    return this.generarTokens(
      estudiante.estudiante_id,
      estudiante.nombre_completo,
      estudiante.correo_institucional,
      'estudiante',
    );
  }

  // INICIAR SESIÓN CON GOOGLE (SIN CREAR CUENTAS AUTOMÁTICAMENTE)

  async loginConGoogle(perfil: {
    googleSub: string;
    nombre: string;
    correo: string;
  }) {
    const correo = perfil.correo.trim().toLowerCase();

    // Docentes: vinculación explícita por identificador estable de Google.
    const docente = await this.docenteRepository.findOne({
      where: { googleSub: perfil.googleSub },
    });

    if (docente) {
      if (!docente.activo) {
        throw new UnauthorizedException('Cuenta docente no disponible.');
      }
      return this.generarTokens(
        docente.docente_id,
        docente.nombre,
        docente.correo,
        'docente',
      );
    }

    // Estudiantes: usamos el correo que Google ya verificó,
    // pero solo si la vinculación se marcó previamente.
    const estudiante = await this.estudianteRepository.findOne({
      where: {
        correo_institucional: correo,
        correoVerificado: true,
      },
    });

    if (estudiante) {
      if (!estudiante.activo) {
        throw new UnauthorizedException('Cuenta estudiante no disponible.');
      }
      return this.generarTokens(
        estudiante.estudiante_id,
        estudiante.nombre_completo,
        estudiante.correo_institucional,
        'estudiante',
      );
    }

    // Distinguir cuenta existente sin Google vinculado de cuenta nueva.
    const docenteExistente = await this.docenteRepository.findOne({
      where: { correo },
    });
    const estudianteExistente = await this.estudianteRepository.findOne({
      where: { correo_institucional: correo },
    });

    if (docenteExistente || estudianteExistente) {
      throw new ConflictException(
        'La cuenta existe, pero Google no está vinculado. ' +
        'Inicia sesión con tu contraseña y conecta Google desde tu perfil.',
      );
    }

    throw new NotFoundException(
      'No hay una cuenta de SafeTest registrada con ese correo. ' +
      'Regístrate primero.',
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

    if (!usuario || !usuario.activo || !usuario.refreshToken) {
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
            activo: true,
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
          activo: true,
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