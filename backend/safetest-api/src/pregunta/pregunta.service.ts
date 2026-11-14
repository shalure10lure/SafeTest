
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';

import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Opcion } from '../opcion/entity/opcion.entity';
import { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';
import { SolucionOpcion } from '../solucionopcion/entity/solucionopcion.entity';
import { SolucionTexto } from '../soluciontexto/entity/soluciontexto.entity';
import { Tema } from '../tema/entity/tema.entity';
import {
  CreatePreguntaDto,
  TipoRespuesta,
} from './entity/dtos/create-pregunta.dto';
import { FiltrarPreguntasDto } from './entity/dtos/filtrar-preguntas.dto';
import { UpdatePreguntaDto } from './entity/dtos/update-pregunta.dto';
import { Pregunta } from './entity/pregunta.entity';
import { PreguntaCongeladaService } from './pregunta-congelada.service';
import {
  validarConfiguracionRespuesta,
  type ConfiguracionRespuesta,
} from './validators/configuracion-respuesta.validator';

/** Letra del único inciso que genera este formulario. */
const LETRA_INCISO = 'a';

/**
 * Origen interno de la pregunta. El cliente nunca lo envía: el controlador
 * usa 'manual' y la aceptación de propuestas generadas por IA usa 'ia'.
 */
export type OrigenPregunta = 'manual' | 'ia';

@Injectable()
export class PreguntaService {
  constructor(
    @InjectRepository(Pregunta)
    private readonly preguntaRepository: Repository<Pregunta>,

    @InjectRepository(Tema)
    private readonly temaRepository: Repository<Tema>,

    @InjectRepository(Materia)
    private readonly materiaRepository: Repository<Materia>,

    @InjectRepository(ExamenPregunta)
    private readonly examenPreguntaRepository: Repository<ExamenPregunta>,

    private readonly dataSource: DataSource,

    private readonly preguntaCongeladaService: PreguntaCongeladaService,
  ) {}

  // Consultar preguntas de las materias del docente autenticado.
  async findAll(docenteId: number, filtros: FiltrarPreguntasDto = {}) {
    // Una materia o un tema ajenos no deben filtrar datos de otro docente.
    if (
      filtros.materia_id !== undefined &&
      filtros.tema_id !== undefined
    ) {
      await this.validarMateriaYTema(
        filtros.materia_id,
        filtros.tema_id,
        docenteId,
      );
    } else if (filtros.materia_id !== undefined) {
      await this.validarMateriaDelDocente(
        filtros.materia_id,
        docenteId,
      );
    } else if (filtros.tema_id !== undefined) {
      await this.validarTemaDelDocente(filtros.tema_id, docenteId);
    }

    const consulta = this.preguntaRepository
      .createQueryBuilder('pregunta')
      .innerJoin('pregunta.tema', 'tema')
      .innerJoin('tema.materia', 'materia')
      .leftJoin('pregunta.incisos', 'inciso')
      .select('pregunta.pregunta_id', 'pregunta_id')
      .addSelect('pregunta.enunciado', 'enunciado')
      .addSelect('pregunta.dificultad', 'dificultad')
      .addSelect('pregunta.origen', 'origen')
      .addSelect('pregunta.activo', 'activo')
      .addSelect('pregunta.creado_en', 'creado_en')
      .addSelect('tema.tema_id', 'tema_id')
      .addSelect('tema.nombre_tema', 'nombre_tema')
      .addSelect('materia.materia_id', 'materia_id')
      .addSelect('materia.nombre', 'materia_nombre')
      .addSelect('COALESCE(SUM(inciso.puntaje_max), 0)', 'puntos')
      .addSelect(
        `CASE
           WHEN COUNT(DISTINCT inciso.tipo_respuesta) = 1 THEN MIN(inciso.tipo_respuesta)
           WHEN COUNT(DISTINCT inciso.tipo_respuesta) > 1 THEN 'mixto'
           ELSE NULL
         END`,
        'tipo_respuesta',
      )
      .where('materia.docente_id = :docenteId', { docenteId })
      .andWhere('pregunta.activo = :activo', { activo: true });

    if (filtros.materia_id !== undefined) {
      consulta.andWhere('materia.materia_id = :materiaId', {
        materiaId: filtros.materia_id,
      });
    }

    if (filtros.tema_id !== undefined) {
      consulta.andWhere('tema.tema_id = :temaId', {
        temaId: filtros.tema_id,
      });
    }

    if (filtros.buscar) {
      consulta.andWhere(
        "pregunta.enunciado ILIKE :buscar ESCAPE '\\'",
        { buscar: `%${this.escaparLike(filtros.buscar)}%` },
      );
    }

    if (filtros.tipo === 'mixto') {
      consulta.having(
        'COUNT(DISTINCT inciso.tipo_respuesta) > 1',
      );
    } else if (filtros.tipo) {
      consulta.having(
        'COUNT(DISTINCT inciso.tipo_respuesta) = 1 AND MIN(inciso.tipo_respuesta) = :tipo',
        { tipo: filtros.tipo },
      );
    }

    const filas = await consulta
      .groupBy('pregunta.pregunta_id')
      .addGroupBy('tema.tema_id')
      .addGroupBy('materia.materia_id')
      .orderBy('pregunta.creado_en', 'DESC')
      .addOrderBy('pregunta.pregunta_id', 'DESC')
      .getRawMany<{
        pregunta_id: number;
        enunciado: string;
        tema_id: number;
        dificultad: string | null;
        origen: string;
        activo: boolean;
        creado_en: Date;
        nombre_tema: string;
        materia_id: number;
        materia_nombre: string;
        puntos: string;
        tipo_respuesta: string | null;
      }>();

    return filas.map((fila) => ({
      pregunta_id: Number(fila.pregunta_id),
      enunciado: fila.enunciado,
      tema_id: Number(fila.tema_id),
      dificultad: fila.dificultad,
      origen: fila.origen,
      activo: fila.activo,
      creado_en: fila.creado_en,
      tipo_respuesta: fila.tipo_respuesta,
      puntos: Number(fila.puntos),
      tema: {
        tema_id: Number(fila.tema_id),
        nombre_tema: fila.nombre_tema,
      },
      materia: {
        materia_id: Number(fila.materia_id),
        nombre: fila.materia_nombre,
      },
    }));
  }

  // Consultar una pregunta verificando que pertenezca al docente.
  async findOne(id: number, docenteId: number, manager?: EntityManager) {
    const repositorio = manager
      ? manager.getRepository(Pregunta)
      : this.preguntaRepository;

    const pregunta = await repositorio
      .createQueryBuilder('pregunta')
      .innerJoin('pregunta.tema', 'tema')
      .innerJoin('tema.materia', 'materia')
      .where('pregunta.pregunta_id = :id', { id })
      .andWhere('materia.docente_id = :docenteId', { docenteId })
      .andWhere('pregunta.activo = :activo', { activo: true })
      .select([
        'pregunta.pregunta_id',
        'pregunta.enunciado',
        'pregunta.explicacion',
        'pregunta.tema_id',
        'pregunta.dificultad',
        'pregunta.origen',
        'pregunta.activo',
        'pregunta.creado_en',
        'tema.tema_id',
        'tema.nombre_tema',
        'materia.materia_id',
        'materia.nombre',
      ])
      .getOne();

    if (!pregunta) {
      throw new NotFoundException('Pregunta no encontrada');
    }

    return pregunta;
  }

    // Consultar una pregunta con su configuración de respuesta (para editarla).
  async findOneDetalle(id: number, docenteId: number) {
    const pregunta = await this.findOne(id, docenteId);

    const [inciso, opciones, correctas, solucion] = await Promise.all([
      this.dataSource.getRepository(Inciso).findOneBy({
        pregunta_id: id,
        letra: LETRA_INCISO,
      }),
      this.dataSource.getRepository(Opcion).find({
        where: { pregunta_id: id, letra: LETRA_INCISO },
        order: { nro_opcion: 'ASC' },
      }),
      this.dataSource.getRepository(SolucionOpcion).find({
        where: { pregunta_id: id, letra: LETRA_INCISO },
      }),
      this.dataSource.getRepository(SolucionInciso).findOneBy({
        pregunta_id: id,
        letra: LETRA_INCISO,
      }),
    ]);

    const nrosCorrectos = new Set(
      correctas.map((correcta) => correcta.nro_opcion),
    );
    const tipo = inciso?.tipo_respuesta ?? null;

    return {
      ...pregunta,
      tipo_respuesta: tipo,
      puntaje_max: inciso ? Number(inciso.puntaje_max) : null,
      opciones: opciones.map((opcion) => ({
        nro_opcion: opcion.nro_opcion,
        texto_opcion: opcion.texto_opcion,
        es_correcta: nrosCorrectos.has(opcion.nro_opcion),
      })),
      valor_correcto:
        tipo === 'numerica' && solucion
          ? Number(solucion.valor_correcto)
          : null,
      tolerancia:
        tipo === 'numerica' && solucion
          ? Number(solucion.tolerancia)
          : null,
      solucion_referencia:
        tipo === 'desarrollo' && solucion
          ? solucion.rubrica || null
          : null,
    };
  }

  // Comprobar que la pregunta es del docente y puede modificarse (no está
  // congelada ni pertenece a una evaluación publicada).
  //
  // Es una comprobación de solo lectura: no bloquea la fila, por lo que no
  // garantiza nada frente a una publicación concurrente. Toda mutación debe
  // ejecutarse con `ejecutarEdicion()` o `bloquearPreguntaEditable()`.
  async obtenerEditable(id: number, docenteId: number) {
    const pregunta = await this.findOne(id, docenteId);

    // La congelación por instantánea es permanente y prevalece sobre el estado
    // actual de la evaluación.
    await this.preguntaCongeladaService.validarModificable(id);
    await this.validarNoVinculadaAExamen(id, true);

    return pregunta;
  }

  /**
   * Bloquea la pregunta y valida que pueda modificarse dentro de la
   * transacción recibida. Orden: `Pregunta` (FOR UPDATE) → congelación →
   * propiedad → vínculo con evaluaciones publicadas.
   *
   * Al ser el primer bloqueo de la transacción, comparte el mecanismo con
   * `ExamenService.publicar()`, que también bloquea `Pregunta` antes de
   * insertar la instantánea.
   */
  private async bloquearPreguntaEditable(
    manager: EntityManager,
    id: number,
    docenteId: number,
    soloPublicados: boolean,
  ): Promise<Pregunta> {
    const pregunta =
      await this.preguntaCongeladaService.bloquearYValidarModificable(
        id,
        manager,
      );

    await this.findOne(id, docenteId, manager);
    await this.validarNoVinculadaAExamen(id, soloPublicados, manager);

    return pregunta;
  }

  /**
   * Ejecuta una mutación de la pregunta dentro de una transacción que bloquea
   * su fila y comprueba la congelación antes de escribir. Lo usan las
   * operaciones sobre recursos, que no pueden abrir su propia transacción sin
   * duplicar la comprobación.
   */
  async ejecutarEdicion<T>(
    id: number,
    docenteId: number,
    operacion: (manager: EntityManager, pregunta: Pregunta) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const pregunta = await this.bloquearPreguntaEditable(
        manager,
        id,
        docenteId,
        true,
      );

      return operacion(manager, pregunta);
    });
  }

  // Verificar que el tema pertenezca a una materia activa del docente.
  private async validarTemaDelDocente(
    temaId: number,
    docenteId: number,
    manager?: EntityManager,
  ): Promise<Tema> {
    const repositorio = manager
      ? manager.getRepository(Tema)
      : this.temaRepository;

    const tema = await repositorio
      .createQueryBuilder('tema')
      .innerJoin('tema.materia', 'materia')
      .where('tema.tema_id = :temaId', { temaId })
      .andWhere('materia.docente_id = :docenteId', { docenteId })
      .andWhere('materia.activo = :activo', { activo: true })
      .getOne();

    if (!tema) {
      throw new NotFoundException(
        'Tema no encontrado en tus materias activas',
      );
    }

    return tema;
  }

  // Comprobar si la pregunta está vinculada a algún examen.
  // soloPublicados = true: solo cuentan los exámenes ya publicados (edición).
  private async validarNoVinculadaAExamen(
    preguntaId: number,
    soloPublicados = false,
    manager?: EntityManager,
  ): Promise<void> {
    const repositorio = manager
      ? manager.getRepository(ExamenPregunta)
      : this.examenPreguntaRepository;

    const consulta = repositorio
      .createQueryBuilder('examenPregunta')
      .innerJoin('examenPregunta.examen', 'examen')
      .where('examenPregunta.pregunta_id = :preguntaId', { preguntaId });

    if (soloPublicados) {
      consulta.andWhere('examen.estado = :estado', {
        estado: 'publicado',
      });
    }

    const vinculadas = await consulta.getCount();

    if (vinculadas > 0) {
      throw new ConflictException(
        soloPublicados
          ? 'No puedes modificar una pregunta que pertenece a una evaluación publicada'
          : 'No puedes modificar ni desactivar una pregunta vinculada a un examen',
      );
    }
  }

  /** Escapa comodines de LIKE para que la búsqueda sea literal. */
  private escaparLike(texto: string): string {
    return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
  }

  // Verificar que una materia pertenezca al docente autenticado.
  private async validarMateriaDelDocente(
    materiaId: number,
    docenteId: number,
    manager?: EntityManager,
  ): Promise<Materia> {
    const filtros = {
      materia_id: materiaId,
      docente_id: docenteId,
      activo: true,
    };

    const materia = manager
      ? await manager.findOne(Materia, { where: filtros })
      : await this.materiaRepository.findOneBy(filtros);

    if (!materia) {
      throw new NotFoundException(
        'Materia no encontrada en tus materias activas',
      );
    }

    return materia;
  }

  // Verificar que la materia y el tema pertenezcan al docente autenticado.
  private async validarMateriaYTema(
    materiaId: number,
    temaId: number,
    docenteId: number,
    manager?: EntityManager,
  ): Promise<{ materia: Materia; tema: Tema }> {
    const materia = await this.validarMateriaDelDocente(
      materiaId,
      docenteId,
      manager,
    );

    const tema = manager
      ? await manager.findOneBy(Tema, { tema_id: temaId })
      : await this.temaRepository.findOneBy({ tema_id: temaId });

    if (!tema) {
      throw new NotFoundException('Tema no encontrado');
    }

    if (tema.materia_id !== materia.materia_id) {
      throw new BadRequestException(
        'El tema no pertenece a la materia seleccionada',
      );
    }

    return { materia, tema };
  }

  // Crear una pregunta nueva con su inciso, opciones y solución.
  async create(
    dto: CreatePreguntaDto,
    docenteId: number,
    origen: OrigenPregunta = 'manual',
  ) {
    return this.dataSource.transaction((manager) =>
      this.crearEnTransaccion(manager, dto, docenteId, origen),
    );
  }

  /**
   * Crea la pregunta dentro de una transacción existente. Lo usan la creación
   * manual y la aceptación de propuestas de IA para compartir validaciones,
   * persistencia y forma de respuesta.
   */
  async crearEnTransaccion(
    manager: EntityManager,
    dto: CreatePreguntaDto,
    docenteId: number,
    origen: OrigenPregunta,
  ) {
    const { materia, tema } = await this.validarMateriaYTema(
      dto.materia_id,
      dto.tema_id,
      docenteId,
      manager,
    );

    const enunciado = dto.enunciado.trim();

    if (!enunciado) {
      throw new BadRequestException('El enunciado es obligatorio');
    }

    const configuracion = validarConfiguracionRespuesta(dto);

    const pregunta = manager.create(Pregunta, {
      enunciado,
      explicacion: dto.explicacion?.trim() || null,
      tema_id: tema.tema_id,
      dificultad: dto.dificultad ?? null,
      origen,
      activo: true,
    });

    const preguntaGuardada = await manager.save(pregunta);

    const inciso = manager.create(Inciso, {
      pregunta_id: preguntaGuardada.pregunta_id,
      letra: LETRA_INCISO,
      enunciado_inciso: enunciado,
      tipo_respuesta: dto.tipo_respuesta,
      puntaje_max: dto.puntaje_max.toString(),
    });

    await manager.save(inciso);

    await this.guardarRespuesta(
      manager,
      preguntaGuardada.pregunta_id,
      dto.tipo_respuesta,
      configuracion,
    );

    return {
      pregunta_id: preguntaGuardada.pregunta_id,
      enunciado: preguntaGuardada.enunciado,
      explicacion: preguntaGuardada.explicacion,
      materia_id: materia.materia_id,
      tema_id: tema.tema_id,
      tipo_respuesta: dto.tipo_respuesta,
      puntaje_max: dto.puntaje_max,
      opciones: configuracion.opciones.map((opcion, indice) => ({
        nro_opcion: indice + 1,
        texto_opcion: opcion.texto_opcion,
        es_correcta: opcion.es_correcta,
      })),
      valor_correcto: configuracion.valorCorrecto,
      tolerancia: configuracion.tolerancia,
      solucion_referencia: configuracion.solucionReferencia,
    };
  }

    /** Guarda opciones y soluciones de un inciso según el tipo de pregunta. */
  private async guardarRespuesta(
    manager: EntityManager,
    preguntaId: number,
    tipo: TipoRespuesta,
    configuracion: ConfiguracionRespuesta,
  ): Promise<void> {
    for (let indice = 0; indice < configuracion.opciones.length; indice++) {
      const opcionDto = configuracion.opciones[indice];
      const nroOpcion = indice + 1;

      await manager.save(
        manager.create(Opcion, {
          pregunta_id: preguntaId,
          letra: LETRA_INCISO,
          nro_opcion: nroOpcion,
          texto_opcion: opcionDto.texto_opcion,
        }),
      );

      if (opcionDto.es_correcta) {
        await manager.save(
          manager.create(SolucionOpcion, {
            pregunta_id: preguntaId,
            letra: LETRA_INCISO,
            nro_opcion: nroOpcion,
          }),
        );
      }
    }

    if (tipo === 'numerica' || configuracion.solucionReferencia !== null) {
      await manager.save(
        manager.create(SolucionInciso, {
          pregunta_id: preguntaId,
          letra: LETRA_INCISO,
          valor_correcto: (configuracion.valorCorrecto ?? 0).toString(),
          tolerancia: (configuracion.tolerancia ?? 0).toString(),
          rubrica: configuracion.solucionReferencia ?? '',
        }),
      );
    }
  }

  // Actualizar una pregunta existente (datos básicos y configuración).
  async update(
    id: number,
    dto: UpdatePreguntaDto,
    docenteId: number,
  ) {
    await this.dataSource.transaction(async (manager) => {
      // El bloqueo y la comprobación de congelación ocurren dentro de la misma
      // transacción que las escrituras de la pregunta y de sus incisos.
      const pregunta = await this.bloquearPreguntaEditable(
        manager,
        id,
        docenteId,
        true,
      );

      // --- Clasificación ---
      let temaId = pregunta.tema_id;

      if (dto.tema_id !== undefined) {
        const tema =
          dto.materia_id !== undefined
            ? (
                await this.validarMateriaYTema(
                  dto.materia_id,
                  dto.tema_id,
                  docenteId,
                  manager,
                )
              ).tema
            : await this.validarTemaDelDocente(
                dto.tema_id,
                docenteId,
                manager,
              );

        temaId = tema.tema_id;
      } else if (dto.materia_id !== undefined) {
        // Solo cambia la materia: el tema actual debe pertenecer a ella.
        await this.validarMateriaYTema(
          dto.materia_id,
          pregunta.tema_id,
          docenteId,
          manager,
        );
      }

      // --- Datos básicos ---
      const enunciado =
        dto.enunciado !== undefined ? dto.enunciado.trim() : undefined;

      if (enunciado === '') {
        throw new BadRequestException('El enunciado es obligatorio');
      }

      // --- Configuración de respuesta ---
      const tocaConfiguracion =
        dto.puntaje_max !== undefined ||
        dto.opciones !== undefined ||
        dto.valor_correcto !== undefined ||
        dto.tolerancia !== undefined ||
        dto.solucion_referencia !== undefined;

      if (tocaConfiguracion && dto.tipo_respuesta === undefined) {
        throw new BadRequestException(
          'Indica el tipo de pregunta para modificar su configuración',
        );
      }

      const tipo = dto.tipo_respuesta;
      const configuracion =
        tipo !== undefined
          ? validarConfiguracionRespuesta({
              tipo_respuesta: tipo,
              opciones: dto.opciones,
              valor_correcto: dto.valor_correcto,
              tolerancia: dto.tolerancia,
              solucion_referencia: dto.solucion_referencia,
            })
          : null;

      const cambios: {
        tema_id: number;
        enunciado?: string;
        dificultad?: string;
      } = { tema_id: temaId };

      if (enunciado !== undefined) cambios.enunciado = enunciado;
      if (dto.dificultad !== undefined) cambios.dificultad = dto.dificultad;

      await manager.update(Pregunta, { pregunta_id: id }, cambios);

      if (tipo === undefined || configuracion === null) return;

      const otrosIncisos = await manager.countBy(Inciso, {
        pregunta_id: id,
        letra: Not(LETRA_INCISO),
      });

      if (otrosIncisos > 0) {
        throw new BadRequestException(
          'Esta pregunta tiene varios incisos y su configuración no se puede editar desde este formulario',
        );
      }

      const clave = { pregunta_id: id, letra: LETRA_INCISO };
      const enunciadoInciso = enunciado ?? pregunta.enunciado;
      const inciso = await manager.findOneBy(Inciso, clave);

      if (inciso) {
        await manager.update(Inciso, clave, {
          enunciado_inciso: enunciadoInciso,
          tipo_respuesta: tipo,
          ...(dto.puntaje_max !== undefined && {
            puntaje_max: dto.puntaje_max.toString(),
          }),
        });
      } else {
        if (dto.puntaje_max === undefined) {
          throw new BadRequestException(
            'Indica el puntaje máximo del inciso',
          );
        }

        await manager.save(
          manager.create(Inciso, {
            ...clave,
            enunciado_inciso: enunciadoInciso,
            tipo_respuesta: tipo,
            puntaje_max: dto.puntaje_max.toString(),
          }),
        );
      }

      // Reemplazo completo de la configuración anterior.
      await manager.delete(SolucionOpcion, clave);
      await manager.delete(SolucionInciso, clave);
      await manager.delete(SolucionTexto, clave);
      await manager.delete(Opcion, clave);

      await this.guardarRespuesta(manager, id, tipo, configuracion);
    });

    // Devolver la pregunta actualizada con su configuración.
    return this.findOneDetalle(id, docenteId);
  }

  // Baja lógica: no borrar físicamente la pregunta.
  async remove(id: number, docenteId: number) {
    await this.dataSource.transaction(async (manager) => {
      // La baja lógica también compite con la publicación: se bloquea la fila
      // y se comprueba la instantánea antes de desactivarla.
      const pregunta = await this.bloquearPreguntaEditable(
        manager,
        id,
        docenteId,
        false,
      );

      pregunta.activo = false;

      await manager.save(pregunta);
    });

    return {
      mensaje: 'Pregunta desactivada correctamente',
    };
  }
}
