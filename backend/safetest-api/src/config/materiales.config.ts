/** Token de inyección para la configuración del módulo de materiales. */
export const MATERIALES_CONFIG = Symbol('MATERIALES_CONFIG');

/** Configuración de la gestión de materiales académicos. */
export interface MaterialesConfig {
  /** Tamaño máximo permitido por archivo, en bytes. */
  maxBytes: number;
  /** Directorio raíz donde se conservan los archivos originales. */
  directorioAlmacen: string;
}

export class ErrorConfiguracionMateriales extends Error {
  constructor(mensajes: string[]) {
    super(`Configuración de materiales inválida: ${mensajes.join(' ')}`);
    this.name = 'ErrorConfiguracionMateriales';
  }
}

type Entorno = Record<string, string | undefined>;

const DEFAULTS = {
  /** 10 MiB: suficiente para apuntes y diapositivas sin saturar memoria. */
  maxBytes: 10 * 1024 * 1024,
  directorioAlmacen: 'storage/materiales',
};

/**
 * Lee la configuración del módulo desde el entorno.
 *
 * El almacenamiento local vive fuera de cualquier carpeta servida por HTTP y
 * está detrás de `AlmacenArchivos`, así que puede sustituirse por MinIO u otro
 * proveedor más adelante sin tocar el servicio de materiales.
 */
export function cargarConfiguracionMateriales(
  env: Entorno = process.env,
): MaterialesConfig {
  const errores: string[] = [];

  const maxBytes = leerEnteroPositivo(
    env.MATERIAL_MAX_BYTES,
    'MATERIAL_MAX_BYTES',
    DEFAULTS.maxBytes,
    errores,
  );
  const directorioAlmacen = leerDirectorio(
    env.MATERIAL_STORAGE_DIR,
    DEFAULTS.directorioAlmacen,
    errores,
  );

  if (errores.length > 0) {
    throw new ErrorConfiguracionMateriales(errores);
  }

  return { maxBytes, directorioAlmacen };
}

function leerEnteroPositivo(
  valor: string | undefined,
  nombre: string,
  porDefecto: number,
  errores: string[],
): number {
  const texto = valor?.trim();

  if (!texto) {
    return porDefecto;
  }

  const numero = Number(texto);

  if (!Number.isInteger(numero) || numero <= 0) {
    errores.push(
      `${nombre} debe ser un entero mayor que 0 (recibido: "${texto}").`,
    );

    return porDefecto;
  }

  return numero;
}

function leerDirectorio(
  valor: string | undefined,
  porDefecto: string,
  errores: string[],
): string {
  const texto = valor?.trim();

  if (!texto) {
    return porDefecto;
  }

  if (texto.includes('\u0000')) {
    errores.push('MATERIAL_STORAGE_DIR contiene caracteres inválidos.');

    return porDefecto;
  }

  return texto;
}
