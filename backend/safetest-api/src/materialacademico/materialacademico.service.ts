import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository, type DeleteResult, type FindOptionsWhere } from 'typeorm';

import {
  MATERIALES_CONFIG,
  type MaterialesConfig,
} from '../config/materiales.config';
import { IaGeneracionMaterial } from '../iageneracionmaterial/entity/iageneracionmaterial.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Tema } from '../tema/entity/tema.entity';
import {
  ALMACEN_ARCHIVOS,
  type AlmacenArchivos,
} from './almacen/almacen-archivos';
import type { AutorizarMaterialDto } from './dto/autorizar-material.dto';
import type { CrearMaterialDto } from './dto/crear-material.dto';
import type { FiltrarMaterialesDto } from './dto/filtrar-materiales.dto';
import { ExtractorTextoService } from './extraccion/extractor-texto.service';
import {
  validarArchivo,
  type ArchivoValidado,
  type TipoArchivo,
} from './extraccion/formatos-archivo';
import { MaterialAcademico } from './entity/materialacademico.entity';
import { ErrorMaterial } from './materialacademico.errores';
import type { ArchivoSubido } from './materialacademico.types';

/** Vista pública de un material: nunca incluye storage_key ni el texto completo. */
export interface MaterialRespuesta {
  material_id: number;
  titulo: string;
  materia_id: number;
  materia: string | null;
  tema_id: number | null;
  tema: string | null;
  nombre_archivo: string;
  mime_type: string;
  tamano_bytes: number;
  activo: boolean;
  autorizado_ia: boolean;
  autorizado_en: Date | null;
  fecha_subida: Date;
  estado_extraccion: {
    estado: 'completado' | 'sin_texto';
    caracteres: number;
  };
}

/**
 * Gestión de materiales académicos del docente autenticado.
 *
 * Toda consulta se filtra por docente_id: el servicio nunca recibe un
 * docente_id del cliente. La autorización para IA es explícita, empieza en
 * false y solo se concede a materiales activos con texto extraído.
 */
@Injectable()
export class MaterialAcademicoService {
  private readonly logger = new Logger(MaterialAcademicoService.name);

  constructor(
    @InjectRepository(MaterialAcademico)
    private readonly materialRepository: Repository<MaterialAcademico>,

    @InjectRepository(Materia)
    private readonly materiaRepository: Repository<Materia>,

    @InjectRepository(Tema)
    private readonly temaRepository: Repository<Tema>,

    @InjectRepository(IaGeneracionMaterial)
    private readonly generacionMaterialRepository: Repository<IaGeneracionMaterial>,

    @Inject(MATERIALES_CONFIG)
    private readonly config: MaterialesConfig,

    private readonly extractor: ExtractorTextoService,

    @Inject(ALMACEN_ARCHIVOS)
    private readonly almacen: AlmacenArchivos,
  ) {}

