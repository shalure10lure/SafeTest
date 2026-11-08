import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import { RECURSOS_CONFIG, type RecursosConfig } from './recursos.config';
import type { ExtensionImagen } from './validar-recursos';

/**
 * Formato de las claves que genera el servidor: docente, UUID y extensión.
 * El nombre debe empezar por letra o número para descartar "." y "..".
 */
const PATRON_CLAVE = /^preguntas\/\d+\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Error del almacén, sin detalles de rutas internas. */
export class ErrorAlmacenImagenes extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorAlmacenImagenes';
  }
}

/** Genera la clave de una imagen nueva; el nombre enviado por el cliente nunca se usa. */
export function claveParaImagen(
  docenteId: number,
  extension: ExtensionImagen,
): string {
  return `preguntas/${docenteId}/${randomUUID()}.${extension}`;
}

/**
 * Almacén local de las imágenes de las preguntas.
 *
 * El directorio queda fuera de `src`, `dist` y de cualquier carpeta servida por
 * HTTP: las imágenes solo salen por un endpoint autenticado.
 */
@Injectable()
export class AlmacenImagenesPregunta implements OnModuleInit {
  private readonly logger = new Logger(AlmacenImagenesPregunta.name);
  private readonly base: string;

  constructor(@Inject(RECURSOS_CONFIG) config: RecursosConfig) {
    this.base = resolve(config.directorioAlmacen);
  }

  async onModuleInit(): Promise<void> {
    try {
      await mkdir(this.base, { recursive: true });
    } catch {
      // No se impide el arranque: guardar fallará con un error controlado.
      this.logger.error(
        'No se pudo preparar el directorio de imágenes de preguntas.',
      );
    }
  }

  async guardar(clave: string, contenido: Buffer): Promise<void> {
    const ruta = this.resolverRuta(clave);

    try {
      await mkdir(dirname(ruta), { recursive: true });
      await writeFile(ruta, contenido, { mode: 0o600, flag: 'wx' });
    } catch (error) {
      this.logger.error(
        `No se pudo guardar una imagen de pregunta (${codigoError(error)}).`,
      );

      throw new ErrorAlmacenImagenes('No se pudo guardar la imagen.');
    }
  }

  async leer(clave: string): Promise<Buffer> {
    const ruta = this.resolverRuta(clave);

    try {
      return await readFile(ruta);
    } catch (error) {
      if (codigoError(error) === 'ENOENT') {
        throw new ErrorAlmacenImagenes('La imagen no existe.');
      }

      this.logger.error(
        `No se pudo leer una imagen de pregunta (${codigoError(error)}).`,
      );

      throw new ErrorAlmacenImagenes('No se pudo leer la imagen.');
    }
  }

  /** Borra la imagen; si ya no existe, la operación es exitosa. */
  async eliminar(clave: string): Promise<void> {
    const ruta = this.resolverRuta(clave);

    try {
      await unlink(ruta);
    } catch (error) {
      if (codigoError(error) === 'ENOENT') {
        return;
      }

      this.logger.error(
        `No se pudo eliminar una imagen de pregunta (${codigoError(error)}).`,
      );

      throw new ErrorAlmacenImagenes('No se pudo eliminar la imagen.');
    }
  }

  /** Resuelve la ruta absoluta y comprueba que no salga del directorio base. */
  private resolverRuta(clave: string): string {
    if (!PATRON_CLAVE.test(clave)) {
      throw new ErrorAlmacenImagenes('Clave de almacenamiento inválida.');
    }

    const ruta = resolve(this.base, clave);

    if (!ruta.startsWith(`${this.base}${sep}`)) {
      throw new ErrorAlmacenImagenes('Clave de almacenamiento inválida.');
    }

    return ruta;
  }
}

function codigoError(error: unknown): string {
  return (error as NodeJS.ErrnoException)?.code ?? 'desconocido';
}