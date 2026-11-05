import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';

import { IA_CONFIG, type IaConfig } from '../config/ia.config';
import type { DificultadIa, MaterialIa } from '../ia/ai.types';
import { ErrorGeneracionIa } from '../ia/ia.errors';
import { IaGeneracionMaterial } from '../iageneracionmaterial/entity/iageneracionmaterial.entity';
import { IaPropuestaPregunta } from '../iapropuestapregunta/entity/iapropuestapregunta.entity';
import { MaterialAcademico } from '../materialacademico/entity/materialacademico.entity';
import { Materia } from '../materia/entity/materia.entity';
import {
  CreatePreguntaDto,
  TIPOS_RESPUESTA,
  type TipoRespuesta,
} from '../pregunta/entity/dtos/create-pregunta.dto';
import { PreguntaService } from '../pregunta/pregunta.service';
import { validarConfiguracionRespuesta } from '../pregunta/validators/configuracion-respuesta.validator';
import { Tema } from '../tema/entity/tema.entity';
import type { ActualizarPropuestaIaDto } from './dto/actualizar-propuesta-ia.dto';
import type { FiltrarGeneracionesIaDto } from './dto/filtrar-generaciones-ia.dto';
import { sanitizarMensaje } from './iageneracion.errores';
import {
  CANTIDAD_MAXIMA_PREGUNTAS,
  CANTIDAD_MINIMA_PREGUNTAS,
  DIFICULTADES_IA,
  type AlmacenGeneraciones,
  type ContenidoPropuesta,
  type CrearGeneracionIaEntrada,
  type GeneracionContexto,
  type ResultadoGeneracionAlmacenado,
} from './iageneracion.types';
import { IaGeneracion } from './entity/iageneracion.entity';

/**
 * Persistencia y validación de las generaciones de IA.
 *
 * Implementa AlmacenGeneraciones, el contrato mínimo que usa el worker, y
 * expone la creación y el seguimiento que consumirán las capas superiores.
 */
@Injectable()
export class IaGeneracionService implements AlmacenGeneraciones {
  private readonly logger = new Logger(IaGeneracionService.name);

  constructor(
    @InjectRepository(IaGeneracion)
    private readonly generacionRepository: Repository<IaGeneracion>,

    @InjectRepository(IaGeneracionMaterial)
    private readonly generacionMaterialRepository: Repository<IaGeneracionMaterial>,

    @InjectRepository(IaPropuestaPregunta)
    private readonly propuestaRepository: Repository<IaPropuestaPregunta>,

    @InjectRepository(MaterialAcademico)
    private readonly materialRepository: Repository<MaterialAcademico>,

    @InjectRepository(Materia)
    private readonly materiaRepository: Repository<Materia>,

    @InjectRepository(Tema)
    private readonly temaRepository: Repository<Tema>,

    @Inject(IA_CONFIG)
    private readonly config: IaConfig,

    private readonly dataSource: DataSource,

    private readonly preguntaService: PreguntaService,
  ) {}

  /**
   * Crea la solicitud en estado 'pendiente'. Solo se aceptan materiales del
   * docente que estén activos, autorizados para IA y con texto extraído.
   */
  async crear(
    docenteId: number,
    entrada: CrearGeneracionIaEntrada,
  ): Promise<{ generacion_id: number; estado: 'pendiente' }> {
    this.validarEntrada(entrada);

    const materialIds = this.normalizarMateriales(entrada.material_ids);
    if (materialIds.length === 0) {
      throw new BadRequestException(
        'Selecciona al menos un material autorizado con texto extraído para generar preguntas basadas en documentos',
      );
    }

    const materia = await this.validarMateria(entrada.materia_id, docenteId);
    const tema = await this.validarTema(entrada.tema_id, materia.materia_id);
    const materiales = await this.validarMateriales(materialIds, docenteId);

    const generacion = this.generacionRepository.create({
      docente_id: docenteId,
      materia_id: materia.materia_id,
      tema_id: tema.tema_id,
      tipo_respuesta: entrada.tipo_respuesta,
      cantidad: entrada.cantidad,
      dificultad: entrada.dificultad,
      estado: 'pendiente',
    });

    const guardada = await this.dataSource.transaction(async (manager) => {
      const creada = await manager.save(IaGeneracion, generacion);

      if (materiales.length > 0) {
        await manager.insert(
          IaGeneracionMaterial,
          materiales.map((material) => ({
            generacion_id: creada.generacion_id,
            material_id: material.material_id,
          })),
        );
      }

      return creada;
    });

    // Solo ids y conteos: nunca el contenido de los materiales.
    this.logger.log(
      `Generación ${guardada.generacion_id} creada en estado pendiente con ${materiales.length} material(es).`,
    );

    return { generacion_id: guardada.generacion_id, estado: 'pendiente' };
  }

