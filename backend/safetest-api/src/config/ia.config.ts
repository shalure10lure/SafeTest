export type ProveedorIa = 'fake' | 'gemini';

/** Token de inyección para la configuración del módulo de IA. */
export const IA_CONFIG = Symbol('IA_CONFIG');

export const MAX_MATERIALES_IA = 3;

/** Configuración del módulo de IA, validada al arrancar la aplicación. */
export interface IaConfig {
  proveedor: ProveedorIa;
  apiKey: string | null;
  modelo: string | null;
  timeoutMs: number;
  maxOutputTokens: number;
  maxMateriales: number;
  maxCaracteresTotales: number;
  maxConcurrentes: number;
  /** Cada cuánto revisa el worker si hay generaciones pendientes. */
  intervaloWorkerMs: number;
}

export class ErrorConfiguracionIa extends Error {
  constructor(mensajes: string[]) {
    super(`Configuración de IA inválida: ${mensajes.join(' ')}`);
    this.name = 'ErrorConfiguracionIa';
  }
}

type EntornoIa = Record<string, string | undefined>;

const DEFAULTS = {
  proveedor: 'gemini' as ProveedorIa,
  timeoutMs: 120_000,
  maxOutputTokens: 8_192,
  maxMateriales: MAX_MATERIALES_IA,
  maxCaracteresTotales: 60_000,
  maxConcurrentes: 2,
  intervaloWorkerMs: 2_000,
};

/**
 * Lee y valida las variables de entorno del módulo de IA.
 *
 * El proveedor debe seleccionarse explícitamente. Gemini exige
 * GEMINI_API_KEY y GEMINI_MODEL.
 */
export function cargarConfiguracionIa(
  env: EntornoIa = process.env,
): IaConfig {
  const errores: string[] = [];

  const proveedor = leerProveedor(env, errores);
  const apiKey = leerTexto(env.GEMINI_API_KEY);
  const modelo = leerTexto(env.GEMINI_MODEL);

  const timeoutMs = leerEnteroPositivo(
    env,
    'GEMINI_TIMEOUT_MS',
    DEFAULTS.timeoutMs,
    errores,
  );
  const maxOutputTokens = leerEnteroPositivo(
    env,
    'GEMINI_MAX_OUTPUT_TOKENS',
    DEFAULTS.maxOutputTokens,
    errores,
  );
  const maxMateriales = leerEnteroPositivo(
    env,
    'IA_MAX_MATERIALES',
    DEFAULTS.maxMateriales,
    errores,
  );
  if (maxMateriales > MAX_MATERIALES_IA) {
    errores.push(
      `IA_MAX_MATERIALES no puede superar ${MAX_MATERIALES_IA}.`,
    );
  }
  const maxCaracteresTotales = leerEnteroPositivo(
    env,
    'IA_MAX_CARACTERES_TOTALES',
    DEFAULTS.maxCaracteresTotales,
    errores,
  );
  const maxConcurrentes = leerEnteroPositivo(
    env,
    'IA_MAX_CONCURRENTES',
    DEFAULTS.maxConcurrentes,
    errores,
  );
  const intervaloWorkerMs = leerEnteroPositivo(
    env,
    'IA_WORKER_INTERVALO_MS',
    DEFAULTS.intervaloWorkerMs,
    errores,
  );

  if (proveedor === 'gemini') {
    if (!apiKey) {
      errores.push(
        'GEMINI_API_KEY es obligatoria cuando IA_PROVIDER=gemini.',
      );
    }

    if (!modelo) {
      errores.push(
        'GEMINI_MODEL es obligatorio cuando IA_PROVIDER=gemini.',
      );
    }
  }

  if (errores.length > 0) {
    throw new ErrorConfiguracionIa(errores);
  }

  return {
    proveedor,
    apiKey,
    modelo,
    timeoutMs,
    maxOutputTokens,
    maxMateriales,
    maxCaracteresTotales,
    maxConcurrentes,
    intervaloWorkerMs,
  };
}

function leerProveedor(
  env: EntornoIa,
  errores: string[],
): ProveedorIa {
  const valor = leerTexto(env.IA_PROVIDER)?.toLowerCase();

  if (!valor) {
    errores.push('IA_PROVIDER es obligatoria y debe ser "gemini" o "fake".');
    return DEFAULTS.proveedor;
  }

  if (valor === 'fake' || valor === 'gemini') {
    return valor;
  }

  errores.push(
    `IA_PROVIDER debe ser "fake" o "gemini" (recibido: "${env.IA_PROVIDER}").`,
  );

  return DEFAULTS.proveedor;
}

function leerEnteroPositivo(
  env: EntornoIa,
  nombre: string,
  porDefecto: number,
  errores: string[],
): number {
  const valor = leerTexto(env[nombre]);

  if (!valor) {
    return porDefecto;
  }

  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero <= 0) {
    errores.push(
      `${nombre} debe ser un entero mayor que 0 (recibido: "${valor}").`,
    );

    return porDefecto;
  }

  return numero;
}

function leerTexto(valor: string | undefined): string | null {
  const texto = valor?.trim();

  return texto ? texto : null;
}
