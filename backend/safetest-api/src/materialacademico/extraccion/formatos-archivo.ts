import { ErrorMaterial } from '../materialacademico.errores';

/** Formatos que el backend sabe validar y extraer. */
export type TipoArchivo = 'pdf' | 'txt' | 'docx';

interface FormatoPermitido {
  tipo: TipoArchivo;
  mime: string;
}

/**
 * Lista blanca de formatos. La extensión solo se usa para elegir el parser:
 * la decisión final siempre la toma el contenido real del archivo.
 */
export const FORMATOS_PERMITIDOS: Readonly<Record<string, FormatoPermitido>> = {
  '.pdf': { tipo: 'pdf', mime: 'application/pdf' },
  '.txt': { tipo: 'txt', mime: 'text/plain' },
  '.docx': {
    tipo: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
};

/**
 * MIME genéricos que los navegadores envían cuando no reconocen el archivo.
 * No autorizan nada por sí solos: el contenido se valida igualmente.
 */
const MIMES_GENERICOS = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
]);

const MAX_LONGITUD_NOMBRE = 180;

export interface ArchivoParaValidar {
  nombreOriginal: string | undefined;
  mimeDeclarado: string | undefined;
  contenido: Buffer;
  maxBytes: number;
}

export interface ArchivoValidado {
  tipo: TipoArchivo;
  mime: string;
  extension: string;
  nombreArchivo: string;
}

/**
 * Valida extensión, tamaño, MIME declarado y contenido real.
 *
 * El MIME del navegador nunca es la única prueba: PDF y DOCX se reconocen por
 * su firma y un TXT debe poder decodificarse como texto.
 */
export function validarArchivo(entrada: ArchivoParaValidar): ArchivoValidado {
  const { contenido, maxBytes } = entrada;

  const nombreOriginal = entrada.nombreOriginal?.trim() ?? '';
  const extension = obtenerExtension(nombreOriginal);

  if (!extension) {
    throw new ErrorMaterial(
      'extension_no_permitida',
      'El archivo debe tener una extensión .pdf, .txt o .docx.',
    );
  }

  const formato = FORMATOS_PERMITIDOS[extension];

  if (!formato) {
    throw new ErrorMaterial(
      'extension_no_permitida',
      'Solo se permiten archivos PDF, TXT o DOCX.',
    );
  }

  if (contenido.length === 0) {
    throw new ErrorMaterial('archivo_vacio', 'El archivo está vacío.');
  }

  if (contenido.length > maxBytes) {
    throw new ErrorMaterial(
      'archivo_demasiado_grande',
      `El archivo supera el tamaño máximo de ${Math.floor(maxBytes / 1024 / 1024)} MB.`,
    );
  }

  validarMimeDeclarado(entrada.mimeDeclarado, formato.mime);

  if (esEjecutable(contenido)) {
    throw new ErrorMaterial(
      'contenido_no_permitido',
      'El contenido del archivo no corresponde a un documento permitido.',
    );
  }

  validarContenidoReal(formato.tipo, contenido);

  return {
    tipo: formato.tipo,
    mime: formato.mime,
    extension,
    nombreArchivo: sanearNombreArchivo(nombreOriginal, extension),
  };
}

function validarMimeDeclarado(
  mimeDeclarado: string | undefined,
  mimeEsperado: string,
): void {
  const mime = (mimeDeclarado ?? '').split(';')[0].trim().toLowerCase();

  if (MIMES_GENERICOS.has(mime) || mime === mimeEsperado) {
    return;
  }

  throw new ErrorMaterial(
    'mime_no_permitido',
    'El tipo de contenido declarado no corresponde a la extensión del archivo.',
  );
}

function validarContenidoReal(tipo: TipoArchivo, contenido: Buffer): void {
  if (tipo === 'pdf') {
    if (!firmaPdf(contenido)) {
      throw new ErrorMaterial(
        'contenido_no_permitido',
        'El archivo no es un PDF válido.',
      );
    }

    return;
  }

  if (tipo === 'docx') {
    if (!firmaZip(contenido)) {
      throw new ErrorMaterial(
        'contenido_no_permitido',
        'El archivo no es un DOCX válido.',
      );
    }

    if (!esDocumentoWord(contenido)) {
      throw new ErrorMaterial(
        'archivo_danado',
        'El DOCX está dañado o no contiene un documento de Word.',
      );
    }

    return;
  }

  decodificarTextoPlano(contenido);
}