  /**
   * Listado de las generaciones del docente autenticado, más recientes primero.
   * Nunca se filtra por un docente enviado por el cliente.
   */
  async listar(docenteId: number, filtros: FiltrarGeneracionesIaDto = {}) {
    const where: FindOptionsWhere<IaGeneracion> = {
      docente_id: docenteId,
    };

    if (filtros.estado) {
      where.estado = filtros.estado;
    }

    if (filtros.materia_id !== undefined) {
      where.materia_id = filtros.materia_id;
    }

    const generaciones = await this.generacionRepository.find({
      where,
      relations: { materia: true, tema: true },
      order: { fecha: 'DESC', generacion_id: 'DESC' },
    });

    return generaciones.map((generacion) => ({
      generacion_id: generacion.generacion_id,
      estado: generacion.estado,
      tipo_respuesta: generacion.tipo_respuesta,
      dificultad: generacion.dificultad,
      cantidad: generacion.cantidad,
      cantidad_generada: generacion.cantidad_generada,
      materia_id: generacion.materia_id,
      materia: generacion.materia?.nombre ?? null,
      tema_id: generacion.tema_id,
      tema: generacion.tema?.nombre_tema ?? null,
      proveedor: generacion.proveedor,
      modelo: generacion.modelo,
      error_mensaje: generacion.error_mensaje,
      fecha: generacion.fecha,
      iniciada_en: generacion.iniciada_en,
      finalizada_en: generacion.finalizada_en,
    }));
  }

  /** Seguimiento de una generación del docente autenticado. */
  async obtener(docenteId: number, generacionId: number) {
    const generacion = await this.generacionRepository.findOne({
      where: { generacion_id: generacionId, docente_id: docenteId },
      relations: {
        materia: true,
        tema: true,
        propuestas: true,
        materiales: { material: true },
      },
      order: { propuestas: { propuesta_id: 'ASC' } },
    });

    if (!generacion) {
      throw new NotFoundException('Generación no encontrada');
    }

    return {
      generacion_id: generacion.generacion_id,
      estado: generacion.estado,
      tipo_respuesta: generacion.tipo_respuesta,
      dificultad: generacion.dificultad,
      cantidad: generacion.cantidad,
      cantidad_generada: generacion.cantidad_generada,
      materia_id: generacion.materia_id,
      materia: generacion.materia?.nombre ?? null,
      tema_id: generacion.tema_id,
      tema: generacion.tema?.nombre_tema ?? null,
      proveedor: generacion.proveedor,
      modelo: generacion.modelo,
      tokens: {
        entrada: generacion.tokens_entrada,
        salida: generacion.tokens_salida,
        total: generacion.tokens_total,
      },
      error_mensaje: generacion.error_mensaje,
      iniciada_en: generacion.iniciada_en,
      finalizada_en: generacion.finalizada_en,
      fecha: generacion.fecha,
      // Solo identificación y título: nunca el texto extraído ni rutas internas.
      materiales: (generacion.materiales ?? [])
        .map((fila) => ({
          material_id: fila.material?.material_id ?? fila.material_id,
          titulo: fila.material?.titulo ?? 'Material no disponible',
        }))
        .sort((a, b) => a.material_id - b.material_id),
      propuestas:
        generacion.propuestas?.map((propuesta) => ({
          propuesta_id: propuesta.propuesta_id,
          tipo_respuesta: generacion.tipo_respuesta,
          contenido: propuesta.contenido,
          estado: propuesta.estado,
          pregunta_id: propuesta.pregunta_id,
        })) ?? [],
    };
  }

