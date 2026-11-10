/** Token de inyección para la configuración de recursos de pregunta. */
export const RECURSOS_CONFIG = Symbol('RECURSOS_CONFIG');

/** Configuración de las imágenes que acompañan a las preguntas. */
export interface RecursosConfig {
  /** Tamaño máximo por imagen, en bytes. */
  maxBytesImagen: number;
  /** Directorio raíz donde se conservan las imágenes. */
  directorioAlmacen: string;
}

type Entorno = Record<string, string | undefined>;

const DEFAULTS: RecursosConfig = {
  /** 5 MiB: sobra para esquemas, gráficas y fotos de ejercicios. */
  maxBytesImagen: 5 * 1024 * 1024,
  directorioAlmacen: 'storage/preguntas',
};

export class ErrorConfiguracionRecursos extends Error {
  constructor(mensajes: string[]) {
    super(`Configuración de recursos de pregunta inválida: ${mensajes.join(' ')}`);
    this.name = 'ErrorConfiguracionRecursos';
  }
}

/** Lee la configuración desde el entorno; sin variables usa los valores por defecto. */
export function cargarConfiguracionRecursos(
  env: Entorno = process.env,
): RecursosConfig {
  const errores: string[] = [];
  let maxBytesImagen = DEFAULTS.maxBytesImagen;
  let directorioAlmacen = DEFAULTS.directorioAlmacen;

  const textoMax = env.PREGUNTA_IMAGEN_MAX_BYTES?.trim();

  if (textoMax) {
    const numero = Number(textoMax);

    if (Number.isInteger(numero) && numero > 0) {
      maxBytesImagen = numero;
    } else {
      errores.push(
        `PREGUNTA_IMAGEN_MAX_BYTES debe ser un entero mayor que 0 (recibido: "${textoMax}").`,
      );
    }
  }

  const textoDir = env.PREGUNTA_RECURSOS_DIR?.trim();

  if (textoDir) {
    if (textoDir.includes('\u0000')) {
      errores.push('PREGUNTA_RECURSOS_DIR contiene caracteres inválidos.');
    } else {
      directorioAlmacen = textoDir;
    }
  }

  if (errores.length > 0) {
    throw new ErrorConfiguracionRecursos(errores);
  }

  return { maxBytesImagen, directorioAlmacen };
}