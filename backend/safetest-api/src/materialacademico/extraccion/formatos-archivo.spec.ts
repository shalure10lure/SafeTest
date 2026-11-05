import {
  docxConTexto,
  pdfConTexto,
  zipSinDocumentoWord,
} from '../../../test/fixtures/archivos-prueba';
import type { MotivoErrorMaterial } from '../materialacademico.errores';
import {
  sanearNombreArchivo,
  validarArchivo,
  type ArchivoParaValidar,
} from './formatos-archivo';

const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function validar(parcial: Partial<ArchivoParaValidar>) {
  return validarArchivo({
    nombreOriginal: 'apunte.pdf',
    mimeDeclarado: 'application/pdf',
    contenido: pdfConTexto('Contenido'),
    maxBytes: 1024 * 1024,
    ...parcial,
  });
}

/** Devuelve el motivo con el que se rechaza un archivo. */
function motivoDe(parcial: Partial<ArchivoParaValidar>): MotivoErrorMaterial {
  try {
    validar(parcial);
  } catch (error) {
    return (error as { motivo: MotivoErrorMaterial }).motivo;
  }

  throw new Error('El archivo no fue rechazado.');
}

describe('validarArchivo', () => {
  it('acepta un PDF con firma y MIME correctos', () => {
    const resultado = validar({});

    expect(resultado).toEqual({
      tipo: 'pdf',
      mime: 'application/pdf',
      extension: '.pdf',
      nombreArchivo: 'apunte.pdf',
    });
  });

  it('acepta un TXT UTF-8 con BOM', () => {
    const resultado = validar({
      nombreOriginal: 'notas.txt',
      mimeDeclarado: 'text/plain',
      contenido: Buffer.from('\uFEFFHola SafeTest', 'utf8'),
    });

    expect(resultado.tipo).toBe('txt');
  });

  it('acepta un TXT en latin1 cuando no es UTF-8 válido', () => {
    const contenido = Buffer.from([0x48, 0x6f, 0x6c, 0x61, 0x20, 0xe1]);

    expect(
      validar({
        nombreOriginal: 'notas.txt',
        mimeDeclarado: 'text/plain',
        contenido,
      }).tipo,
    ).toBe('txt');
  });

  it('acepta un DOCX con manifiesto y documento de Word', async () => {
    const contenido = await docxConTexto('Hola DOCX');

    const resultado = validar({
      nombreOriginal: 'guia.docx',
      mimeDeclarado: MIME_DOCX,
      contenido,
    });

    expect(resultado.tipo).toBe('docx');
    expect(resultado.mime).toBe(MIME_DOCX);
  });

  it('acepta application/octet-stream si el contenido coincide', () => {
    expect(validar({ mimeDeclarado: 'application/octet-stream' }).tipo).toBe(
      'pdf',
    );
  });

  it('rechaza extensiones no permitidas', () => {
    expect(
      motivoDe({
        nombreOriginal: 'virus.exe',
        mimeDeclarado: 'application/octet-stream',
        contenido: Buffer.from('MZ...'),
      }),
    ).toBe('extension_no_permitida');
  });

  it('rechaza archivos sin extensión', () => {
    expect(motivoDe({ nombreOriginal: 'sin-extension' })).toBe(
      'extension_no_permitida',
    );
  });

  it('rechaza un MIME declarado que no corresponde', () => {
    expect(motivoDe({ mimeDeclarado: 'text/html' })).toBe('mime_no_permitido');
  });

  it('rechaza un archivo vacío', () => {
    expect(motivoDe({ contenido: Buffer.alloc(0) })).toBe('archivo_vacio');
  });

  it('rechaza un archivo que supera el tamaño máximo', () => {
    expect(motivoDe({ contenido: pdfConTexto('x'), maxBytes: 10 })).toBe(
      'archivo_demasiado_grande',
    );
  });

  it('rechaza un PDF cuyo contenido no lo es', () => {
    expect(
      motivoDe({
        contenido: Buffer.from('esto no es un pdf'),
        mimeDeclarado: 'application/pdf',
      }),
    ).toBe('contenido_no_permitido');
  });

  it('rechaza un DOCX sin documento de Word', () => {
    expect(
      motivoDe({
        nombreOriginal: 'roto.docx',
        mimeDeclarado: MIME_DOCX,
        contenido: zipSinDocumentoWord(),
      }),
    ).toBe('archivo_danado');
  });

  it('rechaza un DOCX que en realidad es un PDF', () => {
    expect(
      motivoDe({
        nombreOriginal: 'disfraz.docx',
        mimeDeclarado: MIME_DOCX,
        contenido: pdfConTexto('Contenido'),
      }),
    ).toBe('contenido_no_permitido');
  });

  it('rechaza un TXT con contenido binario', () => {
    expect(
      motivoDe({
        nombreOriginal: 'binario.txt',
        mimeDeclarado: 'text/plain',
        contenido: Buffer.from([0x00, 0x01, 0x02, 0x03, 0x00, 0xff]),
      }),
    ).toBe('contenido_no_permitido');
  });

  it('rechaza un ejecutable disfrazado de TXT', () => {
    expect(
      motivoDe({
        nombreOriginal: 'programa.txt',
        mimeDeclarado: 'text/plain',
        contenido: Buffer.from('MZ\x90\x00contenido'),
      }),
    ).toBe('contenido_no_permitido');
  });

  it('rechaza un TXT codificado en UTF-16', () => {
    expect(
      motivoDe({
        nombreOriginal: 'utf16.txt',
        mimeDeclarado: 'text/plain',
        contenido: Buffer.from([0xff, 0xfe, 0x48, 0x00, 0x69, 0x00]),
      }),
    ).toBe('contenido_no_permitido');
  });
});

describe('sanearNombreArchivo', () => {
  it('elimina componentes de ruta y conserva el nombre base', () => {
    expect(sanearNombreArchivo('../../etc/passwd.pdf', '.pdf')).toBe(
      'passwd.pdf',
    );
    expect(sanearNombreArchivo('C:\\Users\\doc\\guia.docx', '.docx')).toBe(
      'guia.docx',
    );
  });

  it('elimina caracteres de control y normaliza espacios', () => {
    expect(sanearNombreArchivo('  guia\u0000   final .pdf', '.pdf')).toBe(
      'guia final .pdf',
    );
  });

  it('descarta nombres ocultos y usa un nombre por defecto', () => {
    expect(sanearNombreArchivo('...', '.pdf')).toBe('archivo.pdf');
  });

  it('recorta nombres demasiado largos sin perder la extensión', () => {
    const resultado = sanearNombreArchivo(`${'a'.repeat(400)}.pdf`, '.pdf');

    expect(resultado.length).toBe(180);
    expect(resultado.endsWith('.pdf')).toBe(true);
  });
});