  /**
   * Edita el contenido de una propuesta pendiente.
   *
   * El tipo de pregunta es inmutable: se toma de la generación y nunca del
   * cliente. Solo se actualiza el JSONB `contenido`; `estado` y `pregunta_id`
   * quedan intactos.
   */
  async actualizarPropuesta(
    docenteId: number,
    generacionId: number,
    propuestaId: number,
    dto: ActualizarPropuestaIaDto,
  ) {
    const { generacion, propuesta } = await this.buscarPropuestaDelDocente(
      docenteId,
      generacionId,
      propuestaId,
    );

    this.asegurarPropuestaPendiente(propuesta);

    const tipo = leerTipoRespuesta(generacion.tipo_respuesta);

    if (!tipo) {
      throw new BadRequestException(
        'La generación no tiene un tipo de pregunta válido',
      );
    }

    const contenido = this.construirContenidoPropuesta(tipo, dto);

    const resultado = await this.propuestaRepository.update(
      {
        propuesta_id: propuestaId,
        generacion_id: generacionId,
        estado: 'pendiente',
      },
      { contenido },
    );

    if (!resultado.affected) {
      throw new ConflictException(
        'La propuesta ya no está pendiente y no puede modificarse',
      );
    }

    return {
      propuesta_id: propuestaId,
      contenido,
      estado: 'pendiente',
      pregunta_id: propuesta.pregunta_id,
    };
  }

  /** Marca la propuesta como aceptada. No crea la pregunta del banco (T12). */
  async aceptarPropuesta(
    docenteId: number,
    generacionId: number,
    propuestaId: number,
  ) {
    return this.cambiarEstadoPropuesta(
      docenteId,
      generacionId,
      propuestaId,
      'aceptada',
    );
  }

  /** Marca la propuesta como descartada. No modifica el banco de preguntas. */
  async descartarPropuesta(
    docenteId: number,
    generacionId: number,
    propuestaId: number,
  ) {
    return this.cambiarEstadoPropuesta(
      docenteId,
      generacionId,
      propuestaId,
      'descartada',
    );
  }

  /**
   * Inserta una propuesta aceptada dentro del banco y la vincula atómicamente.
   * El bloqueo de la fila serializa solicitudes concurrentes para la misma
   * propuesta; una repetición devuelve el identificador existente.
   */
  async insertarPropuesta(
    docenteId: number,
    generacionId: number,
    propuestaId: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const generacion = await manager.findOne(IaGeneracion, {
        where: { generacion_id: generacionId, docente_id: docenteId },
      });

      if (!generacion) {
        throw new NotFoundException('Generación no encontrada');
      }

      const propuesta = await manager.findOne(IaPropuestaPregunta, {
        where: {
          propuesta_id: propuestaId,
          generacion_id: generacionId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!propuesta) {
        throw new NotFoundException('Propuesta no encontrada');
      }

      if (propuesta.estado !== 'aceptada') {
        throw new ConflictException(
          'Solo se pueden insertar propuestas aceptadas',
        );
      }

      if (propuesta.pregunta_id !== null) {
        return {
          propuesta_id: propuesta.propuesta_id,
          pregunta_id: propuesta.pregunta_id,
          estado: propuesta.estado,
          insertada: false,
          ya_estaba_insertada: true,
        };
      }

      const tipo = leerTipoRespuesta(generacion.tipo_respuesta);

      if (!tipo) {
        throw new BadRequestException(
          'La generación no tiene un tipo de pregunta válido',
        );
      }

      const dto = this.construirDtoPregunta(
        generacion,
        tipo,
        propuesta.contenido,
      );
      const preguntaCreada = await this.preguntaService.crearEnTransaccion(
        manager,
        dto,
        docenteId,
        'ia',
      );
      const actualizacion = await manager.update(
        IaPropuestaPregunta,
        {
          propuesta_id: propuestaId,
          generacion_id: generacionId,
          estado: 'aceptada',
          pregunta_id: IsNull(),
        },
        { pregunta_id: preguntaCreada.pregunta_id },
      );

      if (actualizacion.affected !== 1) {
        throw new ConflictException(
          'La propuesta ya fue insertada en el banco',
        );
      }

      return {
        propuesta_id: propuesta.propuesta_id,
        pregunta_id: preguntaCreada.pregunta_id,
        estado: 'aceptada',
        insertada: true,
        ya_estaba_insertada: false,
      };
    });
  }

