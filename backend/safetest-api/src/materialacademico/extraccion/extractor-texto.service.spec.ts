import {
  docxConTexto,
  pdfConTexto,
} from '../../../test/fixtures/archivos-prueba';
import type { MotivoErrorMaterial } from '../materialacademico.errores';
import {
  ExtractorTextoService,
  normalizarTexto,
} from './extractor-texto.service';

const extractor = new ExtractorTextoService();

async function motivoDe(
  extraccion: Promise<unknown>,
): Promise<MotivoErrorMaterial> {
  try {
    await extraccion;
  } catch (error) {
    return (error as { motivo: MotivoErrorMaterial }).motivo;
  }

  throw new Error('La extracción no falló.');
}

describe('ExtractorTextoService', () => {
  it('extrae el texto de un PDF y quita los marcadores de página', async () => {
    const texto = await extractor.extraer('pdf', pdfConTexto('Hola SafeTest'));

    expect(texto).toContain('Hola SafeTest');
    expect(texto).not.toContain('-- 1 of 1 --');
  });

  it('rechaza un PDF dañado', async () => {
    await expect(
      motivoDe(
        extractor.extraer('pdf', Buffer.from('%PDF-1.4\ncontenido roto')),
      ),
    ).resolves.toBe('extraccion_fallida');
  });

  it('rechaza un PDF sin texto', async () => {
    await expect(
      motivoDe(extractor.extraer('pdf', pdfConTexto(''))),
    ).resolves.toBe('sin_texto');
  });

  it('extrae y normaliza un TXT', async () => {
    const texto = await extractor.extraer(
      'txt',
      Buffer.from('Linea 1\r\nLinea 2\r\n\r\n\r\nLinea 3', 'utf8'),
    );

    expect(texto).toBe('Linea 1\nLinea 2\n\nLinea 3');
  });

  it('rechaza un TXT con solo espacios', async () => {
    await expect(
      motivoDe(extractor.extraer('txt', Buffer.from('   \n\t  ', 'utf8'))),
    ).resolves.toBe('sin_texto');
  });

  it('extrae el texto de un DOCX', async () => {
    const contenido = await docxConTexto('Hola DOCX');

    await expect(extractor.extraer('docx', contenido)).resolves.toContain(
      'Hola DOCX',
    );
  });

  it('rechaza un DOCX dañado', async () => {
    const contenido = await docxConTexto('roto', false);

    await expect(motivoDe(extractor.extraer('docx', contenido))).resolves.toBe(
      'extraccion_fallida',
    );
  });
});

describe('normalizarTexto', () => {
  it('unifica saltos de línea y recorta espacios finales', () => {
    expect(normalizarTexto('  a  \r\n\r\n\r\nb\t\r\n')).toBe('a\n\nb');
  });
});
