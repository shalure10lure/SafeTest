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

  // Adjuntar una imagen (PNG, JPG o WebP) a la pregunta.
  async agregarImagen(
    preguntaId: number,
    docenteId: number,
    archivo: ArchivoSubido | undefined,
  ): Promise<RecursoPregunta> {
    await this.preguntaService.obtenerEditable(preguntaId, docenteId);
    await this.validarCupo(preguntaId);

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
      const fila = await this.recursoRepository.save(
        this.recursoRepository.create({
          pregunta_id: preguntaId,
          recurso,
          tipo: 'imagen',
          contenido: null,
          mime_type: imagen.mime,
          nombre_original: limpiarNombre(archivo.originalname),
        }),
      );

      return this.aRespuesta(fila);
    } catch (error) {
      // Compensación: no dejar un archivo sin fila que lo referencie.
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
    await this.preguntaService.obtenerEditable(preguntaId, docenteId);
    await this.validarCupo(preguntaId);

    const contenido =
      dto.tipo === 'formula'
        ? validarFormula(dto.contenido)
        : JSON.stringify(validarTabla(dto.contenido));

    const fila = await this.recursoRepository.save(
      this.recursoRepository.create({
        pregunta_id: preguntaId,
        recurso: randomUUID(),
        tipo: dto.tipo,
        contenido,
        mime_type: null,
        nombre_original: null,
      }),
    );

    return this.aRespuesta(fila);
  }

  // Quitar un recurso (y su archivo, si es una imagen).
  async eliminar(
    preguntaId: number,
    docenteId: number,
    recurso: string,
  ): Promise<void> {
    await this.preguntaService.obtenerEditable(preguntaId, docenteId);

    const fila = await this.buscar(preguntaId, recurso);

    await this.recursoRepository.delete({
      pregunta_id: preguntaId,
      recurso,
    });

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

    const fila = await this.buscar(preguntaId, recurso);

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

  private async buscar(
    preguntaId: number,
    recurso: string,
  ): Promise<PreguntaRecurso> {
    const fila = await this.recursoRepository.findOneBy({
      pregunta_id: preguntaId,
      recurso,
    });

    if (!fila) {
      throw new NotFoundException('Recurso no encontrado');
    }

    return fila;
  }

  private async validarCupo(preguntaId: number): Promise<void> {
    const actuales = await this.recursoRepository.count({
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