import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import {
  MATERIALES_CONFIG,
  type MaterialesConfig,
} from '../../config/materiales.config';
import { ErrorAlmacenArchivos, type AlmacenArchivos } from './almacen-archivos';

/**
 * Formato de las claves que genera el servicio: docente, UUID y extensión.
 * Solo se aceptan claves con esta forma para descartar path traversal.
 */
const PATRON_CLAVE = /^materiales\/\d+\/[A-Za-z0-9._-]+$/;

/**
 * Almacenamiento local de archivos originales.
 *
 * El directorio queda fuera de `src`, `dist` y de cualquier carpeta servida
 * por HTTP. Los nombres enviados por el docente nunca se usan como ruta: la
 * clave la genera el servidor con un UUID.
 */
@Injectable()
export class AlmacenArchivosLocal implements AlmacenArchivos, OnModuleInit {
  private readonly logger = new Logger(AlmacenArchivosLocal.name);
  private readonly base: string;

  constructor(@Inject(MATERIALES_CONFIG) config: MaterialesConfig) {
    this.base = resolve(config.directorioAlmacen);
  }

  async onModuleInit(): Promise<void> {
    try {
      await mkdir(this.base, { recursive: true });
    } catch {
      // No se impide el arranque: la API responde 503 al intentar guardar.
      this.logger.error(
        'No se pudo preparar el directorio de almacenamiento de materiales.',
      );
    }
  }

  async guardar(
    clave: string,
    contenido: Buffer,
    _mimeType: string,
  ): Promise<void> {
    const ruta = this.resolverRuta(clave);

    try {
      await mkdir(dirname(ruta), { recursive: true });
      await writeFile(ruta, contenido, { mode: 0o600, flag: 'wx' });
    } catch (error) {
      this.logger.error(
        `No se pudo guardar un archivo de material (${nombreError(error)}).`,
      );

      throw new ErrorAlmacenArchivos('No se pudo guardar el archivo.');
    }
  }

  async eliminar(clave: string): Promise<void> {
    const ruta = this.resolverRuta(clave);

    try {
      await unlink(ruta);
    } catch (error) {
      if (esArchivoInexistente(error)) {
        return;
      }

      this.logger.error(
        `No se pudo eliminar un archivo de material (${nombreError(error)}).`,
      );

      throw new ErrorAlmacenArchivos('No se pudo eliminar el archivo.');
    }
  }

  /** Resuelve la ruta absoluta y comprueba que no salga del directorio base. */
  private resolverRuta(clave: string): string {
    if (!PATRON_CLAVE.test(clave)) {
      throw new ErrorAlmacenArchivos('Clave de almacenamiento inválida.');
    }

    const ruta = resolve(this.base, clave);

    if (!ruta.startsWith(`${this.base}${sep}`)) {
      throw new ErrorAlmacenArchivos('Clave de almacenamiento inválida.');
    }

    return ruta;
  }
}

function esArchivoInexistente(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT';
}

function nombreError(error: unknown): string {
  return (error as NodeJS.ErrnoException)?.code ?? 'desconocido';
}
