import type { TipoRecurso } from '../../preguntarecurso/entity/preguntarecurso.entity';
import type { ContenidoTabla } from './validar-recursos';

/** Archivo recibido por multer. Se tipa aquí para no depender de @types/multer. */
export interface ArchivoSubido {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/** Recurso tal como se devuelve al cliente. */
export interface RecursoPregunta {
  recurso: string;
  tipo: TipoRecurso;
  /** Fórmula: LaTeX. Tabla: objeto. Imagen: null (se descarga aparte). */
  contenido: ContenidoTabla | string | null;
  mime_type: string | null;
  nombre_original: string | null;
  creado_en: Date;
}