  private construirDtoPregunta(
    generacion: IaGeneracion,
    tipo: TipoRespuesta,
    contenidoCrudo: unknown,
  ): CreatePreguntaDto {
    if (
      typeof contenidoCrudo !== 'object' ||
      contenidoCrudo === null ||
      Array.isArray(contenidoCrudo)
    ) {
      throw new BadRequestException(
        'El contenido de la propuesta no es válido',
      );
    }

    const contenido = contenidoCrudo as Record<string, unknown>;
    if (
      typeof contenido.dificultad !== 'string' ||
      !DIFICULTADES_IA.some(
        (dificultad) => dificultad === contenido.dificultad,
      ) ||
      (typeof contenido.solucion_referencia === 'string' &&
        contenido.solucion_referencia.length > 4_000) ||
      (typeof contenido.explicacion === 'string' &&
        contenido.explicacion.length > 2_000)
    ) {
      throw new BadRequestException(
        'El contenido de la propuesta no cumple los límites de IA',
      );
    }

    const dto = plainToInstance(
      CreatePreguntaDto,
      {
        materia_id: generacion.materia_id,
        tema_id: generacion.tema_id,
        tipo_respuesta: tipo,
        enunciado: contenido.enunciado,
        dificultad: contenido.dificultad,
        puntaje_max: contenido.puntaje_max,
        opciones: contenido.opciones,
        valor_correcto: contenido.valor_correcto,
        tolerancia: contenido.tolerancia,
        solucion_referencia: contenido.solucion_referencia,
        explicacion: contenido.explicacion,
      },
      { enableImplicitConversion: true },
    );
    const errores = validateSync(dto);

    if (errores.length > 0) {
      const mensajes = errores.flatMap((error) =>
        Object.values(error.constraints ?? {}),
      );
      throw new BadRequestException(
        mensajes.length > 0
          ? mensajes
          : 'El contenido de la propuesta no es válido',
      );
    }

    return dto;
  }

  private async cambiarEstadoPropuesta(
    docenteId: number,
    generacionId: number,
    propuestaId: number,
    estado: 'aceptada' | 'descartada',
  ) {
    const { propuesta } = await this.buscarPropuestaDelDocente(
      docenteId,
      generacionId,
      propuestaId,
    );

    this.asegurarPropuestaPendiente(propuesta);

    const resultado = await this.propuestaRepository.update(
      {
        propuesta_id: propuestaId,
        generacion_id: generacionId,
        estado: 'pendiente',
      },
      estado === 'aceptada'
        ? { estado, pregunta_id: null }
        : { estado },
    );

    if (!resultado.affected) {
      throw new ConflictException(
        'La propuesta ya no está pendiente y no puede revisarse',
      );
    }

    return {
      propuesta_id: propuestaId,
      contenido: propuesta.contenido,
      estado,
      pregunta_id:
        estado === 'aceptada' ? null : propuesta.pregunta_id,
    };
  }

  /**
   * Busca la generación por docente y la propuesta dentro de esa generación.
   * Un recurso ajeno se responde como 404 para no revelar su existencia.
   */
  private async buscarPropuestaDelDocente(
    docenteId: number,
    generacionId: number,
    propuestaId: number,
  ): Promise<{
    generacion: IaGeneracion;
    propuesta: IaPropuestaPregunta;
  }> {
    const generacion = await this.generacionRepository.findOne({
      where: { generacion_id: generacionId, docente_id: docenteId },
    });

    if (!generacion) {
      throw new NotFoundException('Generación no encontrada');
    }

    const propuesta = await this.propuestaRepository.findOne({
      where: {
        propuesta_id: propuestaId,
        generacion_id: generacionId,
      },
    });

    if (!propuesta) {
      throw new NotFoundException('Propuesta no encontrada');
    }

    return { generacion, propuesta };
  }

  private asegurarPropuestaPendiente(propuesta: IaPropuestaPregunta): void {
    if (propuesta.estado !== 'pendiente') {
      throw new ConflictException(
        'Solo se pueden revisar propuestas pendientes',
      );
    }
  }