  /**
   * Valida el archivo, extrae el texto y conserva el original.
   *
   * La extracción ocurre antes de registrar el material: si el documento está
   * dañado o no tiene texto, se rechaza la carga y no queda ningún registro.
   */
  async crear(
    docenteId: number,
    dto: CrearMaterialDto,
    archivo?: ArchivoSubido,
  ): Promise<MaterialRespuesta> {
    const materia = await this.validarMateria(docenteId, dto.materia_id);
    const tema =
      dto.tema_id !== undefined
        ? await this.validarTema(dto.tema_id, materia.materia_id)
        : null;

    if (!archivo) {
      throw new BadRequestException(
        'Adjunta el archivo del material en el campo "archivo".',
      );
    }

    const validado = this.validarArchivoSubido(archivo);
    const texto = await this.extraerTexto(
      validado.tipo,
      archivo.buffer,
      docenteId,
    );

    const clave = `materiales/${docenteId}/${randomUUID()}${validado.extension}`;
    await this.guardarArchivo(clave, archivo.buffer, validado.mime, docenteId);

    try {
      const material = this.materialRepository.create({
        docente_id: docenteId,
        materia_id: materia.materia_id,
        tema_id: tema?.tema_id ?? null,
        titulo: dto.titulo,
        nombre_archivo: validado.nombreArchivo,
        mime_type: validado.mime,
        tamano_bytes: String(archivo.buffer.length),
        storage_key: clave,
        texto_extraido: texto,
        activo: true,
        autorizado_ia: false,
        autorizado_en: null,
      });

      const guardado = await this.materialRepository.save(material);

      // Solo metadatos: nunca el contenido ni la ruta interna.
      this.logger.log(
        `Material ${guardado.material_id} registrado con ${texto.length} caracteres extraídos.`,
      );

      return this.respuesta(guardado, materia, tema);
    } catch (error) {
      await this.almacen.eliminar(clave).catch(() => {
        this.logger.warn(
          'No se pudo revertir el archivo guardado tras fallar el registro.',
        );
      });

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        'No se pudo registrar el material en la base de datos.',
      );

      throw new InternalServerErrorException(
        'No se pudo registrar el material.',
      );
    }
  }

  /** Lista solo los materiales del docente autenticado. */
  async listar(
    docenteId: number,
    filtros: FiltrarMaterialesDto = {},
  ): Promise<MaterialRespuesta[]> {
    const where: FindOptionsWhere<MaterialAcademico> = {
      docente_id: docenteId,
    };

    if (filtros.materia_id !== undefined) {
      where.materia_id = filtros.materia_id;
    }

    if (filtros.activo !== undefined) {
      where.activo = filtros.activo;
    }

    const materiales = await this.materialRepository.find({
      where,
      relations: { materia: true, tema: true },
      order: { fecha_subida: 'DESC', material_id: 'DESC' },
    });

    return materiales.map((material) => this.respuesta(material));
  }

  /** Detalle de un material propio; 404 si no existe o es de otro docente. */
  async obtener(
    docenteId: number,
    materialId: number,
  ): Promise<MaterialRespuesta> {
    const material = await this.obtenerPropio(docenteId, materialId);

    return this.respuesta(material);
  }

  /** Estado del texto extraído y si el material puede usarse en IA. */
  async estadoExtraccion(docenteId: number, materialId: number) {
    const material = await this.obtenerPropio(docenteId, materialId);
    const caracteres = material.texto_extraido?.trim().length ?? 0;

    return {
      material_id: material.material_id,
      estado: caracteres > 0 ? 'completado' : 'sin_texto',
      caracteres,
      activo: material.activo,
      autorizado_ia: material.autorizado_ia,
      disponible_para_ia:
        material.activo && material.autorizado_ia && caracteres > 0,
    };
  }

  /**
   * Activa o revoca la autorización para IA. Es una acción explícita: un
   * material activo no queda autorizado por sí solo.
   */
  async autorizar(
    docenteId: number,
    materialId: number,
    dto: AutorizarMaterialDto,
  ): Promise<MaterialRespuesta> {
    const material = await this.obtenerPropio(docenteId, materialId);

    if (dto.autorizado) {
      if (!material.activo) {
        throw new ConflictException(
          'El material está inactivo y no puede autorizarse para IA.',
        );
      }

      if (!material.texto_extraido?.trim()) {
        throw new ConflictException(
          'El material no tiene texto extraído, así que no puede usarse en IA.',
        );
      }
    }

    const autorizadoEn = dto.autorizado ? new Date() : null;

    const resultado = await this.materialRepository.update(
      { material_id: material.material_id, docente_id: docenteId },
      { autorizado_ia: dto.autorizado, autorizado_en: autorizadoEn },
    );

    if (!resultado.affected) {
      throw new NotFoundException('Material no encontrado');
    }

    this.logger.log(
      `Material ${material.material_id} ${dto.autorizado ? 'autorizado' : 'revocado'} para IA.`,
    );

    return this.respuesta({
      ...material,
      autorizado_ia: dto.autorizado,
      autorizado_en: autorizadoEn,
    });
  }

  /**
   * Elimina el material solo si nunca se usó en una generación. Cuando forma
   * parte del historial de IA se conserva para no romper la auditoría y se
   * pide revocar la autorización en su lugar.
   */
  async eliminar(docenteId: number, materialId: number): Promise<void> {
    const material = await this.obtenerPropio(docenteId, materialId);

    const usos = await this.generacionMaterialRepository.count({
      where: { material_id: material.material_id },
    });

    if (usos > 0) {
      throw new ConflictException(
        'El material ya se usó en una generación de IA y no puede eliminarse. Revoca su autorización para IA.',
      );
    }

    const resultado: DeleteResult = await this.materialRepository.delete({
      material_id: material.material_id,
      docente_id: docenteId,
    });

    if (!resultado.affected) {
      throw new NotFoundException('Material no encontrado');
    }

    await this.almacen.eliminar(material.storage_key).catch(() => {
      this.logger.warn(
        `No se pudo eliminar el archivo del material ${material.material_id}.`,
      );
    });

    this.logger.log(`Material ${material.material_id} eliminado.`);
  }

  private async obtenerPropio(
    docenteId: number,
    materialId: number,
  ): Promise<MaterialAcademico> {
    const material = await this.materialRepository.findOne({
      where: { material_id: materialId, docente_id: docenteId },
      relations: { materia: true, tema: true },
    });

    if (!material) {
      throw new NotFoundException('Material no encontrado');
    }

    return material;
  }

  private async validarMateria(
    docenteId: number,
    materiaId: number,
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

  private validarArchivoSubido(archivo: ArchivoSubido): ArchivoValidado {
    try {
      return validarArchivo({
        nombreOriginal: archivo.originalname,
        mimeDeclarado: archivo.mimetype,
        contenido: archivo.buffer,
        maxBytes: this.config.maxBytes,
      });
    } catch (error) {
      throw this.comoExcepcionHttp(error);
    }
  }

  private async extraerTexto(
    tipo: TipoArchivo,
    contenido: Buffer,
    docenteId: number,
  ): Promise<string> {
    try {
      return await this.extractor.extraer(tipo, contenido);
    } catch (error) {
      if (error instanceof ErrorMaterial) {
        if (
          error.motivo === 'extraccion_fallida' ||
          error.motivo === 'sin_texto'
        ) {
          this.logger.warn(
            `Material del docente ${docenteId} rechazado por ${error.motivo}.`,
          );
        }

        throw this.comoExcepcionHttp(error);
      }

      this.logger.error('Fallo inesperado durante la extracción de texto.');

      throw new UnprocessableEntityException(
        'No se pudo extraer el texto del archivo.',
      );
    }
  }

  private async guardarArchivo(
    clave: string,
    contenido: Buffer,
    mimeType: string,
    docenteId: number,
  ): Promise<void> {
    try {
      await this.almacen.guardar(clave, contenido, mimeType);
    } catch {
      this.logger.error(
        `No se pudo almacenar el archivo del material del docente ${docenteId}.`,
      );

      throw new ServiceUnavailableException(
        'El almacenamiento de archivos no está disponible. Intenta de nuevo más tarde.',
      );
    }
  }

  private comoExcepcionHttp(error: unknown): HttpException {
    if (!(error instanceof ErrorMaterial)) {
      return new BadRequestException('El archivo no es válido.');
    }

    if (error.motivo === 'archivo_demasiado_grande') {
      return new PayloadTooLargeException(error.message);
    }

    if (error.motivo === 'sin_texto' || error.motivo === 'extraccion_fallida') {
      return new UnprocessableEntityException(error.message);
    }

    return new BadRequestException(error.message);
  }

  private respuesta(
    material: MaterialAcademico,
    materia?: Materia | null,
    tema?: Tema | null,
  ): MaterialRespuesta {
    const texto = material.texto_extraido?.trim() ?? '';

    return {
      material_id: material.material_id,
      titulo: material.titulo,
      materia_id: material.materia_id,
      materia: materia?.nombre ?? material.materia?.nombre ?? null,
      tema_id: material.tema_id,
      tema: tema?.nombre_tema ?? material.tema?.nombre_tema ?? null,
      nombre_archivo: material.nombre_archivo,
      mime_type: material.mime_type,
      tamano_bytes: Number(material.tamano_bytes),
      activo: material.activo,
      autorizado_ia: material.autorizado_ia,
      autorizado_en: material.autorizado_en,
      fecha_subida: material.fecha_subida,
      estado_extraccion: {
        estado: texto ? 'completado' : 'sin_texto',
        caracteres: texto.length,
      },
    };
  }
}
