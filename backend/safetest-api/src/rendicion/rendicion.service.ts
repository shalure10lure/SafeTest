import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { DataSource, In } from 'typeorm';
import type { EntityManager } from 'typeorm';

import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';
import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { ExamenTema } from '../examentema/entity/examentema.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { Opcion } from '../opcion/entity/opcion.entity';
import { OpcionMarcada } from '../opcionmarcada/entity/opcionmarcada.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';
import { ParaleloExamen } from '../paraleloexamen/entity/paraleloexamen.entity';
import { Pregunta } from '../pregunta/entity/pregunta.entity';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import { ExamenAccesoService } from '../examen/examen-acceso.service';
import { CorreccionRendicionService } from '../reglacorreccion/correccion-rendicion.service';
import { Rendicion } from './entity/rendicion.entity';
import type { IniciarRendicionDto } from './dto/iniciar-rendicion.dto';
import type { GuardarRespuestaEstudianteDto } from './dto/guardar-respuesta-estudiante.dto';
import type {
  IncisoRendicionEstudianteDto,
  PreguntaRendicionEstudianteDto,
  PreguntasRendicionEstudianteDto,
} from './dto/preguntas-rendicion-estudiante.dto';
import type { RendicionEstudianteDto } from './dto/rendicion-estudiante.dto';
import type { RendicionFinalizadaEstudianteDto } from './dto/rendicion-finalizada-estudiante.dto';
import type { RespuestaGuardadaEstudianteDto } from './dto/respuesta-guardada-estudiante.dto';

import { Examen } from '../examen/entity/examen.entity';

interface FilaIncisoRendicion {
  pregunta_id: number | string;
  enunciado: string;
  letra: string;
  enunciado_inciso: string;
  tipo_respuesta: string;
  nro_opcion: number | string | null;
  texto_opcion: string | null;
}

