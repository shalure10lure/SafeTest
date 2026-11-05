import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

import { ErrorMaterial } from '../materialacademico.errores';
import { decodificarTextoPlano, type TipoArchivo } from './formatos-archivo';

/**
 * Extrae texto plano de PDF, DOCX y TXT en el backend.
 *
 * El texto se normaliza antes de guardarse: sin retornos de carro, sin
 * marcadores de página del parser y sin bloques de líneas vacías. Los errores
 * del parser se traducen a un motivo de dominio para no filtrar detalles
 * internos al docente.
 */
@Injectable()
export class ExtractorTextoService {
  private readonly logger = new Logger(ExtractorTextoService.name);

  async extraer(tipo: TipoArchivo, contenido: Buffer): Promise<string> {
    const crudo = await this.extraerCrudo(tipo, contenido);
    const texto = normalizarTexto(crudo);

    if (!texto) {
      throw new ErrorMaterial(
        'sin_texto',
        'No se pudo extraer texto del archivo. Verifica que no esté escaneado o vacío.',
      );
    }

    return texto;
  }

  private async extraerCrudo(
    tipo: TipoArchivo,
    contenido: Buffer,
  ): Promise<string> {
    if (tipo === 'txt') {
      return decodificarTextoPlano(contenido);
    }

    if (tipo === 'docx') {
      return this.extraerDocx(contenido);
    }

    return this.extraerPdf(contenido);
  }

  private async extraerPdf(contenido: Buffer): Promise<string> {
    let parser: PDFParse | null = null;

    try {
      parser = new PDFParse({ data: new Uint8Array(contenido) });
      const resultado = await parser.getText();

      return resultado.text;
    } catch (error) {
      this.registrarFallo('PDF', error);

      throw new ErrorMaterial(
        'extraccion_fallida',
        'No se pudo leer el PDF. Verifica que el archivo no esté dañado.',
      );
    } finally {
      await parser?.destroy().catch(() => undefined);
    }
  }

  private async extraerDocx(contenido: Buffer): Promise<string> {
    try {
      const resultado = await mammoth.extractRawText({ buffer: contenido });

      return resultado.value;
    } catch (error) {
      this.registrarFallo('DOCX', error);

      throw new ErrorMaterial(
        'extraccion_fallida',
        'No se pudo leer el DOCX. Verifica que el archivo no esté dañado.',
      );
    }
  }

  /** Solo se registra el tipo de error: nunca el contenido ni la ruta. */
  private registrarFallo(formato: string, error: unknown): void {
    const nombre = error instanceof Error ? error.name : 'desconocido';

    this.logger.warn(`Fallo al extraer texto de ${formato} (${nombre}).`);
  }
}

/** Unifica saltos de línea y elimina marcas internas del parser de PDF. */
export function normalizarTexto(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/\n*-- \d+ of \d+ --\n*/g, '\n\n')
    .split('\u0000')
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