function firmaPdf(contenido: Buffer): boolean {
  return contenido.subarray(0, 1024).includes(Buffer.from('%PDF-', 'latin1'));
}

function firmaZip(contenido: Buffer): boolean {
  return (
    contenido.length >= 4 &&
    contenido[0] === 0x50 &&
    contenido[1] === 0x4b &&
    contenido[2] === 0x03 &&
    contenido[3] === 0x04
  );
}

/**
 * Un DOCX es un ZIP cuyo índice contiene el manifiesto y el documento de
 * Word. Es una comprobación estructural barata; el parser hace la validación
 * completa antes de extraer texto.
 */
function esDocumentoWord(contenido: Buffer): boolean {
  return (
    incluyeTexto(contenido, '[Content_Types].xml') &&
    incluyeTexto(contenido, 'word/document.xml')
  );
}

function incluyeTexto(contenido: Buffer, texto: string): boolean {
  return contenido.includes(Buffer.from(texto, 'latin1'));
}

function esEjecutable(contenido: Buffer): boolean {
  const firma = contenido.subarray(0, 4);

  return (
    (firma[0] === 0x4d && firma[1] === 0x5a) || // MZ (PE/EXE)
    (firma[0] === 0x7f &&
      firma[1] === 0x45 &&
      firma[2] === 0x4c &&
      firma[3] === 0x46) || // ELF
    (firma[0] === 0xfe && firma[1] === 0xed && firma[2] === 0xfa) || // Mach-O
    (firma[0] === 0xcf &&
      firma[1] === 0xfa &&
      firma[2] === 0xed &&
      firma[3] === 0xfe) // Mach-O 64
  );
}

/**
 * Decodifica un TXT como UTF-8 estricto y, si no es válido, como texto
 * latino. Rechaza binarios, NUL y UTF-16 (que suele ser un binario disfrazado
 * o un archivo que el docente no pretendía subir).
 */
export function decodificarTextoPlano(contenido: Buffer): string {
  if (contenido.length >= 2) {
    const bom = contenido.subarray(0, 2);

    if (bom[0] === 0xff && bom[1] === 0xfe) {
      throw new ErrorMaterial(
        'contenido_no_permitido',
        'El archivo de texto debe estar codificado en UTF-8.',
      );
    }

    if (bom[0] === 0xfe && bom[1] === 0xff) {
      throw new ErrorMaterial(
        'contenido_no_permitido',
        'El archivo de texto debe estar codificado en UTF-8.',
      );
    }
  }

  let texto: string;

  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(contenido);
  } catch {
    texto = decodificarLatino(contenido);
  }

  if (texto.includes('\u0000')) {
    throw new ErrorMaterial(
      'contenido_no_permitido',
      'El archivo no parece un documento de texto.',
    );
  }

  return texto.replace(/^\uFEFF/, '');
}

function decodificarLatino(contenido: Buffer): string {
  const texto = contenido.toString('latin1');
  const muestra = texto.slice(0, 4096);
  let permitidos = 0;

  for (const caracter of muestra) {
    const codigo = caracter.codePointAt(0) ?? 0;

    if (codigo === 9 || codigo === 10 || codigo === 13) {
      permitidos += 1;
    } else if (codigo >= 32 && codigo !== 127) {
      permitidos += 1;
    }
  }

  if (muestra.length === 0 || permitidos / muestra.length < 0.95) {
    throw new ErrorMaterial(
      'contenido_no_permitido',
      'El archivo no parece un documento de texto.',
    );
  }

  return texto;
}

function obtenerExtension(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? '';
  const punto = base.lastIndexOf('.');

  if (punto < 1) {
    return '';
  }

  return base.slice(punto).toLowerCase();
}

/**
 * Conserva un nombre legible para mostrar, sin rutas ni caracteres de control.
 * El nombre nunca se usa para construir la ruta de almacenamiento.
 */
export function sanearNombreArchivo(
  nombreOriginal: string,
  extension: string,
): string {
  const base = nombreOriginal.split(/[\\/]/).pop() ?? '';
  let limpio = quitarControles(base)
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');

  if (!limpio) {
    limpio = `archivo${extension}`;
  }

  if (limpio.length > MAX_LONGITUD_NOMBRE) {
    limpio = `${limpio.slice(0, MAX_LONGITUD_NOMBRE - extension.length)}${extension}`;
  }

  return limpio;
}

/** Elimina caracteres de control sin usar una expresión regular. */
function quitarControles(texto: string): string {
  return [...texto]
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0;

      return codigo >= 32 && codigo !== 127;
    })
    .join('');
}