@Injectable()
export class RendicionService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly examenAccesoService: ExamenAccesoService,
    private readonly correccionRendicionService: CorreccionRendicionService,
  ) { }


  async iniciarORecuperar(
    examenId: number,
    estudianteId: number,
    dto: IniciarRendicionDto,
  ): Promise<RendicionEstudianteDto> {
    await this.finalizarSiVencida(examenId, estudianteId);
    const examen =
      await this.examenAccesoService.obtenerExamenParaRendicion(
        examenId,
        estudianteId,
      );

    try {
      return await this.dataSource.transaction(async (manager) => {
        const rendicionRepository = manager.getRepository(Rendicion);
        const clave = {
          estudiante_id: estudianteId,
          examen_id: examenId,
        };

        const existente = await rendicionRepository.findOne({
          where: clave,
          lock: { mode: 'pessimistic_write' },
        });

        if (existente) {
          await this.verificarTiempoActivo(
            manager,
            existente,
            examenId,
          );

          return this.recuperarExistente(
            manager,
            existente,
            examenId,
            estudianteId,
          );
        }

        await this.validarParalelo(
          manager,
          examen.modo_asignacion,
          examenId,
          estudianteId,
          dto.paralelo_id,
        );

        const insercion = await rendicionRepository
          .createQueryBuilder()
          .insert()
          .values({
            ...clave,
            paralelo_id: dto.paralelo_id,
            estado: 'en_curso',
            fecha_inicio: new Date(),
          })
          .orIgnore()
          .returning(['estudiante_id', 'examen_id'])
          .execute();

        const creada =
          Array.isArray(insercion.raw) &&
          insercion.raw.length > 0;

        const rendicion = await rendicionRepository.findOne({
          where: clave,
          lock: { mode: 'pessimistic_write' },
        });

        if (!rendicion) {
          throw new ConflictException(
            'No se pudo iniciar la evaluación. Inténtalo nuevamente.',
          );
        }

        if (!creada) {
          await this.verificarTiempoActivo(
            manager,
            rendicion,
            examenId,
          );

          return this.recuperarExistente(
            manager,
            rendicion,
            examenId,
            estudianteId,
          );
        }

        await this.verificarTiempoActivo(
          manager,
          rendicion,
          examenId,
        );

        const preguntas = await this.seleccionarPreguntas(
          manager,
          examenId,
          examen,
        );

        if (preguntas.length === 0) {
          throw new BadRequestException(
            'La evaluación no tiene preguntas disponibles para rendir.',
          );
        }

        await manager.getRepository(AsignacionPregunta).insert(
          preguntas.map((pregunta_id, indice) => ({
            estudiante_id: estudianteId,
            examen_id: examenId,
            pregunta_id,
            orden: indice + 1,
          })),
        );

        return {
          examen_id: examenId,
          paralelo_id: rendicion.paralelo_id,
          estado: 'en_curso',
          fecha_inicio: rendicion.fecha_inicio,
          preguntas: preguntas.map((pregunta_id, indice) => ({
            pregunta_id,
            orden: indice + 1,
          })),
          recuperada: false,
        };
      });
    } catch (error) {
      return this.finalizarTrasErrorDeTiempo(
        error,
        examenId,
        estudianteId,
      );
    }
  }


  async consultarPreguntasActivas(
    examenId: number,
    estudianteId: number,
  ): Promise<PreguntasRendicionEstudianteDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const rendicion = await manager.getRepository(Rendicion).findOne({
          where: {
            examen_id: examenId,
            estudiante_id: estudianteId,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!rendicion) {
          throw new NotFoundException(
            'La rendición activa no está disponible.',
          );
        }

        await this.verificarTiempoActivo(
          manager,
          rendicion,
          examenId,
        );

        const asignaciones = await manager
          .getRepository(AsignacionPregunta)
          .find({
            where: {
              examen_id: examenId,
              estudiante_id: estudianteId,
            },
            select: {
              pregunta_id: true,
              orden: true,
            },
            order: { orden: 'ASC' },
          });

        if (asignaciones.length === 0) {
          throw new ConflictException(
            'La rendición activa no tiene preguntas asignadas.',
          );
        }

        const ids = asignaciones.map(
          (asignacion) => asignacion.pregunta_id,
        );

        const filas = await manager
          .getRepository(Pregunta)
          .createQueryBuilder('pregunta')
          .innerJoin('pregunta.incisos', 'inciso')
          .leftJoin('inciso.opciones', 'opcion')
          .select('pregunta.pregunta_id', 'pregunta_id')
          .addSelect('pregunta.enunciado', 'enunciado')
          .addSelect('inciso.letra', 'letra')
          .addSelect('inciso.enunciado_inciso', 'enunciado_inciso')
          .addSelect('inciso.tipo_respuesta', 'tipo_respuesta')
          .addSelect('opcion.nro_opcion', 'nro_opcion')
          .addSelect('opcion.texto_opcion', 'texto_opcion')
          .where('pregunta.pregunta_id IN (:...ids)', { ids })
          .orderBy('pregunta.pregunta_id', 'ASC')
          .addOrderBy('inciso.letra', 'ASC')
          .addOrderBy('opcion.nro_opcion', 'ASC')
          .getRawMany<FilaIncisoRendicion>();

        const preguntas = this.construirPreguntasRendicion(
          filas,
          asignaciones,
        );

        if (preguntas.length !== asignaciones.length) {
          throw new ConflictException(
            'No se pudieron recuperar todas las preguntas asignadas a la rendición.',
          );
        }

        const [respuestas, opcionesMarcadas] = await Promise.all([
          manager.getRepository(RespuestaInciso).find({
            where: {
              estudiante_id: estudianteId,
              examen_id: examenId,
              pregunta_id: In(ids),
            },
            select: {
              pregunta_id: true,
              letra: true,
              respuesta_texto: true,
            },
          }),
          manager.getRepository(OpcionMarcada).find({
            where: {
              estudiante_id: estudianteId,
              examen_id: examenId,
              pregunta_id: In(ids),
            },
            select: {
              pregunta_id: true,
              letra: true,
              nro_opcion: true,
            },
          }),
        ]);

        const respuestasPorInciso = new Map(
          respuestas.map((respuesta) => [
            this.claveInciso(
              respuesta.pregunta_id,
              respuesta.letra,
            ),
            respuesta.respuesta_texto,
          ]),
        );

        const opcionesPorInciso = new Map<string, Set<number>>();

        for (const opcion of opcionesMarcadas) {
          const clave = this.claveInciso(
            opcion.pregunta_id,
            opcion.letra,
          );

          const seleccionadas =
            opcionesPorInciso.get(clave) ?? new Set<number>();

          seleccionadas.add(opcion.nro_opcion);
          opcionesPorInciso.set(clave, seleccionadas);
        }

        // Volvemos a comprobar el tiempo antes de responder.
        await this.verificarTiempoActivo(
          manager,
          rendicion,
          examenId,
        );

        return {
          examen_id: examenId,
          preguntas: preguntas.map((pregunta) => ({
            ...pregunta,
            incisos: pregunta.incisos.map((inciso) =>
              this.conRespuestaGuardada(
                inciso,
                pregunta.pregunta_id,
                respuestasPorInciso,
                opcionesPorInciso,
              ),
            ),
            estado_respuesta: this.preguntaRespondida(
              pregunta,
              respuestasPorInciso,
              opcionesPorInciso,
            )
              ? 'respondida'
              : 'pendiente',
          })),
        };
      });
    } catch (error) {
      return this.finalizarTrasErrorDeTiempo(
        error,
        examenId,
        estudianteId,
      );
    }
  }


  /**
   * Comprueba que la pregunta pertenece a la rendición en curso del estudiante
   * y que su tiempo no terminó. Lo usan los endpoints que entregan contenido de
   * una pregunta (recursos).
   */
  async verificarPreguntaDeRendicionActiva(
    examenId: number,
    estudianteId: number,
    preguntaId: number,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const rendicion = await manager.getRepository(Rendicion).findOne({
          where: {
            examen_id: examenId,
            estudiante_id: estudianteId,
          },
        });

        if (!rendicion) {
          throw new NotFoundException(
            'La rendición activa no está disponible.',
          );
        }

        await this.verificarTiempoActivo(manager, rendicion, examenId);

        const asignacion = await manager
          .getRepository(AsignacionPregunta)
          .findOne({
            where: {
              examen_id: examenId,
              estudiante_id: estudianteId,
              pregunta_id: preguntaId,
            },
            select: { pregunta_id: true },
          });

        if (!asignacion) {
          throw new NotFoundException(
            'La pregunta no pertenece a esta rendición.',
          );
        }
      });
    } catch (error) {
      await this.finalizarTrasErrorDeTiempo(error, examenId, estudianteId);
    }
  }

  async guardarRespuesta(
    examenId: number,
    estudianteId: number,
    preguntaId: number,
    letra: string,
    dto: GuardarRespuestaEstudianteDto,
  ): Promise<RespuestaGuardadaEstudianteDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const rendicion = await manager.getRepository(Rendicion).findOne({
          where: {
            examen_id: examenId,
            estudiante_id: estudianteId,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!rendicion) {
          throw new NotFoundException(
            'La rendición activa no está disponible.',
          );
        }

        await this.verificarTiempoActivo(
          manager,
          rendicion,
          examenId,
        );

        const asignacion = await manager
          .getRepository(AsignacionPregunta)
          .findOne({
            where: {
              examen_id: examenId,
              estudiante_id: estudianteId,
              pregunta_id: preguntaId,
            },
            select: { pregunta_id: true },
          });

        if (!asignacion) {
          throw new NotFoundException(
            'La pregunta no pertenece a esta rendición.',
          );
        }

        const inciso = await manager.getRepository(Inciso).findOne({
          where: {
            pregunta_id: preguntaId,
            letra,
          },
          select: {
            pregunta_id: true,
            letra: true,
            tipo_respuesta: true,
          },
        });

        if (!inciso) {
          throw new NotFoundException(
            'El inciso no pertenece a la pregunta.',
          );
        }

        const tipo = inciso.tipo_respuesta;

        const esTipoDeOpciones =
          tipo === 'opcion_unica' ||
          tipo === 'opcion_multiple' ||
          tipo === 'verdadero_falso';

        const usaRespuestaTexto =
          tipo === 'desarrollo' ||
          tipo === 'numerica';

        if (esTipoDeOpciones) {
          if (
            dto.opciones === undefined ||
            dto.respuesta_texto !== undefined
          ) {
            throw new BadRequestException(
              'Envía únicamente la lista de opciones seleccionadas.',
            );
          }

          await this.validarOpciones(
            manager,
            preguntaId,
            letra,
            tipo,
            dto.opciones,
          );
        } else if (usaRespuestaTexto) {
          if (
            dto.respuesta_texto === undefined ||
            dto.opciones !== undefined
          ) {
            throw new BadRequestException(
              'Envía únicamente la respuesta en texto.',
            );
          }

          this.validarRespuestaTexto(
            tipo,
            dto.respuesta_texto,
          );
        } else {
          throw new BadRequestException(
            'El tipo de respuesta de este inciso no está habilitado.',
          );
        }

        const respuestaTexto = usaRespuestaTexto
          ? dto.respuesta_texto?.trim() || null
          : null;

        const claveRespuesta = {
          estudiante_id: estudianteId,
          examen_id: examenId,
          pregunta_id: preguntaId,
          letra,
        };

        const guardadoEn = new Date();

        await manager.getRepository(RespuestaInciso).upsert(
          {
            ...claveRespuesta,
            respuesta_texto: respuestaTexto,
            guardado_en: guardadoEn,
          },
          [
            'estudiante_id',
            'examen_id',
            'pregunta_id',
            'letra',
          ],
        );

        const opcionMarcadaRepository =
          manager.getRepository(OpcionMarcada);

        await opcionMarcadaRepository.delete(claveRespuesta);

        if (
          esTipoDeOpciones &&
          dto.opciones &&
          dto.opciones.length > 0
        ) {
          await opcionMarcadaRepository.insert(
            dto.opciones.map((nro_opcion) => ({
              ...claveRespuesta,
              nro_opcion,
            })),
          );
        }

        const incisosPregunta = await manager
          .getRepository(Inciso)
          .find({
            where: { pregunta_id: preguntaId },
            select: {
              letra: true,
              tipo_respuesta: true,
            },
          });

        const [respuestasPregunta, opcionesPregunta] =
          await Promise.all([
            manager.getRepository(RespuestaInciso).find({
              where: {
                estudiante_id: estudianteId,
                examen_id: examenId,
                pregunta_id: preguntaId,
              },
              select: {
                pregunta_id: true,
                letra: true,
                respuesta_texto: true,
              },
            }),
            manager.getRepository(OpcionMarcada).find({
              where: {
                estudiante_id: estudianteId,
                examen_id: examenId,
                pregunta_id: preguntaId,
              },
              select: {
                pregunta_id: true,
                letra: true,
                nro_opcion: true,
              },
            }),
          ]);

        const respuestasPorInciso = new Map(
          respuestasPregunta.map((respuesta) => [
            this.claveInciso(
              respuesta.pregunta_id,
              respuesta.letra,
            ),
            respuesta.respuesta_texto,
          ]),
        );

        const opcionesPorInciso = new Map<string, Set<number>>();

        for (const opcion of opcionesPregunta) {
          const clave = this.claveInciso(
            opcion.pregunta_id,
            opcion.letra,
          );

          const seleccionadas =
            opcionesPorInciso.get(clave) ?? new Set<number>();

          seleccionadas.add(opcion.nro_opcion);
          opcionesPorInciso.set(clave, seleccionadas);
        }

        const preguntaRespondida = this.preguntaRespondida(
          {
            pregunta_id: preguntaId,
            incisos: incisosPregunta,
          },
          respuestasPorInciso,
          opcionesPorInciso,
        );

        // Si el tiempo terminó durante el guardado,
        // la transacción se revierte completamente.
        await this.verificarTiempoActivo(
          manager,
          rendicion,
          examenId,
        );

        return {
          examen_id: examenId,
          pregunta_id: preguntaId,
          letra,
          estado_respuesta: preguntaRespondida
            ? 'respondida'
            : 'pendiente',
          guardado_en: guardadoEn,
        };
      });
    } catch (error) {
      return this.finalizarTrasErrorDeTiempo(
        error,
        examenId,
        estudianteId,
      );
    }
  }
  private async validarOpciones(
    manager: EntityManager,
    preguntaId: number,
    letra: string,
    tipo: string,
    opcionesSeleccionadas: number[],
  ): Promise<void> {
    if (tipo === 'opcion_unica' && opcionesSeleccionadas.length !== 1) {
      throw new BadRequestException(
        'Selecciona exactamente una opción para este inciso.',
      );
    }

    if (tipo === 'verdadero_falso' && opcionesSeleccionadas.length !== 1) {
      throw new BadRequestException('Selecciona Verdadero o Falso.');
    }

    if (tipo === 'opcion_multiple' && opcionesSeleccionadas.length === 0) {
      return;
    }

    if (opcionesSeleccionadas.length === 0) return;

    const opcionesRepository = manager.getRepository(Opcion);
    const opciones = await opcionesRepository.find({
      where: {
        pregunta_id: preguntaId,
        letra,
        nro_opcion: In(opcionesSeleccionadas),
      },
      select: { nro_opcion: true, texto_opcion: true },
    });

    if (opciones.length !== opcionesSeleccionadas.length) {
      throw new BadRequestException(
        'Una o más opciones no pertenecen a este inciso.',
      );
    }

    if (tipo === 'verdadero_falso') {
      const etiquetas = opciones.map((opcion) =>
        opcion.texto_opcion.trim().toLocaleLowerCase('es'),
      );
      if (!['verdadero', 'falso'].includes(etiquetas[0])) {
        throw new BadRequestException(
          'La opción seleccionada no es válida para Verdadero/Falso.',
        );
      }
    }
  }

  private validarRespuestaTexto(tipo: string, valor: string): void {
    if (!valor.trim()) return;

    if (tipo === 'numerica') {
      const formatoNumerico = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
      const numero = Number(valor.trim());
      if (!formatoNumerico.test(valor.trim()) || !Number.isFinite(numero)) {
        throw new BadRequestException('Ingresa una respuesta numérica válida.');
      }
    }
  }

  private construirPreguntasRendicion(
    filas: FilaIncisoRendicion[],
    asignaciones: { pregunta_id: number; orden: number }[],
  ): Omit<PreguntaRendicionEstudianteDto, 'estado_respuesta'>[] {
    const preguntasPorId = new Map<
      number,
      {
        pregunta_id: number;
        orden: number;
        enunciado: string;
        incisos: IncisoRendicionEstudianteDto[];
      }
    >();

    for (const fila of filas) {
      const preguntaId = Number(fila.pregunta_id);
      let pregunta = preguntasPorId.get(preguntaId);
      if (!pregunta) {
        const asignacion = asignaciones.find(
          (item) => item.pregunta_id === preguntaId,
        );
        if (!asignacion) continue;

        pregunta = {
          pregunta_id: preguntaId,
          orden: asignacion.orden,
          enunciado: fila.enunciado,
          incisos: [],
        };
        preguntasPorId.set(preguntaId, pregunta);
      }

      let inciso = pregunta.incisos.find((item) => item.letra === fila.letra);
      if (!inciso) {
        inciso = {
          letra: fila.letra,
          enunciado_inciso: fila.enunciado_inciso,
          tipo_respuesta: fila.tipo_respuesta,
          opciones: [],
        };
        pregunta.incisos.push(inciso);
      }

      if (fila.nro_opcion !== null) {
        inciso.opciones.push({
          nro_opcion: Number(fila.nro_opcion),
          texto_opcion: fila.texto_opcion ?? '',
        });
      }
    }

    return asignaciones.flatMap((asignacion) => {
      const pregunta = preguntasPorId.get(asignacion.pregunta_id);
      if (!pregunta) return [];

      const tipos = new Set(
        pregunta.incisos.map((inciso) => inciso.tipo_respuesta),
      );
      return [
        {
          ...pregunta,
          tipo_respuesta:
            tipos.size === 0
              ? null
              : tipos.size === 1
                ? [...tipos][0]
                : 'mixto',
        },
      ];
    });
  }

  /** Agrega al inciso la respuesta que el propio estudiante ya guardó. */
  private conRespuestaGuardada(
    inciso: IncisoRendicionEstudianteDto,
    preguntaId: number,
    respuestas: Map<string, string | null>,
    opciones: Map<string, Set<number>>,
  ): IncisoRendicionEstudianteDto {
    const clave = this.claveInciso(preguntaId, inciso.letra);
    const marcadas = opciones.get(clave);

    if (marcadas && marcadas.size > 0) {
      return {
        ...inciso,
        respuesta: { opciones: [...marcadas].sort((a, b) => a - b) },
      };
    }

    const texto = respuestas.get(clave);
    if (typeof texto === 'string' && texto.trim().length > 0) {
      return { ...inciso, respuesta: { respuesta_texto: texto } };
    }

    return inciso;
  }

  private preguntaRespondida(
    pregunta: {
      pregunta_id: number;
      incisos: Pick<IncisoRendicionEstudianteDto, 'letra' | 'tipo_respuesta'>[];
    },
    respuestas: Map<string, string | null>,
    opciones: Map<string, Set<number>>,
  ): boolean {
    if (pregunta.incisos.length === 0) return false;

    return pregunta.incisos.every((inciso) => {
      const clave = this.claveInciso(pregunta.pregunta_id, inciso.letra);
      const texto = respuestas.get(clave)?.trim() ?? '';
      const opcionesMarcadas = opciones.get(clave)?.size ?? 0;
      return this.incisoRespondido(
        inciso.tipo_respuesta,
        texto,
        opcionesMarcadas,
      );
    });
  }

  private incisoRespondido(
    tipo: string,
    texto: string | null,
    opcionesMarcadas: number,
  ): boolean {
    const respuesta = texto?.trim() ?? '';
    switch (tipo) {
      case 'opcion_unica':
      case 'verdadero_falso':
        return opcionesMarcadas === 1;
      case 'opcion_multiple':
        return opcionesMarcadas > 0;
      case 'desarrollo':
      case 'texto_corto':
        return respuesta.length > 0;
      case 'numerica':
        return (
          respuesta.length > 0 &&
          /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(respuesta) &&
          Number.isFinite(Number(respuesta))
        );
      default:
        return false;
    }
  }

  private claveInciso(preguntaId: number, letra: string): string {
    return `${preguntaId}:${letra}`;
  }

  private async recuperarExistente(
    manager: EntityManager,
    rendicion: Rendicion,
    examenId: number,
    estudianteId: number,
  ): Promise<RendicionEstudianteDto> {
    if (rendicion.estado !== 'en_curso') {
      throw new ConflictException(
        'La rendición de esta evaluación ya no está en curso.',
      );
    }

    const preguntas = await manager.getRepository(AsignacionPregunta).find({
      where: { examen_id: examenId, estudiante_id: estudianteId },
      select: { pregunta_id: true, orden: true },
      order: { orden: 'ASC' },
    });

    if (preguntas.length === 0) {
      throw new ConflictException(
        'La rendición activa no tiene preguntas asignadas.',
      );
    }

    return {
      examen_id: examenId,
      paralelo_id: rendicion.paralelo_id,
      estado: 'en_curso',
      fecha_inicio: rendicion.fecha_inicio,
      preguntas,
      recuperada: true,
    };
  }

  private async validarParalelo(
    manager: EntityManager,
    modoAsignacion: string,
    examenId: number,
    estudianteId: number,
    paraleloId: number,
  ): Promise<void> {
    const paraleloExamen = await manager
      .getRepository(ParaleloExamen)
      .count({ where: { examen_id: examenId, paralelo_id: paraleloId } });

    if (paraleloExamen === 0) {
      throw new NotFoundException(
        'El paralelo no está asociado a la evaluación.',
      );
    }

    if (modoAsignacion === 'paralelos') {
      const inscripcion = await manager.getRepository(Inscripcion).count({
        where: { estudiante_id: estudianteId, paralelo_id: paraleloId },
      });

      if (inscripcion === 0) {
        throw new NotFoundException(
          'El paralelo no está asociado a la evaluación.',
        );
      }
    }
  }

  private async verificarTiempoActivo(
    manager: EntityManager,
    rendicion: Rendicion,
    examenId: number,
  ): Promise<void> {
    if (rendicion.estado !== 'en_curso') {
      throw new ConflictException(
        'La rendición ya no está en curso.',
      );
    }

    if (!rendicion.fecha_inicio) {
      throw new ConflictException(
        'La rendición no tiene una fecha de inicio válida.',
      );
    }

    const examen = await manager.getRepository(Examen).findOne({
      where: { examen_id: examenId },
      select: {
        duracion_min: true,
        disponible_hasta: true,
      },
    });

    if (!examen) {
      throw new NotFoundException(
        'No se encontró la evaluación.',
      );
    }

    const fechaLimite = this.calcularFechaLimite(
      rendicion.fecha_inicio,
      examen.duracion_min,
      examen.disponible_hasta,
    );

    if (fechaLimite && Date.now() >= fechaLimite.getTime()) {
      throw new ConflictException(
        'El tiempo de la evaluación terminó.',
      );
    }
  }

  private async finalizarTrasErrorDeTiempo(
    error: unknown,
    examenId: number,
    estudianteId: number,
  ): Promise<never> {
    if (
      error instanceof ConflictException &&
      error.message === 'El tiempo de la evaluación terminó.'
    ) {
      await this.finalizarSiVencida(examenId, estudianteId);

      throw new ConflictException(
        'El tiempo de la evaluación terminó. No se pueden realizar más cambios.',
      );
    }

    throw error;
  }


  private calcularFechaLimite(
    fechaInicio: Date,
    duracionMin: number | null,
    disponibleHasta: Date | null,
  ): Date | null {
    const limites: number[] = [];

    if (duracionMin !== null) {
      limites.push(
        fechaInicio.getTime() + duracionMin * 60_000,
      );
    }

    if (disponibleHasta !== null) {
      limites.push(disponibleHasta.getTime());
    }

    if (limites.length === 0) {
      return null;
    }

    return new Date(Math.min(...limites));
  }



  async finalizarSiVencida(
    examenId: number,
    estudianteId: number,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const rendicionRepository =
        manager.getRepository(Rendicion);

      const rendicion = await rendicionRepository.findOne({
        where: {
          examen_id: examenId,
          estudiante_id: estudianteId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      // Puede no existir si falló el primer intento de inicio.
      if (!rendicion) {
        return false;
      }

      // Evita enviar dos veces la misma rendición.
      if (rendicion.estado !== 'en_curso') {
        return false;
      }

      const examen = await manager.getRepository(Examen).findOne({
        where: { examen_id: examenId },
        select: {
          duracion_min: true,
          disponible_hasta: true,
          al_terminar_tiempo: true,
        },
      });

      if (!examen) {
        throw new NotFoundException(
          'No se encontró la evaluación.',
        );
      }

      if (!rendicion.fecha_inicio) {
        throw new ConflictException(
          'La rendición no tiene una fecha de inicio válida.',
        );
      }

      const fechaLimite = this.calcularFechaLimite(
        rendicion.fecha_inicio,
        examen.duracion_min,
        examen.disponible_hasta,
      );

      if (!fechaLimite) {
        return false;
      }

      const ahora = new Date();

      if (ahora.getTime() < fechaLimite.getTime()) {
        return false;
      }

      // El envío automático es la política definida para SafeTest.
      if (examen.al_terminar_tiempo !== 'enviar_automatico') {
        return false;
      }

      rendicion.estado = 'enviada';
      rendicion.fecha_envio = ahora;

      const correccion =
        await this.correccionRendicionService.corregirRendicion(
          manager,
          examenId,
          estudianteId,
        );

      if (correccion.completa) {
        rendicion.estado = 'corregida';
        rendicion.nota_final = correccion.notaFinal;
      }

      await rendicionRepository.save(rendicion);

      // No se eliminan las respuestas: solo se agrega su resultado
      // automático y, si corresponde, la nota final de la rendición.
      return true;
    });
  }

  /**
   * Finaliza manualmente el intento del estudiante autenticado (HU-26).
   *
   * Es idempotente: si la rendición ya fue enviada o corregida devuelve su
   * estado sin volver a escribir ni volver a corregir, de modo que un doble
   * envío no falla. La corrección automática (HU-29) se ejecuta una sola vez,
   * en la misma transacción que marca la rendición como enviada.
   */
  async finalizarRendicion(
    examenId: number,
    estudianteId: number,
  ): Promise<RendicionFinalizadaEstudianteDto> {
    return this.dataSource.transaction(async (manager) => {
      const rendicionRepository = manager.getRepository(Rendicion);

      const rendicion = await rendicionRepository.findOne({
        where: {
          examen_id: examenId,
          estudiante_id: estudianteId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!rendicion) {
        throw new NotFoundException(
          'No se encontró la rendición del estudiante.',
        );
      }

      if (rendicion.estado === 'en_curso') {
        rendicion.estado = 'enviada';
        rendicion.fecha_envio = rendicion.fecha_envio ?? new Date();

        const correccion =
          await this.correccionRendicionService.corregirRendicion(
            manager,
            examenId,
            estudianteId,
          );

        if (correccion.completa) {
          rendicion.estado = 'corregida';
          rendicion.nota_final = correccion.notaFinal;
        }

        await rendicionRepository.save(rendicion);
      }

      return {
        examen_id: examenId,
        estado: rendicion.estado as 'enviada' | 'corregida',
        fecha_envio: rendicion.fecha_envio ?? null,
      };
    });
  }


  async obtenerEstadoRendicion(
    examenId: number,
    estudianteId: number,
  ): Promise<{
    examen_id: number;
    estado: string;
    fecha_inicio: Date | null;
    fecha_limite: Date | null;
    fecha_envio: Date | null;
    tiempo_servidor: Date;
    vencida: boolean;
    puede_responder: boolean;
  }> {
    // Actualizar primero el estado si venció el tiempo.
    await this.finalizarSiVencida(examenId, estudianteId);

    const rendicion = await this.dataSource
      .getRepository(Rendicion)
      .findOne({
        where: {
          examen_id: examenId,
          estudiante_id: estudianteId,
        },
        select: {
          examen_id: true,
          estudiante_id: true,
          estado: true,
          fecha_inicio: true,
          fecha_envio: true,
        },
      });

    if (!rendicion) {
      throw new NotFoundException(
        'No se encontró la rendición del estudiante.',
      );
    }

    const examen = await this.dataSource
      .getRepository(Examen)
      .findOne({
        where: { examen_id: examenId },
        select: {
          duracion_min: true,
          disponible_hasta: true,
        },
      });

    if (!examen) {
      throw new NotFoundException(
        'No se encontró la evaluación.',
      );
    }

    const fechaLimite = rendicion.fecha_inicio
      ? this.calcularFechaLimite(
        rendicion.fecha_inicio,
        examen.duracion_min,
        examen.disponible_hasta,
      )
      : null;

    const ahora = new Date();

    const vencida =
      fechaLimite !== null &&
      ahora.getTime() >= fechaLimite.getTime();

    const puedeResponder =
      rendicion.estado === 'en_curso' && !vencida;

    return {
      examen_id: examenId,
      estado: rendicion.estado,
      fecha_inicio: rendicion.fecha_inicio ?? null,
      fecha_limite: fechaLimite,
      fecha_envio: rendicion.fecha_envio ?? null,
      tiempo_servidor: ahora,
      vencida,
      puede_responder: puedeResponder,
    };
  }

  private async seleccionarPreguntas(
    manager: EntityManager,
    examenId: number,
    examen: {
      modo_seleccion: string;
      orden_preguntas: string;
    },
  ): Promise<number[]> {
    let seleccionadas: number[];

    if (examen.modo_seleccion === 'manual') {
      const filas = await manager.getRepository(ExamenPregunta).find({
        where: { examen_id: examenId },
        select: { pregunta_id: true, orden: true },
        order: { orden: 'ASC' },
      });
      seleccionadas = filas.map((fila) => fila.pregunta_id);
    } else if (examen.modo_seleccion === 'aleatorio') {
      const criterios = await manager.getRepository(ExamenTema).find({
        where: { examen_id: examenId },
        order: { tema_id: 'ASC' },
      });

      seleccionadas = [];
      for (const criterio of criterios) {
        const preguntas = await manager.getRepository(Pregunta).find({
          where: { tema_id: criterio.tema_id, activo: true },
          select: { pregunta_id: true },
        });

        if (preguntas.length < criterio.cantidad) {
          throw new BadRequestException(
            'No hay suficientes preguntas activas para iniciar la evaluación.',
          );
        }

        seleccionadas.push(
          ...this.barajar(
            preguntas.map((pregunta) => pregunta.pregunta_id),
          ).slice(0, criterio.cantidad),
        );
      }
    } else {
      throw new BadRequestException(
        'El modo de selección de preguntas no es válido.',
      );
    }

    return examen.orden_preguntas === 'aleatorio'
      ? this.barajar(seleccionadas)
      : seleccionadas;
  }

  private barajar<T>(elementos: T[]): T[] {
    const resultado = [...elementos];

    for (let indice = resultado.length - 1; indice > 0; indice--) {
      const otroIndice = randomInt(indice + 1);
      [resultado[indice], resultado[otroIndice]] = [
        resultado[otroIndice],
        resultado[indice],
      ];
    }

    return resultado;
  }
}
