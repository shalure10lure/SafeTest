
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Opcion } from '../opcion/entity/opcion.entity';
import { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';
import { SolucionOpcion } from '../solucionopcion/entity/solucionopcion.entity';
import { Tema } from '../tema/entity/tema.entity';
import {
  CreatePreguntaDto,
  OpcionPreguntaDto,
  TipoRespuesta,
} from './entity/dtos/create-pregunta.dto';
import { FiltrarPreguntasDto } from './entity/dtos/filtrar-preguntas.dto';
import { UpdatePreguntaDto } from './entity/dtos/update-pregunta.dto';
import { Pregunta } from './entity/pregunta.entity';

/** Letra del único inciso que genera este formulario. */
const LETRA_INCISO = 'a';

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
  async findOne(id: number, docenteId: number) {
    const pregunta = await this.preguntaRepository
      .createQueryBuilder('pregunta')
      .innerJoin('pregunta.tema', 'tema')
      .innerJoin('tema.materia', 'materia')
      .where('pregunta.pregunta_id = :id', { id })
      .andWhere('materia.docente_id = :docenteId', { docenteId })
      .andWhere('pregunta.activo = :activo', { activo: true })
      .select([
        'pregunta.pregunta_id',
        'pregunta.enunciado',
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

  // Verificar que el tema pertenezca a una materia activa del docente.
  private async validarTemaDelDocente(
    temaId: number,
    docenteId: number,
  ): Promise<Tema> {
    const tema = await this.temaRepository
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
  private async validarNoVinculadaAExamen(
    preguntaId: number,
  ): Promise<void> {
    const vinculada =
      await this.examenPreguntaRepository.existsBy({
        pregunta_id: preguntaId,
      });

    if (vinculada) {
      throw new ConflictException(
        'No puedes modificar ni desactivar una pregunta vinculada a un examen',
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

  // Verificar que la materia y el tema pertenezcan al docente autenticado.
  private async validarMateriaYTema(
    materiaId: number,
    temaId: number,
    docenteId: number,
  ): Promise<{ materia: Materia; tema: Tema }> {
    const materia = await this.validarMateriaDelDocente(
      materiaId,
      docenteId,
    );

    const tema = await this.temaRepository.findOneBy({ tema_id: temaId });

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

  /** Normaliza el texto para detectar opciones repetidas. */
  private normalizarTextoOpcion(texto: string): string {
    return texto.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
  }

  /**
   * Valida la configuración de respuesta según el tipo y devuelve los datos
   * normalizados que se guardarán en las tablas de solución.
   */
  private validarConfiguracionRespuesta(dto: CreatePreguntaDto): {
    opciones: OpcionPreguntaDto[];
    valorCorrecto: number | null;
    tolerancia: number | null;
    solucionReferencia: string | null;
  } {
    const tipo: TipoRespuesta = dto.tipo_respuesta;
    const opciones = (dto.opciones ?? []).map((opcion) => ({
      ...opcion,
      texto_opcion: opcion.texto_opcion?.trim() ?? '',
    }));

    if (tipo === 'opcion_unica' || tipo === 'opcion_multiple') {
      if (opciones.length < 2) {
        throw new BadRequestException(
          'Agrega al menos 2 opciones con texto',
        );
      }

      if (opciones.some((opcion) => !opcion.texto_opcion)) {
        throw new BadRequestException(
          'Completa el texto de todas las opciones o elimina las que no uses',
        );
      }

      const textos = opciones.map((opcion) =>
        this.normalizarTextoOpcion(opcion.texto_opcion),
      );

      if (new Set(textos).size !== textos.length) {
        throw new BadRequestException(
          'Las opciones no pueden repetirse',
        );
      }

      const correctas = opciones.filter(
        (opcion) => opcion.es_correcta,
      ).length;

      if (tipo === 'opcion_unica' && correctas !== 1) {
        throw new BadRequestException(
          'Marca exactamente una respuesta correcta',
        );
      }

      if (tipo === 'opcion_multiple' && correctas < 1) {
        throw new BadRequestException(
          'Marca al menos una respuesta correcta',
        );
      }

      return {
        opciones,
        valorCorrecto: null,
        tolerancia: null,
        solucionReferencia: null,
      };
    }

    if (tipo === 'verdadero_falso') {
      if (opciones.length !== 2) {
        throw new BadRequestException(
          'Verdadero/Falso debe tener dos opciones',
        );
      }

      const textos = opciones.map((opcion) =>
        this.normalizarTextoOpcion(opcion.texto_opcion),
      );

      if (
        new Set(textos).size !== 2 ||
        !textos.includes('verdadero') ||
        !textos.includes('falso')
      ) {
        throw new BadRequestException(
          'Las opciones de Verdadero/Falso deben ser Verdadero y Falso',
        );
      }

      const correctas = opciones.filter(
        (opcion) => opcion.es_correcta,
      ).length;

      if (correctas !== 1) {
        throw new BadRequestException(
          'Selecciona una única respuesta correcta',
        );
      }

      return {
        opciones,
        valorCorrecto: null,
        tolerancia: null,
        solucionReferencia: null,
      };
    }

    if (tipo === 'numerica') {
      if (
        dto.valor_correcto === undefined ||
        dto.valor_correcto === null ||
        !Number.isFinite(dto.valor_correcto)
      ) {
        throw new BadRequestException(
          'Ingresa un valor numérico válido',
        );
      }

      const tolerancia = dto.tolerancia ?? 0;

      if (!Number.isFinite(tolerancia) || tolerancia < 0) {
        throw new BadRequestException(
          'La tolerancia debe ser un número mayor o igual que 0',
        );
      }

      return {
        opciones: [],
        valorCorrecto: dto.valor_correcto,
        tolerancia,
        solucionReferencia: null,
      };
    }

    if (tipo === 'desarrollo') {
      return {
        opciones: [],
        valorCorrecto: null,
        tolerancia: null,
        solucionReferencia: dto.solucion_referencia?.trim() || null,
      };
    }

    throw new BadRequestException('El tipo de pregunta no es válido');
  }

  // Crear una pregunta nueva con su inciso, opciones y solución.
  async create(dto: CreatePreguntaDto, docenteId: number) {
    const { materia, tema } = await this.validarMateriaYTema(
      dto.materia_id,
      dto.tema_id,
      docenteId,
    );

    const enunciado = dto.enunciado.trim();

    if (!enunciado) {
      throw new BadRequestException('El enunciado es obligatorio');
    }

    const configuracion = this.validarConfiguracionRespuesta(dto);

    return this.dataSource.transaction(async (manager) => {
      const pregunta = manager.create(Pregunta, {
        enunciado,
        tema_id: tema.tema_id,
        dificultad: dto.dificultad ?? null,
        origen: 'manual',
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

      const opcionesGuardadas: {
        nro_opcion: number;
        texto_opcion: string;
        es_correcta: boolean;
      }[] = [];

      for (let indice = 0; indice < configuracion.opciones.length; indice++) {
        const opcionDto = configuracion.opciones[indice];
        const nroOpcion = indice + 1;

        const opcion = manager.create(Opcion, {
          pregunta_id: preguntaGuardada.pregunta_id,
          letra: LETRA_INCISO,
          nro_opcion: nroOpcion,
          texto_opcion: opcionDto.texto_opcion,
        });

        await manager.save(opcion);

        if (opcionDto.es_correcta) {
          await manager.save(
            manager.create(SolucionOpcion, {
              pregunta_id: preguntaGuardada.pregunta_id,
              letra: LETRA_INCISO,
              nro_opcion: nroOpcion,
            }),
          );
        }

        opcionesGuardadas.push({
          nro_opcion: nroOpcion,
          texto_opcion: opcionDto.texto_opcion,
          es_correcta: opcionDto.es_correcta,
        });
      }

      // La tabla solucion_inciso se usa para respuestas numéricas y para la
      // solución de referencia de las preguntas abiertas.
      const requiereSolucionInciso =
        dto.tipo_respuesta === 'numerica' ||
        configuracion.solucionReferencia !== null;

      if (requiereSolucionInciso) {
        await manager.save(
          manager.create(SolucionInciso, {
            pregunta_id: preguntaGuardada.pregunta_id,
            letra: LETRA_INCISO,
            valor_correcto: (configuracion.valorCorrecto ?? 0).toString(),
            tolerancia: (configuracion.tolerancia ?? 0).toString(),
            rubrica: configuracion.solucionReferencia ?? '',
          }),
        );
      }

      return {
        pregunta_id: preguntaGuardada.pregunta_id,
        enunciado: preguntaGuardada.enunciado,
        materia_id: materia.materia_id,
        tema_id: tema.tema_id,
        tipo_respuesta: dto.tipo_respuesta,
        puntaje_max: dto.puntaje_max,
        opciones: opcionesGuardadas,
        valor_correcto: configuracion.valorCorrecto,
        tolerancia: configuracion.tolerancia,
        solucion_referencia: configuracion.solucionReferencia,
      };
    });
  }

  // Actualizar una pregunta existente.
  async update(
    id: number,
    dto: UpdatePreguntaDto,
    docenteId: number,
  ) {
    const pregunta = await this.findOne(id, docenteId);

    await this.validarNoVinculadaAExamen(id);

    if (dto.tema_id !== undefined) {
      const tema =
        dto.materia_id !== undefined
          ? (
              await this.validarMateriaYTema(
                dto.materia_id,
                dto.tema_id,
                docenteId,
              )
            ).tema
          : await this.validarTemaDelDocente(
              dto.tema_id,
              docenteId,
            );

      // Actualizar la relación y no solamente el ID.
      pregunta.tema = tema;
      pregunta.tema_id = tema.tema_id;
    } else if (dto.materia_id !== undefined) {
      // Solo cambia la materia: el tema actual debe pertenecer a ella.
      await this.validarMateriaYTema(
        dto.materia_id,
        pregunta.tema_id,
        docenteId,
      );
    }

    if (dto.enunciado !== undefined) {
      pregunta.enunciado = dto.enunciado.trim();
    }

    if (dto.dificultad !== undefined) {
      pregunta.dificultad = dto.dificultad;
    }

    await this.preguntaRepository.save(pregunta);

    // Devolver la pregunta actualizada con su tema.
    return this.findOne(id, docenteId);
  }

  // Baja lógica: no borrar físicamente la pregunta.
  async remove(id: number, docenteId: number) {
    const pregunta = await this.findOne(id, docenteId);

    await this.validarNoVinculadaAExamen(id);

    pregunta.activo = false;

    await this.preguntaRepository.save(pregunta);

    return {
      mensaje: 'Pregunta desactivada correctamente',
    };
  }
}
