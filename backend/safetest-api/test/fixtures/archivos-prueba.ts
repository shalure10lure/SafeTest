import JSZip from 'jszip';

/**
 * Fixtures mínimos para las pruebas.
 *
 * El PDF se construye con offsets xref reales para que pdf.js lo acepte; el
 * DOCX es un ZIP con el manifiesto y el documento de Word que exige mammoth.
 */
export function pdfConTexto(texto: string): Buffer {
  const objetos: string[] = [];
  objetos[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objetos[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objetos[3] =
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
    '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>';

  const flujo = texto ? `BT /F1 24 Tf 72 720 Td (${texto}) Tj ET` : '';
  objetos[4] = `<< /Length ${Buffer.byteLength(flujo)} >>\nstream\n${flujo}\nendstream`;
  objetos[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let salida = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (let i = 1; i <= 5; i += 1) {
    offsets[i] = Buffer.byteLength(salida);
    salida += `${i} 0 obj\n${objetos[i]}\nendobj\n`;
  }

  const inicioXref = Buffer.byteLength(salida);
  salida += 'xref\n0 6\n0000000000 65535 f \n';

  for (let i = 1; i <= 5; i += 1) {
    salida += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  salida +=
    'trailer\n<< /Size 6 /Root 1 0 R >>\n' +
    `startxref\n${inicioXref}\n%%EOF\n`;

  return Buffer.from(salida, 'latin1');
}

export async function docxConTexto(
  texto: string,
  documentoValido = true,
): Promise<Buffer> {
  const zip = new JSZip();
  const documento = documentoValido
    ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${texto}</w:t></w:r></w:p></w:body>
</w:document>`
    : '<w:document><w:body>';

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.folder('word')?.file('document.xml', documento);

  return zip.generateAsync({ type: 'nodebuffer' });
}

/** ZIP con el manifiesto pero sin `word/document.xml`. */
export function zipSinDocumentoWord(): Buffer {
  return Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from('[Content_Types].xml', 'latin1'),
  ]);
}
