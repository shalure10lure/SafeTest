import { BadRequestException } from '@nestjs/common';

export type MimeImagen = 'image/png' | 'image/jpeg' | 'image/webp';
export type ExtensionImagen = 'png' | 'jpg' | 'webp';

export interface ImagenDetectada {
  mime: MimeImagen;
  extension: ExtensionImagen;
}

export const MAX_CARACTERES_FORMULA = 500;

export const LIMITES_TABLA = {
  maxFilas: 20,
  maxColumnas: 10,
  maxCaracteresCelda: 200,
} as const;

export interface ContenidoTabla {
  encabezado: boolean;
  filas: string[][];
}

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const FIRMA_JPEG = [0xff, 0xd8, 0xff];
const FIRMA_RIFF = [0x52, 0x49, 0x46, 0x46];
const FIRMA_WEBP = [0x57, 0x45, 0x42, 0x50];

function empiezaCon(buffer: Buffer, firma: number[], desde = 0): boolean {
  if (buffer.length < desde + firma.length) {
    return false;
  }

  return firma.every((byte, indice) => buffer[desde + indice] === byte);
}

/**
 * Identifica la imagen por sus bytes iniciales. Nunca se confía en el nombre
 * ni en el tipo MIME que declara el cliente. SVG no se admite porque puede
 * contener scripts.
 */
export function detectarImagen(buffer: Buffer): ImagenDetectada | null {
  if (empiezaCon(buffer, FIRMA_PNG)) {
    return { mime: 'image/png', extension: 'png' };
  }

  if (empiezaCon(buffer, FIRMA_JPEG)) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }

  // WebP: "RIFF" + tamaño (4 bytes) + "WEBP".
  if (empiezaCon(buffer, FIRMA_RIFF) && empiezaCon(buffer, FIRMA_WEBP, 8)) {
    return { mime: 'image/webp', extension: 'webp' };
  }

  return null;
}

function formatearMiB(bytes: number): string {
  return String(Number((bytes / (1024 * 1024)).toFixed(1)));
}

/** Valida el archivo recibido y devuelve su formato real. */
export function validarImagen(
  archivo: Buffer | undefined,
  maxBytes: number,
): ImagenDetectada {
  if (!archivo) {
    throw new BadRequestException('Adjunta una imagen en el campo "archivo"');
  }

  if (archivo.length === 0) {
    throw new BadRequestException('La imagen está vacía');
  }

  if (archivo.length > maxBytes) {
    throw new BadRequestException(
      `La imagen supera el tamaño máximo de ${formatearMiB(maxBytes)} MiB`,
    );
  }

  const detectada = detectarImagen(archivo);

  if (!detectada) {
    throw new BadRequestException(
      'Formato de imagen no permitido. Usa PNG, JPG o WebP',
    );
  }

  return detectada;
}

/** Permite saltos de línea y tabulaciones, pero ningún otro carácter de control. */
function tieneCaracteresDeControl(texto: string): boolean {
  for (let indice = 0; indice < texto.length; indice++) {
    const codigo = texto.charCodeAt(indice);
    const permitido = codigo === 9 || codigo === 10 || codigo === 13;

    if ((codigo < 32 && !permitido) || codigo === 127) {
      return true;
    }
  }

  return false;
}

/** Valida una fórmula en LaTeX y la devuelve sin espacios sobrantes. */
export function validarFormula(valor: unknown): string {
  if (typeof valor !== 'string') {
    throw new BadRequestException('La fórmula debe ser texto');
  }

  const formula = valor.trim();

  if (!formula) {
    throw new BadRequestException('La fórmula no puede estar vacía');
  }

  if (formula.length > MAX_CARACTERES_FORMULA) {
    throw new BadRequestException(
      `La fórmula no puede superar ${MAX_CARACTERES_FORMULA} caracteres`,
    );
  }

  if (tieneCaracteresDeControl(formula)) {
    throw new BadRequestException('La fórmula contiene caracteres no válidos');
  }

  return formula;
}

/** Valida una tabla y devuelve su forma normalizada (celdas sin espacios sobrantes). */
export function validarTabla(valor: unknown): ContenidoTabla {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new BadRequestException(
      'La tabla debe ser un objeto con "filas" y, opcionalmente, "encabezado"',
    );
  }

  const { encabezado, filas } = valor as Record<string, unknown>;

  if (encabezado !== undefined && typeof encabezado !== 'boolean') {
    throw new BadRequestException('"encabezado" debe ser verdadero o falso');
  }

  if (!Array.isArray(filas) || filas.length === 0) {
    throw new BadRequestException('La tabla debe tener al menos una fila');
  }

  const filasEntrada: unknown[] = filas;

  if (filasEntrada.length > LIMITES_TABLA.maxFilas) {
    throw new BadRequestException(
      `La tabla no puede tener más de ${LIMITES_TABLA.maxFilas} filas`,
    );
  }

  const normalizadas: string[][] = [];
  let columnas = -1;

  for (const filaEntrada of filasEntrada) {
    if (!Array.isArray(filaEntrada) || filaEntrada.length === 0) {
      throw new BadRequestException(
        'Cada fila debe tener al menos una columna',
      );
    }

    const celdas: unknown[] = filaEntrada;

    if (celdas.length > LIMITES_TABLA.maxColumnas) {
      throw new BadRequestException(
        `La tabla no puede tener más de ${LIMITES_TABLA.maxColumnas} columnas`,
      );
    }

    if (columnas === -1) {
      columnas = celdas.length;
    } else if (celdas.length !== columnas) {
      throw new BadRequestException(
        'Todas las filas deben tener el mismo número de columnas',
      );
    }

    normalizadas.push(
      celdas.map((celda) => {
        if (typeof celda !== 'string') {
          throw new BadRequestException('Las celdas de la tabla deben ser texto');
        }

        const texto = celda.trim();

        if (texto.length > LIMITES_TABLA.maxCaracteresCelda) {
          throw new BadRequestException(
            `Cada celda puede tener hasta ${LIMITES_TABLA.maxCaracteresCelda} caracteres`,
          );
        }

        if (tieneCaracteresDeControl(texto)) {
          throw new BadRequestException(
            'Una celda contiene caracteres no válidos',
          );
        }

        return texto;
      }),
    );
  }

  if (normalizadas.every((fila) => fila.every((celda) => celda === ''))) {
    throw new BadRequestException('La tabla no puede estar completamente vacía');
  }

  return { encabezado: encabezado ?? false, filas: normalizadas };
}