  private construirContenidoPropuesta(
    tipo: TipoRespuesta,
    dto: ActualizarPropuestaIaDto,
  ): ContenidoPropuesta {
    const enunciado = dto.enunciado.trim();

    if (!enunciado) {
      throw new BadRequestException('El enunciado es obligatorio');
    }

    const configuracion = validarConfiguracionRespuesta({
      tipo_respuesta: tipo,
      opciones: dto.opciones,
      valor_correcto: dto.valor_correcto,
      tolerancia: dto.tolerancia,
      solucion_referencia: dto.solucion_referencia,
    });

    const contenido: ContenidoPropuesta = {
      enunciado,
      dificultad: dto.dificultad,
      puntaje_max: dto.puntaje_max,
    };

    const explicacion = dto.explicacion?.trim();

    if (explicacion) {
      contenido.explicacion = explicacion;
    }

    if (configuracion.opciones.length > 0) {
      contenido.opciones = configuracion.opciones.map((opcion) => ({
        texto_opcion: opcion.texto_opcion,
        es_correcta: opcion.es_correcta,
      }));
    }

    if (configuracion.valorCorrecto !== null) {
      contenido.valor_correcto = configuracion.valorCorrecto;
      contenido.tolerancia = configuracion.tolerancia ?? 0;
    }

    if (configuracion.solucionReferencia) {
      contenido.solucion_referencia = configuracion.solucionReferencia;
    }

    return contenido;
  }

  async listarPendientes(limite: number): Promise<number[]> {
    const filas = await this.generacionRepository.find({
      where: { estado: 'pendiente' },
      order: { fecha: 'ASC' },
      take: Math.max(1, Math.floor(limite)),
      select: { generacion_id: true },
    });

    return filas.map((fila) => fila.generacion_id);
  }

  /**
   * Reclamo atómico: solo una ejecución puede pasar de 'pendiente' a
   * 'procesando'. Si otra instancia ya la tomó, affected es 0.
   */
  async reclamar(generacionId: number, ahora: Date): Promise<boolean> {
    const resultado = await this.generacionRepository
      .createQueryBuilder()
      .update(IaGeneracion)
      .set({
        estado: 'procesando',
        iniciada_en: ahora,
        finalizada_en: null,
        error_mensaje: null,
      })
      .where('generacion_id = :generacionId', { generacionId })
      .andWhere('estado = :estado', { estado: 'pendiente' })
      .execute();

    return (resultado.affected ?? 0) === 1;
  }

  /**
   * Carga los datos para el proveedor. Los materiales que dejaron de estar
   * autorizados hacen fallar la generación: nunca se omiten en silencio.
   */
  async cargarContexto(generacionId: number): Promise<GeneracionContexto> {
    const generacion = await this.generacionRepository.findOne({
      where: { generacion_id: generacionId },
      relations: { materia: true, tema: true },
    });

    if (!generacion) {
      throw new ErrorGeneracionIa(
        'datos_invalidos',
        `La generación ${generacionId} no existe.`,
      );
    }

    const filas = await this.generacionMaterialRepository.find({
      where: { generacion_id: generacionId },
      relations: { material: true },
    });

    if (filas.length === 0) {
      throw new ErrorGeneracionIa(
        'materiales_no_disponibles',
        `La generación ${generacionId} no tiene materiales de contexto.`,
      );
    }

    const materialesDeOtroDocente = filas.filter(
      (fila) => fila.material?.docente_id !== generacion.docente_id,
    );
    if (materialesDeOtroDocente.length > 0) {
      throw new ErrorGeneracionIa(
        'materiales_no_disponibles',
        `La generación ${generacionId} contiene materiales de otro docente.`,
      );
    }

    const tipoRespuesta = leerTipoRespuesta(generacion.tipo_respuesta);
    const dificultad = leerDificultad(generacion.dificultad);

    if (
      !tipoRespuesta ||
      !dificultad ||
      generacion.cantidad === null ||
      generacion.cantidad < CANTIDAD_MINIMA_PREGUNTAS
    ) {
      throw new ErrorGeneracionIa(
        'datos_invalidos',
        `La generación ${generacionId} no tiene datos completos.`,
      );
    }

    return {
      generacion_id: generacion.generacion_id,
      materia: generacion.materia?.nombre ?? `materia ${generacion.materia_id}`,
      tema: generacion.tema?.nombre_tema ?? 'tema general',
      tipo_respuesta: tipoRespuesta,
      cantidad: generacion.cantidad,
      dificultad,
      materiales: this.construirMateriales(filas, generacionId),
    };
  }

