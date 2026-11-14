import {
  ConflictException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { Repository } from 'typeorm';

import { PreguntaRecurso } from '../../preguntarecurso/entity/preguntarecurso.entity';
import { PreguntaService } from '../pregunta.service';
import { AlmacenImagenesPregunta } from './almacen-imagenes-pregunta';
import type { CrearRecursoDto } from './dto/crear-recurso.dto';
import { RECURSOS_CONFIG, type RecursosConfig } from './recursos.config';
import type { ArchivoSubido, RecursoPregunta } from './recursos.types';
import {
  validarFormula,
  validarImagen,
  validarTabla,
  type ContenidoTabla,
} from './validar-recursos';

/** Tope de contenido especializado por pregunta. */
export const MAX_RECURSOS_POR_PREGUNTA = 10;

/** El nombre original solo es informativo: nunca se usa para construir rutas. */
function limpiarNombre(nombre: string | undefined): string | null {
  const base = (nombre ?? '').split(/[\\/]/).pop() ?? '';
  const limpio = Array.from(base)
    .filter((caracter) => {
      const codigo = caracter.charCodeAt(0);

      return codigo >= 32 && codigo !== 127;
    })
    .join('')
    .trim()
    .slice(0, 255);

  return limpio || null;
}

@Injectable()
export class PreguntaRecursosService {
  private readonly logger = new Logger(PreguntaRecursosService.name);

  constructor(
    @InjectRepository(PreguntaRecurso)
    private readonly recursoRepository: Repository<PreguntaRecurso>,

    private readonly preguntaService: PreguntaService,
    private readonly almacen: AlmacenImagenesPregunta,

    @Inject(RECURSOS_CONFIG) private readonly config: RecursosConfig,
  ) {}

  // Listar los recursos de una pregunta del docente.
  async listar(
    preguntaId: number,
    docenteId: number,
  ): Promise<RecursoPregunta[]> {
    await this.preguntaService.findOne(preguntaId, docenteId);

    const filas = await this.recursoRepository.find({
      where: { pregunta_id: preguntaId },
      order: { creado_en: 'ASC', recurso: 'ASC' },
    });

    return filas.map((fila) => this.aRespuesta(fila));
  }

  /**
   * Recursos de una pregunta para el estudiante que la está rindiendo.
   * No comprueba propiedad: quien llama debe haber validado antes que la
   * pregunta pertenece a la rendición en curso del estudiante.
   */
  async listarParaRendicion(preguntaId: number): Promise<RecursoPregunta[]> {
    const filas = await this.recursoRepository.find({
      where: { pregunta_id: preguntaId },
      order: { creado_en: 'ASC', recurso: 'ASC' },
    });

    return filas.map((fila) => this.aRespuesta(fila));
  }

  /** Bytes de una imagen para el estudiante; misma precondición que arriba. */
  async obtenerImagenParaRendicion(
    preguntaId: number,
    recurso: string,
  ): Promise<{ contenido: Buffer; mime: string }> {
    const fila = await this.buscar(
      this.recursoRepository,
      preguntaId,
      recurso,
    );

    if (fila.tipo !== 'imagen' || !fila.mime_type) {
      throw new NotFoundException('Recurso no encontrado');
    }

    // Las imágenes se guardan bajo la carpeta del docente dueño de la pregunta.
    const duenos = await this.recursoRepository.manager.query<
      { docente_id: number }[]
    >(
      `SELECT m.docente_id
         FROM pregunta p
         JOIN tema t ON t.tema_id = p.tema_id
         JOIN materia m ON m.materia_id = t.materia_id
        WHERE p.pregunta_id = $1`,
      [preguntaId],
    );

    if (duenos.length === 0) {
      throw new NotFoundException('La imagen no está disponible');
    }

    try {
      const contenido = await this.almacen.leer(
        this.claveDe(duenos[0].docente_id, recurso),
      );

      return { contenido, mime: fila.mime_type };
    } catch {
      throw new NotFoundException('La imagen no está disponible');
    }
  }

  // Adjuntar una imagen (PNG, JPG o WebP) a la pregunta.
  async agregarImagen(
    preguntaId: number,
    docenteId: number,
    archivo: ArchivoSubido | undefined,
  ): Promise<RecursoPregunta> {
    // Comprobación previa sin escrituras: una pregunta congelada no debe
    // llegar a guardar un archivo en el almacén.
    await this.preguntaService.ejecutarEdicion(
      preguntaId,
      docenteId,
      async () => undefined,
    );

    if (!archivo) {
      throw new BadRequestException('Adjunta una imagen en el campo "archivo"');
    }

    const imagen = validarImagen(archivo.buffer, this.config.maxBytesImagen);
    const recurso = `${randomUUID()}.${imagen.extension}`;
    const clave = this.claveDe(docenteId, recurso);

    try {
      await this.almacen.guardar(clave, archivo.buffer);
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo guardar la imagen. Inténtalo de nuevo.',
      );
    }

    try {
      return await this.preguntaService.ejecutarEdicion(
        preguntaId,
        docenteId,
        async (manager) => {
          const repositorio = this.repositorioDe(manager);

          await this.validarCupo(repositorio, preguntaId);

          const fila = await repositorio.save(
            repositorio.create({
              pregunta_id: preguntaId,
              recurso,
              tipo: 'imagen',
              contenido: null,
              mime_type: imagen.mime,
              nombre_original: limpiarNombre(archivo.originalname),
            }),
          );

          return this.aRespuesta(fila);
        },
      );
    } catch (error) {
      // Compensación: no dejar un archivo sin fila que lo referencie, ya sea
      // porque la pregunta se congeló tras la comprobación previa o porque
      // falló la escritura.
      await this.almacen.eliminar(clave).catch(() => undefined);

      throw error;
    }
  }

  // Agregar una tabla o una fórmula a la pregunta.
  async agregarContenido(
    preguntaId: number,
    docenteId: number,
    dto: CrearRecursoDto,
  ): Promise<RecursoPregunta> {
    return this.preguntaService.ejecutarEdicion(
      preguntaId,
      docenteId,
      async (manager) => {
        const repositorio = this.repositorioDe(manager);
        const contenido =
          dto.tipo === 'formula'
            ? validarFormula(dto.contenido)
            : JSON.stringify(validarTabla(dto.contenido));

        await this.validarCupo(repositorio, preguntaId);

        const fila = await repositorio.save(
          repositorio.create({
            pregunta_id: preguntaId,
            recurso: randomUUID(),
            tipo: dto.tipo,
            contenido,
            mime_type: null,
            nombre_original: null,
          }),
        );

        return this.aRespuesta(fila);
      },
    );
  }

  // Cambiar el contenido de una fórmula o tabla ya guardada (mismo recurso).
  async actualizarContenido(
    preguntaId: number,
    docenteId: number,
    recurso: string,
    dto: CrearRecursoDto,
  ): Promise<RecursoPregunta> {
    return this.preguntaService.ejecutarEdicion(
      preguntaId,
      docenteId,
      async (manager) => {
        const repositorio = this.repositorioDe(manager);
        const fila = await this.buscar(repositorio, preguntaId, recurso);

        if (fila.tipo === 'imagen') {
          throw new BadRequestException(
            'Las imágenes no se editan: reemplázala por otra imagen',
          );
        }

        if (dto.tipo !== fila.tipo) {
          throw new BadRequestException(
            'No se puede cambiar el tipo de un recurso. Elimínalo y crea uno nuevo',
          );
        }

        fila.contenido =
          fila.tipo === 'formula'
            ? validarFormula(dto.contenido)
            : JSON.stringify(validarTabla(dto.contenido));

        return this.aRespuesta(await repositorio.save(fila));
      },
    );
  }

  // Sustituir la imagen de un recurso por otra, conservando su posición.
  async reemplazarImagen(
    preguntaId: number,
    docenteId: number,
    recurso: string,
    archivo: ArchivoSubido | undefined,
  ): Promise<RecursoPregunta> {
    // Comprobación previa con bloqueo: evita guardar el archivo nuevo si la
    // pregunta ya está congelada o el recurso no es una imagen.
    await this.preguntaService.ejecutarEdicion(
      preguntaId,
      docenteId,
      async (manager) => {
        const fila = await this.buscar(
          this.repositorioDe(manager),
          preguntaId,
          recurso,
        );

        if (fila.tipo !== 'imagen') {
          throw new BadRequestException('Este recurso no es una imagen');
        }
      },
    );

    if (!archivo) {
      throw new BadRequestException('Adjunta una imagen en el campo "archivo"');
    }

    const archivoNuevo = archivo;
    const imagen = validarImagen(
      archivoNuevo.buffer,
      this.config.maxBytesImagen,
    );
    // Nombre nuevo: así el navegador no muestra la imagen anterior desde su caché.
    const nuevoRecurso = `${randomUUID()}.${imagen.extension}`;
    const claveNueva = this.claveDe(docenteId, nuevoRecurso);

    try {
      await this.almacen.guardar(claveNueva, archivoNuevo.buffer);
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo guardar la imagen. Inténtalo de nuevo.',
      );
    }

    let actualizada: RecursoPregunta;

    try {
      actualizada = await this.preguntaService.ejecutarEdicion(
        preguntaId,
        docenteId,
        async (manager) => {
          const repositorio = this.repositorioDe(manager);
          const fila = await this.buscar(repositorio, preguntaId, recurso);

          if (fila.tipo !== 'imagen') {
            throw new BadRequestException('Este recurso no es una imagen');
          }

          await repositorio.update(
            { pregunta_id: preguntaId, recurso },
            {
              recurso: nuevoRecurso,
              mime_type: imagen.mime,
              nombre_original: limpiarNombre(archivoNuevo.originalname),
            },
          );

          return this.aRespuesta(
            await this.buscar(repositorio, preguntaId, nuevoRecurso),
          );
        },
      );
    } catch (error) {
      // Compensación: el archivo nuevo no debe quedar huérfano si la
      // comprobación o la escritura fallan.
      await this.almacen.eliminar(claveNueva).catch(() => undefined);

      throw error;
    }

    try {
      await this.almacen.eliminar(this.claveDe(docenteId, recurso));
    } catch {
      this.logger.warn(
        'Se reemplazó la imagen pero no se pudo borrar el archivo anterior.',
      );
    }

    return actualizada;
  }

  // Quitar un recurso (y su archivo, si es una imagen).
  async eliminar(
    preguntaId: number,
    docenteId: number,
    recurso: string,
  ): Promise<void> {
    const fila = await this.preguntaService.ejecutarEdicion(
      preguntaId,
      docenteId,
      async (manager) => {
        const repositorio = this.repositorioDe(manager);
        const existente = await this.buscar(
          repositorio,
          preguntaId,
          recurso,
        );

        await repositorio.delete({
          pregunta_id: preguntaId,
          recurso,
        });

        return existente;
      },
    );

    if (fila.tipo === 'imagen') {
      try {
        await this.almacen.eliminar(this.claveDe(docenteId, recurso));
      } catch {
        this.logger.warn(
          'Se eliminó el recurso pero no se pudo borrar el archivo de imagen.',
        );
      }
    }
  }

  // Leer los bytes de una imagen para mostrarla al docente.
  async obtenerImagen(
    preguntaId: number,
    docenteId: number,
    recurso: string,
  ): Promise<{ contenido: Buffer; mime: string }> {
    await this.preguntaService.findOne(preguntaId, docenteId);

    const fila = await this.buscar(this.recursoRepository, preguntaId, recurso);

    if (fila.tipo !== 'imagen' || !fila.mime_type) {
      throw new NotFoundException('Recurso no encontrado');
    }

    try {
      const contenido = await this.almacen.leer(
        this.claveDe(docenteId, recurso),
      );

      return { contenido, mime: fila.mime_type };
    } catch {
      throw new NotFoundException('La imagen no está disponible');
    }
  }

  private claveDe(docenteId: number, recurso: string): string {
    return `preguntas/${docenteId}/${recurso}`;
  }

  /** Repositorio ligado a la transacción que bloquea la pregunta. */
  private repositorioDe(
    manager: EntityManager,
  ): Repository<PreguntaRecurso> {
    return manager.getRepository(PreguntaRecurso);
  }

  private async buscar(
    repositorio: Repository<PreguntaRecurso>,
    preguntaId: number,
    recurso: string,
  ): Promise<PreguntaRecurso> {
    const fila = await repositorio.findOneBy({
      pregunta_id: preguntaId,
      recurso,
    });

    if (!fila) {
      throw new NotFoundException('Recurso no encontrado');
    }

    return fila;
  }

  private async validarCupo(
    repositorio: Repository<PreguntaRecurso>,
    preguntaId: number,
  ): Promise<void> {
    const actuales = await repositorio.count({
      where: { pregunta_id: preguntaId },
    });

    if (actuales >= MAX_RECURSOS_POR_PREGUNTA) {
      throw new ConflictException(
        `Una pregunta admite hasta ${MAX_RECURSOS_POR_PREGUNTA} recursos`,
      );
    }
  }

  private aRespuesta(fila: PreguntaRecurso): RecursoPregunta {
    return {
      recurso: fila.recurso,
      tipo: fila.tipo,
      contenido: this.contenidoDe(fila),
      mime_type: fila.mime_type,
      nombre_original: fila.nombre_original,
      creado_en: fila.creado_en,
    };
  }

  private contenidoDe(fila: PreguntaRecurso): ContenidoTabla | string | null {
    if (fila.tipo === 'formula') {
      return fila.contenido;
    }

    if (fila.tipo === 'tabla' && fila.contenido) {
      try {
        return JSON.parse(fila.contenido) as ContenidoTabla;
      } catch {
        this.logger.warn('Se encontró una tabla con contenido ilegible.');

        return null;
      }
    }

    return null;
  }
}
