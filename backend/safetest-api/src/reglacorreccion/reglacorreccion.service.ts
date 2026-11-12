import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { TipoRespuesta } from '../pregunta/entity/dtos/create-pregunta.dto';
import type { ActualizarReglaCorreccionDto } from './dto/actualizar-regla-correccion.dto';
import type { CrearReglaCorreccionDto } from './dto/crear-regla-correccion.dto';
import { ReglaCorreccion } from './entity/reglacorreccion.entity';
import {
  validarParametrosRegla,
  type ParametrosRegla,
} from './regla-correccion.validator';

/** Vista pública de una regla: nunca incluye el docente ni datos internos. */
export interface ReglaCorreccionRespuesta {
  regla_id: number;
  tipo_respuesta: TipoRespuesta;
  parametros: ParametrosRegla;
  activo: boolean;
  creado_en: Date;
  actualizado_en: Date;
}

/**
 * Administración de las reglas de corrección del docente autenticado.
 *
 * Toda consulta se filtra por el `docenteId` que llega desde el JWT: el
 * servicio nunca acepta un docente_id del cliente. La configuración se valida
 * según el tipo de pregunta y no puede contener datos de la solución.
 */
@Injectable()
export class ReglaCorreccionService {
  constructor(
    @InjectRepository(ReglaCorreccion)
    private readonly reglaRepository: Repository<ReglaCorreccion>,
  ) {}

  async crear(
    docenteId: number,
    dto: CrearReglaCorreccionDto,
  ): Promise<ReglaCorreccionRespuesta> {
    const parametros = validarParametrosRegla(
      dto.tipo_respuesta,
      dto.parametros,
    );

    const regla = this.reglaRepository.create({
      docente_id: docenteId,
      tipo_respuesta: dto.tipo_respuesta,
      parametros,
      activo: dto.activo ?? true,
    });

    try {
      return this.aRespuesta(await this.reglaRepository.save(regla));
    } catch (error) {
      this.lanzarConflictoSiDuplicada(error, dto.tipo_respuesta);
    }
  }

  async listar(docenteId: number): Promise<ReglaCorreccionRespuesta[]> {
    const reglas = await this.reglaRepository.find({
      where: { docente_id: docenteId },
      order: { tipo_respuesta: 'ASC' },
    });

    return reglas.map((regla) => this.aRespuesta(regla));
  }

  async obtener(
    docenteId: number,
    reglaId: number,
  ): Promise<ReglaCorreccionRespuesta> {
    const regla = await this.buscarPropia(docenteId, reglaId);

    return this.aRespuesta(regla);
  }

  async actualizar(
    docenteId: number,
    reglaId: number,
    dto: ActualizarReglaCorreccionDto,
  ): Promise<ReglaCorreccionRespuesta> {
    if (
      dto.tipo_respuesta === undefined &&
      dto.parametros === undefined &&
      dto.activo === undefined
    ) {
      throw new BadRequestException(
        'Envía al menos un campo para actualizar la regla',
      );
    }

    const regla = await this.buscarPropia(docenteId, reglaId);

    const tipoFinal = dto.tipo_respuesta ?? regla.tipo_respuesta;
    const parametrosFinales = validarParametrosRegla(
      tipoFinal,
      dto.parametros ?? regla.parametros,
    );

    regla.tipo_respuesta = tipoFinal;
    regla.parametros = parametrosFinales;

    if (dto.activo !== undefined) {
      regla.activo = dto.activo;
    }

    try {
      return this.aRespuesta(await this.reglaRepository.save(regla));
    } catch (error) {
      this.lanzarConflictoSiDuplicada(error, tipoFinal);
    }
  }

  private async buscarPropia(
    docenteId: number,
    reglaId: number,
  ): Promise<ReglaCorreccion> {
    const regla = await this.reglaRepository.findOne({
      where: { regla_id: reglaId, docente_id: docenteId },
    });

    if (!regla) {
      throw new NotFoundException('Regla de corrección no encontrada');
    }

    return regla;
  }

  private lanzarConflictoSiDuplicada(
    error: unknown,
    tipo: TipoRespuesta,
  ): never {
    if (esViolacionDeUnicidad(error)) {
      throw new ConflictException(
        `Ya existe una regla de corrección para el tipo ${tipo}`,
      );
    }

    throw error;
  }

  private aRespuesta(regla: ReglaCorreccion): ReglaCorreccionRespuesta {
    return {
      regla_id: regla.regla_id,
      tipo_respuesta: regla.tipo_respuesta,
      parametros: regla.parametros,
      activo: regla.activo,
      creado_en: regla.creado_en,
      actualizado_en: regla.actualizado_en,
    };
  }
}

function esViolacionDeUnicidad(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const posibleError = error as {
    code?: unknown;
    driverError?: { code?: unknown };
  };

  return (
    posibleError.code === '23505' || posibleError.driverError?.code === '23505'
  );
}