  /**
   * Guarda las propuestas y marca la generación como completada en una sola
   * transacción. Si la generación dejó de estar en proceso, revierte todo.
   */
  async guardarCompletada(
    generacionId: number,
    resultado: ResultadoGeneracionAlmacenado,
    ahora: Date,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      if (resultado.propuestas.length > 0) {
        await manager.insert(
          IaPropuestaPregunta,
          resultado.propuestas.map((contenido) => ({
            generacion_id: generacionId,
            contenido,
            estado: 'pendiente',
          })),
        );
      }

      const actualizacion = await manager.update(
        IaGeneracion,
        { generacion_id: generacionId, estado: 'procesando' },
        {
          estado: 'completada',
          cantidad_generada: resultado.propuestas.length,
          proveedor: resultado.proveedor,
          modelo: resultado.modelo,
          tokens_entrada: resultado.tokens.entrada,
          tokens_salida: resultado.tokens.salida,
          tokens_total: resultado.tokens.total,
          error_mensaje: null,
          finalizada_en: ahora,
        },
      );

      if (!actualizacion.affected) {
        throw new ErrorGeneracionIa(
          'datos_invalidos',
          `La generación ${generacionId} ya no estaba en proceso.`,
        );
      }
    });
  }

  async marcarError(
    generacionId: number,
    mensaje: string,
    ahora: Date,
  ): Promise<void> {
    const resultado = await this.generacionRepository.update(
      { generacion_id: generacionId, estado: 'procesando' },
      {
        estado: 'error',
        cantidad_generada: 0,
        error_mensaje: sanitizarMensaje(mensaje),
        finalizada_en: ahora,
      },
    );

    if (!resultado.affected) {
      this.logger.warn(
        `La generación ${generacionId} ya no estaba en proceso; no se registró el error.`,
      );
    }
  }

  async reencolar(generacionId: number, ahora: Date): Promise<void> {
    await this.generacionRepository.update(
      { generacion_id: generacionId, estado: 'procesando' },
      {
        estado: 'pendiente',
        iniciada_en: null,
        error_mensaje: null,
        finalizada_en: null,
      },
    );

    this.logger.debug(
      `Generación ${generacionId} devuelta a pendiente a las ${ahora.toISOString()}.`,
    );
  }

  /**
   * Las generaciones 'procesando' más antiguas que el margen se consideran
   * interrumpidas y vuelven a 'pendiente'. Sin columna de intentos, el
   * contador de reintentos vive en memoria del worker.
   */
  async recuperarInterrumpidas(
    ahora: Date,
    antiguedadMs: number,
  ): Promise<number> {
    const limite = new Date(ahora.getTime() - antiguedadMs);

    const resultado = await this.generacionRepository
      .createQueryBuilder()
      .update(IaGeneracion)
      .set({ estado: 'pendiente', iniciada_en: null, error_mensaje: null })
      .where('estado = :estado', { estado: 'procesando' })
      .andWhere('(iniciada_en IS NULL OR iniciada_en < :limite)', { limite })
      .execute();

    return resultado.affected ?? 0;
  }

  private validarEntrada(entrada: CrearGeneracionIaEntrada): void {
    if (
      !Number.isInteger(entrada.materia_id) ||
      entrada.materia_id < 1 ||
      !Number.isInteger(entrada.tema_id) ||
      entrada.tema_id < 1
    ) {
      throw new BadRequestException('La materia y el tema son obligatorios');
    }

    if (!TIPOS_RESPUESTA.includes(entrada.tipo_respuesta)) {
      throw new BadRequestException('El tipo de pregunta no es válido');
    }

    if (!DIFICULTADES_IA.includes(entrada.dificultad)) {
      throw new BadRequestException(
        'La dificultad debe ser facil, media o dificil',
      );
    }

    if (
      !Number.isInteger(entrada.cantidad) ||
      entrada.cantidad < CANTIDAD_MINIMA_PREGUNTAS ||
      entrada.cantidad > CANTIDAD_MAXIMA_PREGUNTAS
    ) {
      throw new BadRequestException(
        `La cantidad debe estar entre ${CANTIDAD_MINIMA_PREGUNTAS} y ${CANTIDAD_MAXIMA_PREGUNTAS}`,
      );
    }
  }

  private normalizarMateriales(materialIds?: number[]): number[] {
    const ids = Array.from(new Set(materialIds ?? []));

    if (ids.some((id) => !Number.isInteger(id) || id < 1)) {
      throw new BadRequestException(
        'Los materiales seleccionados no son válidos',
      );
    }

    if (ids.length > this.config.maxMateriales) {
      throw new BadRequestException(
        `Puedes usar como máximo ${this.config.maxMateriales} materiales`,
      );
    }

    return ids;
  }

  private async validarMateria(
    materiaId: number,
    docenteId: number,
  ): Promise<Materia> {
    const materia = await this.materiaRepository.findOneBy({
      materia_id: materiaId,
      docente_id: docenteId,
      activo: true,
    });

    if (!materia) {
      throw new NotFoundException(
        'Materia no encontrada en tus materias activas',
      );
    }

    return materia;
  }

  private async validarTema(temaId: number, materiaId: number): Promise<Tema> {
    const tema = await this.temaRepository.findOneBy({ tema_id: temaId });

    if (!tema || tema.materia_id !== materiaId) {
      throw new NotFoundException(
        'Tema no encontrado en la materia seleccionada',
      );
    }

    return tema;
  }

  private async validarMateriales(
    materialIds: number[],
    docenteId: number,
  ): Promise<MaterialAcademico[]> {
    if (materialIds.length === 0) {
      return [];
    }

    const materiales = await this.materialRepository.find({
      where: { material_id: In(materialIds), docente_id: docenteId },
    });

    if (materiales.length !== materialIds.length) {
      throw new BadRequestException(
        'Uno o más materiales no existen o no te pertenecen',
      );
    }

    const inactivos = materiales.filter((material) => !material.activo);

    if (inactivos.length > 0) {
      throw new BadRequestException(
        `Los materiales ${describirMateriales(inactivos)} están inactivos`,
      );
    }

    const sinTexto = materiales.filter(
      (material) => !material.texto_extraido?.trim(),
    );

    if (sinTexto.length > 0) {
      throw new BadRequestException(
        `Los materiales ${describirMateriales(sinTexto)} no tienen texto extraído disponible`,
      );
    }

    const noAutorizados = materiales.filter(
      (material) => !material.autorizado_ia,
    );

    if (noAutorizados.length > 0) {
      throw new BadRequestException(
        `Los materiales ${describirMateriales(noAutorizados)} no están autorizados para IA. Activa su autorización explícitamente antes de usarlos`,
      );
    }

    return materiales;
  }

  /**
   * Construye el contexto enviado al proveedor. Si algún material vinculado
   * perdió la autorización (o fue desactivado) después de crear la solicitud,
   * la generación falla con un mensaje claro en vez de omitirlo en silencio.
   */
  private construirMateriales(
    filas: IaGeneracionMaterial[],
    generacionId: number,
  ): MaterialIa[] {
    const noDisponibles = filas.filter(
      (fila) =>
        !fila.material ||
        !fila.material.activo ||
        !fila.material.autorizado_ia ||
        !fila.material.texto_extraido?.trim(),
    );

    if (noDisponibles.length > 0) {
      this.logger.warn(
        `Generación ${generacionId} detenida: ${noDisponibles.length} material(es) ya no están disponibles para IA.`,
      );

      throw new ErrorGeneracionIa(
        'materiales_no_disponibles',
        `La generación ${generacionId} tiene materiales sin autorización vigente.`,
      );
    }

    if (filas.length > this.config.maxMateriales) {
      throw new ErrorGeneracionIa(
        'materiales_no_disponibles',
        `La generación ${generacionId} supera el máximo de materiales permitido.`,
      );
    }

    const disponibles = filas.map((fila) => fila.material);
    const materiales: MaterialIa[] = [];
    let caracteresDisponibles = this.config.maxCaracteresTotales;

    for (const material of disponibles) {
      if (
        materiales.length >= this.config.maxMateriales ||
        caracteresDisponibles <= 0
      ) {
        break;
      }

      const texto = material.texto_extraido?.trim();

      if (!texto) {
        continue;
      }

      const recortado = texto.slice(0, caracteresDisponibles);

      materiales.push({ titulo: material.titulo, texto: recortado });
      caracteresDisponibles -= recortado.length;
    }

    return materiales;
  }
}

function leerTipoRespuesta(valor: string | null): TipoRespuesta | null {
  return TIPOS_RESPUESTA.find((tipo) => tipo === valor) ?? null;
}

function leerDificultad(valor: string | null): DificultadIa | null {
  return DIFICULTADES_IA.find((dificultad) => dificultad === valor) ?? null;
}

/** Nombres de materiales ya verificados como propios del docente. */
function describirMateriales(materiales: MaterialAcademico[]): string {
  return materiales
    .map((material) => `"${material.titulo}" (${material.material_id})`)
    .join(', ');
}
