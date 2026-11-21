import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, QueryFailedError } from 'typeorm';
import type {
  EntityManager,
  FindOptionsSelect,
  FindOptionsWhere,
} from 'typeorm';

import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';
import { Examen } from '../examen/entity/examen.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { IaSolucionReferencia } from '../iasolucionreferencia/entity/iasolucionreferencia.entity';
import { OpcionMarcada } from '../opcionmarcada/entity/opcionmarcada.entity';
import { Rendicion } from '../rendicion/entity/rendicion.entity';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';
import {
  ErrorValidacionCorreccionIa,
  validarPuntajeSugeridoCorreccionIa,
  validarSolicitudCorreccionIa,
} from './correccionia.validacion';
import {
  CorreccionIa,
  type EstadoCorreccionIa,
} from './entity/correccionia.entity';

const ESTADOS_PROPUESTA_ACTIVA = [
  'pendiente',
  'procesando',
  'generada',
  'modificada',
] as const;

const ESTADOS_CORRECCION_IA: readonly EstadoCorreccionIa[] = [
  'pendiente',
  'procesando',
  'generada',
  'modificada',
  'aceptada',
  'descartada',
  'error',
  'reemplazada',
];

const INDICE_PROPUESTA_ACTIVA = 'UX_correccion_ia_activa';

const CAMPOS_PUBLICOS_CORRECCION_IA = {
  propuesta_id: true,
  examen_id: true,
  estudiante_id: true,
  pregunta_id: true,
  letra: true,
  estado: true,
  puntaje_sugerido: true,
  puntaje_max_inciso: true,
  valoracion: true,
  explicacion: true,
  errores: true,
  confianza: true,
  criterio_fuente: true,
  criterio_hash: true,
  modelo: true,
  proveedor: true,
  intento: true,
  version: true,
  creada_en: true,
  iniciada_en: true,
  finalizada_en: true,
  actualizada_en: true,
  revisada_en: true,
  revisada_por_docente_id: true,
  reemplazada_por_id: true,
  error_codigo: true,
  error_mensaje: true,
  motivo: true,
} satisfies FindOptionsSelect<CorreccionIa>;

export interface ErrorCorreccionIaDto {
  tipo: string;
  descripcion: string;
  ubicacion?: string;
}

export interface CorreccionIaDto {
  propuesta_id: number;
  examen_id: number;
  estudiante_id: number;
  pregunta_id: number;
  letra: string;
  estado: EstadoCorreccionIa;
  puntaje_sugerido: string | null;
  puntaje_max_inciso: string | null;
  valoracion: string | null;
  explicacion: string | null;
  errores: ErrorCorreccionIaDto[] | null;
  confianza: string | null;
  criterio_fuente: string | null;
  criterio_hash: string | null;
  modelo: string | null;
  proveedor: string | null;
  intento: number;
  version: number;
  creada_en: string;
  iniciada_en: string | null;
  finalizada_en: string | null;
  actualizada_en: string;
  revisada_en: string | null;
  revisada_por_docente_id: number | null;
  reemplazada_por_id: number | null;
  error_codigo: string | null;
  error_mensaje: string | null;
  motivo: string | null;
}

export interface ListarCorreccionesIaFiltros {
  estado?: EstadoCorreccionIa;
  estudiante_id?: number;
  pregunta_id?: number;
  solo_pendientes_revision?: boolean;
  limite?: number;
  desplazamiento?: number;
}

export interface ListarHistorialCorreccionIaFiltros {
  estado?: EstadoCorreccionIa;
  limite?: number;
}

interface EntradaErrorCorreccionIa {
  tipo: string;
  descripcion: string;
  ubicacion?: string;
}

export interface SolicitudCorreccionIa {
  propuesta_id: number;
  estado: 'pendiente';
  intento: number;
}

export interface CambiosPropuestaCorreccionIa {
  puntaje?: number | string | null;
  valoracion?: string | null;
  explicacion?: string | null;
  errores?: ErrorCorreccionIaDto[] | null;
}

export interface DescarteCorreccionIa {
  propuesta_id: number;
  estado: 'descartada';
}

const CAMPOS_MODIFICABLES_CORRECCION_IA = [
  'puntaje',
  'valoracion',
  'explicacion',
  'errores',
] as const;

const ESTADOS_DESCARTABLES_CORRECCION_IA: readonly EstadoCorreccionIa[] = [
  'pendiente',
  'generada',
  'modificada',
];

const MOTIVO_CORRECCION_IA_MAX_LONGITUD = 300;

@Injectable()
export class CorreccionIaService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listarPorExamen(
    examenId: number,
    docenteId: number,
    filtros: ListarCorreccionesIaFiltros = {},
  ): Promise<{ total: number; propuestas: CorreccionIaDto[] }> {
    if (!(await this.esPropietarioExamen(examenId, docenteId))) {
      throw errorExamenNoEncontrado();
    }
    validarFiltrosBandeja(filtros);

    const limite = filtros.limite ?? 100;
    const desplazamiento = filtros.desplazamiento ?? 0;
    const where: FindOptionsWhere<CorreccionIa> = { examen_id: examenId };

    if (filtros.estudiante_id !== undefined) {
      where.estudiante_id = filtros.estudiante_id;
    }
    if (filtros.pregunta_id !== undefined) {
      where.pregunta_id = filtros.pregunta_id;
    }
    if (filtros.estado !== undefined) {
      where.estado = filtros.estado;
      if (
        filtros.solo_pendientes_revision === true &&
        filtros.estado !== 'generada' &&
        filtros.estado !== 'modificada'
      ) {
        return { total: 0, propuestas: [] };
      }
    } else if (filtros.solo_pendientes_revision === true) {
      where.estado = In(['generada', 'modificada']);
    }

    const [propuestas, total] = await this.dataSource
      .getRepository(CorreccionIa)
      .findAndCount({
        where,
        select: CAMPOS_PUBLICOS_CORRECCION_IA,
        order: { creada_en: 'DESC' },
        take: limite,
        skip: desplazamiento,
      });

    return {
      total,
      propuestas: propuestas.map(mapearCorreccionIaDto),
    };
  }

  async obtenerDetalle(
    propuestaId: number,
    docenteId: number,
  ): Promise<CorreccionIaDto> {
    const propuesta = await this.dataSource
      .getRepository(CorreccionIa)
      .findOne({
        where: { propuesta_id: propuestaId },
        select: CAMPOS_PUBLICOS_CORRECCION_IA,
      });

    if (
      !propuesta ||
      !(await this.esPropietarioExamen(propuesta.examen_id, docenteId))
    ) {
      throw errorPropuestaNoEncontrada();
    }

    return mapearCorreccionIaDto(propuesta);
  }

  async listarHistorial(
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
    docenteId: number,
    filtros: ListarHistorialCorreccionIaFiltros = {},
  ): Promise<CorreccionIaDto[]> {
    if (!(await this.esPropietarioExamen(examenId, docenteId))) {
      throw errorExamenNoEncontrado();
    }
    validarFiltrosHistorial(filtros);

    const where: FindOptionsWhere<CorreccionIa> = {
      examen_id: examenId,
      estudiante_id: estudianteId,
      pregunta_id: preguntaId,
      letra,
    };
    if (filtros.estado !== undefined) {
      where.estado = filtros.estado;
    }

    const propuestas = await this.dataSource.getRepository(CorreccionIa).find({
      where,
      select: CAMPOS_PUBLICOS_CORRECCION_IA,
      order: { creada_en: 'DESC' },
      take: filtros.limite ?? 50,
    });

    return propuestas.map(mapearCorreccionIaDto);
  }

  async solicitarPropuesta(
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
    docenteId: number,
  ): Promise<SolicitudCorreccionIa> {
    return this.dataSource.transaction(async (manager) => {
      const examen = await manager.getRepository(Examen).findOne({
        where: { examen_id: examenId, docente_id: docenteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!examen) {
        throw new NotFoundException({
          codigo: 'EXAMEN_NO_ENCONTRADO',
          motivo: 'La evaluación no existe o no pertenece al docente.',
        });
      }
      if (examen.estado !== 'publicado') {
        throw new BadRequestException(
          'La evaluación debe estar publicada para solicitar una corrección IA.',
        );
      }
      asegurarEdicionPermitida(examen);

      const rendicion = await manager.getRepository(Rendicion).findOne({
        where: { examen_id: examenId, estudiante_id: estudianteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!rendicion) {
        throw new NotFoundException({
          codigo: 'RENDICION_NO_ENCONTRADA',
          motivo: 'No existe una rendición para este estudiante y evaluación.',
        });
      }
      if (!['enviada', 'corregida'].includes(rendicion.estado)) {
        throw new ConflictException({
          codigo: 'RENDICION_NO_ENVIADA',
          motivo:
            'La rendición debe estar enviada para solicitar una corrección IA.',
        });
      }

      const claveRespuesta = {
        examen_id: examenId,
        estudiante_id: estudianteId,
        pregunta_id: preguntaId,
        letra,
      };
      const asignacion = await manager
        .getRepository(AsignacionPregunta)
        .findOne({
          where: {
            examen_id: examenId,
            estudiante_id: estudianteId,
            pregunta_id: preguntaId,
          },
        });
      const inciso = await manager.getRepository(Inciso).findOne({
        where: { pregunta_id: preguntaId, letra },
      });
      if (!asignacion || !inciso) {
        throw new NotFoundException({
          codigo: 'INCISO_NO_ENCONTRADO',
          motivo:
            'El inciso no pertenece a una pregunta asignada en esta evaluación.',
        });
      }

      // Mantiene el orden de bloqueo de aceptación: examen, rendición,
      // respuesta y, después, propuesta.
      const respuesta = await manager.getRepository(RespuestaInciso).findOne({
        where: claveRespuesta,
        lock: { mode: 'pessimistic_write' },
      });
      if (!respuesta) {
        this.validarSolicitud({
          estado_correccion: 'pendiente',
          estado_rendicion: rendicion.estado,
          puntaje_obtenido: null,
          tipo_respuesta: inciso.tipo_respuesta,
          respuesta_texto: null,
          opciones_marcadas: 0,
          puntaje_max: inciso.puntaje_max,
        });
        throw new Error('La respuesta ausente debió ser rechazada.');
      }

      const correcciones = manager.getRepository(CorreccionIa);
      const propuestaActiva = await correcciones.findOne({
        where: {
          ...claveRespuesta,
          estado: In([...ESTADOS_PROPUESTA_ACTIVA]),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (propuestaActiva) {
        throw this.errorPropuestaActivaExistente();
      }

      const opcionesMarcadas = await manager
        .getRepository(OpcionMarcada)
        .countBy(claveRespuesta);
      const solucionInciso = await manager
        .getRepository(SolucionInciso)
        .findOne({ where: { pregunta_id: preguntaId, letra } });
      const solucionReferencia = await manager
        .getRepository(IaSolucionReferencia)
        .findOne({
          where: {
            pregunta_id: preguntaId,
            docente_id: docenteId,
            revisada_en: Not(IsNull()),
          },
          order: { revisada_en: 'DESC' },
        });

      this.validarSolicitud({
        estado_correccion: respuesta.estado_correccion,
        estado_rendicion: rendicion.estado,
        puntaje_obtenido: respuesta.puntaje_obtenido,
        tipo_respuesta: inciso.tipo_respuesta,
        respuesta_texto: respuesta.respuesta_texto,
        opciones_marcadas: opcionesMarcadas,
        puntaje_max: inciso.puntaje_max,
        solucion_inciso: solucionInciso,
        solucion_referencia: solucionReferencia,
      });

      const ultimaPropuesta = await correcciones.findOne({
        where: claveRespuesta,
        order: { intento: 'DESC' },
      });
      const intento = (ultimaPropuesta?.intento ?? 0) + 1;
      const propuesta = correcciones.create({
        ...claveRespuesta,
        docente_id: docenteId,
        estado: 'pendiente',
        puntaje_max_inciso: inciso.puntaje_max,
        puntaje_sugerido: null,
        confianza: null,
        intento,
        reintentos_worker: 0,
        version: 1,
      });

      try {
        const guardada = await correcciones.save(propuesta);
        return {
          propuesta_id: guardada.propuesta_id,
          estado: 'pendiente',
          intento: guardada.intento,
        };
      } catch (error) {
        if (esColisionIndiceActivo(error)) {
          throw this.errorPropuestaActivaExistente();
        }
        throw error;
      }
    });
  }

  async modificarPropuesta(
    propuestaId: number,
    docenteId: number,
    cambios: CambiosPropuestaCorreccionIa,
  ): Promise<CorreccionIaDto> {
    validarCambiosPropuesta(cambios);

    return this.dataSource.transaction(async (manager) => {
      const propuesta = await this.cargarPropuestaEditable(
        manager,
        propuestaId,
        docenteId,
      );
      if (propuesta.estado !== 'generada') {
        throw errorEstadoNoPermite(
          'Solo se puede modificar una propuesta en estado generada.',
        );
      }

      if (cambios.puntaje !== undefined) {
        this.validarPuntajePropuesta(
          cambios.puntaje,
          propuesta.puntaje_max_inciso ?? '',
        );
        propuesta.puntaje_sugerido = Number(cambios.puntaje).toFixed(2);
      }
      if (cambios.valoracion !== undefined) {
        propuesta.valoracion = cambios.valoracion;
      }
      if (cambios.explicacion !== undefined) {
        propuesta.explicacion = cambios.explicacion;
      }
      if (cambios.errores !== undefined) {
        propuesta.errores = cambios.errores;
      }

      propuesta.estado = 'modificada';
      propuesta.version += 1;

      const guardada = await manager
        .getRepository(CorreccionIa)
        .save(propuesta);
      return mapearCorreccionIaDto(guardada);
    });
  }

  async descartarPropuesta(
    propuestaId: number,
    docenteId: number,
    motivo?: string | null,
  ): Promise<DescarteCorreccionIa> {
    const motivoNormalizado = normalizarMotivoDescarte(motivo);

    return this.dataSource.transaction(async (manager) => {
      const propuesta = await this.cargarPropuestaEditable(
        manager,
        propuestaId,
        docenteId,
      );
      if (!ESTADOS_DESCARTABLES_CORRECCION_IA.includes(propuesta.estado)) {
        throw errorEstadoNoPermite(
          'Solo se puede descartar una propuesta pendiente, generada o modificada.',
        );
      }

      propuesta.estado = 'descartada';
      propuesta.motivo = motivoNormalizado;
      propuesta.version += 1;

      const guardada = await manager
        .getRepository(CorreccionIa)
        .save(propuesta);
      return {
        propuesta_id: guardada.propuesta_id,
        estado: 'descartada',
      };
    });
  }

  async regenerarPropuesta(
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
    docenteId: number,
  ): Promise<SolicitudCorreccionIa> {
    return this.dataSource.transaction(async (manager) => {
      const examen = await manager.getRepository(Examen).findOne({
        where: { examen_id: examenId, docente_id: docenteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!examen) {
        throw errorExamenNoEncontrado();
      }
      asegurarEdicionPermitida(examen);

      const rendicion = await manager.getRepository(Rendicion).findOne({
        where: { examen_id: examenId, estudiante_id: estudianteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!rendicion) {
        throw new NotFoundException({
          codigo: 'RENDICION_NO_ENCONTRADA',
          motivo: 'No existe una rendición para este estudiante y evaluación.',
        });
      }
      if (!['enviada', 'corregida'].includes(rendicion.estado)) {
        throw new ConflictException({
          codigo: 'RENDICION_NO_ENVIADA',
          motivo:
            'La rendición debe estar enviada para solicitar una corrección IA.',
        });
      }

      const claveRespuesta = {
        examen_id: examenId,
        estudiante_id: estudianteId,
        pregunta_id: preguntaId,
        letra,
      };
      const asignacion = await manager
        .getRepository(AsignacionPregunta)
        .findOne({
          where: {
            examen_id: examenId,
            estudiante_id: estudianteId,
            pregunta_id: preguntaId,
          },
        });
      const inciso = await manager.getRepository(Inciso).findOne({
        where: { pregunta_id: preguntaId, letra },
      });
      if (!asignacion || !inciso) {
        throw new NotFoundException({
          codigo: 'INCISO_NO_ENCONTRADO',
          motivo:
            'El inciso no pertenece a una pregunta asignada en esta evaluación.',
        });
      }

      const correcciones = manager.getRepository(CorreccionIa);
      const respuesta = await manager.getRepository(RespuestaInciso).findOne({
        where: claveRespuesta,
        lock: { mode: 'pessimistic_write' },
      });
      const propuestaActiva = await correcciones.findOne({
        where: {
          ...claveRespuesta,
          estado: In([...ESTADOS_PROPUESTA_ACTIVA]),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (propuestaActiva?.estado === 'procesando') {
        throw new ConflictException({
          codigo: 'PROPUESTA_EN_PROCESO',
          motivo:
            'La propuesta activa está siendo procesada; espere a que termine.',
        });
      }

      if (!respuesta) {
        this.validarSolicitud({
          estado_correccion: 'pendiente',
          estado_rendicion: rendicion.estado,
          puntaje_obtenido: null,
          permitir_inciso_corregido: true,
          tipo_respuesta: inciso.tipo_respuesta,
          respuesta_texto: null,
          opciones_marcadas: 0,
          puntaje_max: inciso.puntaje_max,
        });
        throw new Error('La respuesta ausente debió ser rechazada.');
      }

      const opcionesMarcadas = await manager
        .getRepository(OpcionMarcada)
        .countBy(claveRespuesta);
      const solucionInciso = await manager
        .getRepository(SolucionInciso)
        .findOne({ where: { pregunta_id: preguntaId, letra } });
      const solucionReferencia = await manager
        .getRepository(IaSolucionReferencia)
        .findOne({
          where: {
            pregunta_id: preguntaId,
            docente_id: docenteId,
            revisada_en: Not(IsNull()),
          },
          order: { revisada_en: 'DESC' },
        });

      this.validarSolicitud({
        estado_correccion: respuesta.estado_correccion,
        estado_rendicion: rendicion.estado,
        puntaje_obtenido: respuesta.puntaje_obtenido,
        permitir_inciso_corregido: true,
        tipo_respuesta: inciso.tipo_respuesta,
        respuesta_texto: respuesta.respuesta_texto,
        opciones_marcadas: opcionesMarcadas,
        puntaje_max: inciso.puntaje_max,
        solucion_inciso: solucionInciso,
        solucion_referencia: solucionReferencia,
      });

      const ultimaPropuesta = await correcciones.findOne({
        where: claveRespuesta,
        order: { intento: 'DESC' },
      });
      const intento = (ultimaPropuesta?.intento ?? 0) + 1;
      const propuesta = correcciones.create({
        ...claveRespuesta,
        docente_id: docenteId,
        estado: 'pendiente',
        puntaje_max_inciso: inciso.puntaje_max,
        puntaje_sugerido: null,
        confianza: null,
        intento,
        reintentos_worker: 0,
        version: 1,
      });

      try {
        // Libera el índice único activo antes de insertar la nueva fila y,
        // cuando ya existe el identificador, enlaza el reemplazo sin borrar
        // ni reescribir el resto del historial.
        if (propuestaActiva) {
          propuestaActiva.estado = 'reemplazada';
          propuestaActiva.version += 1;
          await correcciones.save(propuestaActiva);
        }

        const guardada = await correcciones.save(propuesta);

        if (propuestaActiva) {
          propuestaActiva.reemplazada_por_id = guardada.propuesta_id;
          await correcciones.save(propuestaActiva);
        }

        return {
          propuesta_id: guardada.propuesta_id,
          estado: 'pendiente',
          intento: guardada.intento,
        };
      } catch (error) {
        if (esColisionIndiceActivo(error)) {
          throw this.errorPropuestaActivaExistente();
        }
        throw error;
      }
    });
  }

  private async cargarPropuestaEditable(
    manager: EntityManager,
    propuestaId: number,
    docenteId: number,
  ): Promise<CorreccionIa> {
    const referencia = await manager.getRepository(CorreccionIa).findOne({
      where: { propuesta_id: propuestaId },
      select: { propuesta_id: true, examen_id: true },
    });
    if (!referencia) {
      throw errorPropuestaNoEncontrada();
    }

    const examen = await manager.getRepository(Examen).findOne({
      where: { examen_id: referencia.examen_id, docente_id: docenteId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!examen) {
      throw errorPropuestaNoEncontrada();
    }
    asegurarEdicionPermitida(examen);

    const propuesta = await manager.getRepository(CorreccionIa).findOne({
      where: { propuesta_id: propuestaId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!propuesta) {
      throw errorPropuestaNoEncontrada();
    }
    return propuesta;
  }

  private async esPropietarioExamen(
    examenId: number,
    docenteId: number,
  ): Promise<boolean> {
    const examen = await this.dataSource.getRepository(Examen).findOne({
      where: { examen_id: examenId, docente_id: docenteId },
      select: { examen_id: true },
    });
    return examen !== null;
  }

  private validarSolicitud(
    entrada: Parameters<typeof validarSolicitudCorreccionIa>[0],
  ): void {
    try {
      validarSolicitudCorreccionIa(entrada);
    } catch (error) {
      if (!(error instanceof ErrorValidacionCorreccionIa)) {
        throw error;
      }

      const respuesta = {
        codigo: error.codigo,
        motivo: error.motivo,
      };
      if (
        error.codigo === 'INCISO_NO_PENDIENTE' ||
        error.codigo === 'RENDICION_NO_ENVIADA'
      ) {
        throw new ConflictException(respuesta);
      }
      throw new BadRequestException(respuesta);
    }
  }

  private validarPuntajePropuesta(
    puntaje: number | string | null,
    puntajeMaximo: number | string,
  ): void {
    try {
      validarPuntajeSugeridoCorreccionIa(puntaje, puntajeMaximo);
    } catch (error) {
      if (!(error instanceof ErrorValidacionCorreccionIa)) {
        throw error;
      }
      throw new BadRequestException({
        codigo: error.codigo,
        motivo: error.motivo,
      });
    }
  }

  private errorPropuestaActivaExistente(): ConflictException {
    return new ConflictException({
      codigo: 'PROPUESTA_ACTIVA_EXISTENTE',
      motivo: 'Ya existe una propuesta activa para este inciso.',
    });
  }
}

function validarFiltrosBandeja(filtros: ListarCorreccionesIaFiltros): void {
  validarEstadoFiltro(filtros.estado);
  validarEnteroFiltro(filtros.estudiante_id, 'estudiante_id');
  validarEnteroFiltro(filtros.pregunta_id, 'pregunta_id');
  validarEnteroFiltro(filtros.limite, 'limite', 1, 200);
  validarEnteroFiltro(filtros.desplazamiento, 'desplazamiento', 0);

  if (
    filtros.solo_pendientes_revision !== undefined &&
    typeof filtros.solo_pendientes_revision !== 'boolean'
  ) {
    throw new BadRequestException(
      'solo_pendientes_revision debe ser un booleano.',
    );
  }
}

function validarFiltrosHistorial(
  filtros: ListarHistorialCorreccionIaFiltros,
): void {
  validarEstadoFiltro(filtros.estado);
  validarEnteroFiltro(filtros.limite, 'limite', 1, 100);
}

function validarEstadoFiltro(estado?: EstadoCorreccionIa): void {
  if (estado !== undefined && !ESTADOS_CORRECCION_IA.includes(estado)) {
    throw new BadRequestException('El filtro estado no es válido.');
  }
}

function validarEnteroFiltro(
  valor: number | undefined,
  nombre: string,
  minimo = 0,
  maximo = Number.MAX_SAFE_INTEGER,
): void {
  if (
    valor !== undefined &&
    (!Number.isInteger(valor) || valor < minimo || valor > maximo)
  ) {
    throw new BadRequestException(`El filtro ${nombre} no es válido.`);
  }
}

function errorExamenNoEncontrado(): NotFoundException {
  return new NotFoundException({
    codigo: 'EXAMEN_NO_ENCONTRADO',
    motivo: 'La evaluación no existe o no pertenece al docente.',
  });
}

function errorPropuestaNoEncontrada(): NotFoundException {
  return new NotFoundException({
    codigo: 'PROPUESTA_NO_ENCONTRADA',
    motivo: 'La propuesta no existe o no pertenece a un examen del docente.',
  });
}

function errorEstadoNoPermite(motivo: string): ConflictException {
  return new ConflictException({
    codigo: 'ESTADO_NO_PERMITE_OPERACION',
    motivo,
  });
}

function asegurarEdicionPermitida(examen: Examen): void {
  if (examen.calificaciones_revisadas_en !== null) {
    throw new ConflictException({
      codigo: 'REVISION_CERRADA',
      motivo: 'Las calificaciones ya fueron confirmadas.',
    });
  }
  if (examen.resultados_publicados_en !== null) {
    throw new ConflictException({
      codigo: 'RESULTADOS_PUBLICADOS',
      motivo: 'Los resultados ya fueron publicados.',
    });
  }
}

function validarCambiosPropuesta(cambios: CambiosPropuestaCorreccionIa): void {
  if (cambios === null || typeof cambios !== 'object') {
    throw new BadRequestException({
      codigo: 'SIN_CAMBIOS',
      motivo: 'Debe modificar al menos un campo no nulo.',
    });
  }

  const valores = cambios as Record<string, unknown>;
  const claves = Object.keys(valores);
  const noPermitidos = claves.filter(
    (clave) =>
      !CAMPOS_MODIFICABLES_CORRECCION_IA.includes(
        clave as (typeof CAMPOS_MODIFICABLES_CORRECCION_IA)[number],
      ),
  );
  if (noPermitidos.length > 0) {
    throw new BadRequestException(
      `Solo se pueden modificar los campos: ${CAMPOS_MODIFICABLES_CORRECCION_IA.join(', ')}.`,
    );
  }

  const conValor = claves.filter(
    (clave) => valores[clave] !== undefined && valores[clave] !== null,
  );
  if (conValor.length === 0) {
    throw new BadRequestException({
      codigo: 'SIN_CAMBIOS',
      motivo: 'Debe modificar al menos un campo no nulo.',
    });
  }

  validarTiposCambios(cambios);
}

function validarTiposCambios(cambios: CambiosPropuestaCorreccionIa): void {
  if (
    cambios.valoracion !== undefined &&
    cambios.valoracion !== null &&
    typeof cambios.valoracion !== 'string'
  ) {
    throw new BadRequestException('El campo valoracion debe ser texto.');
  }
  if (
    cambios.explicacion !== undefined &&
    cambios.explicacion !== null &&
    typeof cambios.explicacion !== 'string'
  ) {
    throw new BadRequestException('El campo explicacion debe ser texto.');
  }
  if (
    cambios.errores !== undefined &&
    cambios.errores !== null &&
    (!Array.isArray(cambios.errores) ||
      !cambios.errores.every(esErrorCorreccionIaDto))
  ) {
    throw new BadRequestException(
      'El campo errores debe ser una lista de errores válidos.',
    );
  }
}

function normalizarMotivoDescarte(motivo?: string | null): string | null {
  if (motivo === undefined || motivo === null) {
    return null;
  }
  if (typeof motivo !== 'string') {
    throw new BadRequestException('El motivo debe ser texto.');
  }

  const normalizado = motivo.trim();
  if (normalizado.length > MOTIVO_CORRECCION_IA_MAX_LONGITUD) {
    throw new BadRequestException(
      `El motivo no puede superar los ${MOTIVO_CORRECCION_IA_MAX_LONGITUD} caracteres.`,
    );
  }
  return normalizado.length === 0 ? null : normalizado;
}

function mapearCorreccionIaDto(propuesta: CorreccionIa): CorreccionIaDto {
  return {
    propuesta_id: propuesta.propuesta_id,
    examen_id: propuesta.examen_id,
    estudiante_id: propuesta.estudiante_id,
    pregunta_id: propuesta.pregunta_id,
    letra: propuesta.letra,
    estado: propuesta.estado,
    puntaje_sugerido: propuesta.puntaje_sugerido,
    puntaje_max_inciso: propuesta.puntaje_max_inciso,
    valoracion: propuesta.valoracion,
    explicacion: propuesta.explicacion,
    errores: mapearErroresCorreccionIa(propuesta.errores),
    confianza: propuesta.confianza,
    criterio_fuente: propuesta.criterio_fuente,
    criterio_hash: propuesta.criterio_hash,
    modelo: propuesta.modelo,
    proveedor: propuesta.proveedor,
    intento: propuesta.intento,
    version: propuesta.version,
    creada_en: propuesta.creada_en.toISOString(),
    iniciada_en: propuesta.iniciada_en?.toISOString() ?? null,
    finalizada_en: propuesta.finalizada_en?.toISOString() ?? null,
    actualizada_en: propuesta.actualizada_en.toISOString(),
    revisada_en: propuesta.revisada_en?.toISOString() ?? null,
    revisada_por_docente_id: propuesta.revisada_por_docente_id,
    reemplazada_por_id: propuesta.reemplazada_por_id,
    error_codigo: propuesta.error_codigo,
    error_mensaje: propuesta.error_mensaje,
    motivo: propuesta.motivo,
  };
}

function mapearErroresCorreccionIa(
  valor: unknown,
): ErrorCorreccionIaDto[] | null {
  if (valor === null) {
    return null;
  }
  if (!Array.isArray(valor) || !valor.every(esErrorCorreccionIaDto)) {
    throw new InternalServerErrorException(
      'La propuesta contiene errores con formato inválido.',
    );
  }

  return valor.map(({ tipo, descripcion, ubicacion }) => ({
    tipo,
    descripcion,
    ...(ubicacion === undefined ? {} : { ubicacion }),
  }));
}

function esErrorCorreccionIaDto(
  valor: unknown,
): valor is EntradaErrorCorreccionIa {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return false;
  }
  if (!('tipo' in valor) || typeof valor.tipo !== 'string') {
    return false;
  }
  if (!('descripcion' in valor) || typeof valor.descripcion !== 'string') {
    return false;
  }
  return !('ubicacion' in valor) || typeof valor.ubicacion === 'string';
}

function esColisionIndiceActivo(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;
  if (
    typeof driverError !== 'object' ||
    driverError === null ||
    !('code' in driverError) ||
    !('constraint' in driverError)
  ) {
    return false;
  }

  return (
    driverError.code === '23505' &&
    driverError.constraint === INDICE_PROPUESTA_ACTIVA
  );
}
