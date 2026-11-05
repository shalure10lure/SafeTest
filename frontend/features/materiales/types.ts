/** Respuesta pública del backend (T8); nunca incluye rutas internas ni el texto completo. */
export type EstadoExtraccion = 'completado' | 'sin_texto';

export interface EstadoExtraccionMaterial {
    estado: EstadoExtraccion;
    caracteres: number;
}

export interface Material {
    material_id: number;
    titulo: string;
    materia_id: number;
    materia: string | null;
    tema_id: number | null;
    tema: string | null;
    nombre_archivo: string;
    mime_type: string;
    tamano_bytes: number;
    activo: boolean;
    autorizado_ia: boolean;
    autorizado_en: string | null;
    fecha_subida: string;
    estado_extraccion: EstadoExtraccionMaterial;
}

/** Respuesta de GET /materiales/:id/extraccion. */
export interface EstadoExtraccionDetalle {
    material_id: number;
    estado: EstadoExtraccion;
    caracteres: number;
    activo: boolean;
    autorizado_ia: boolean;
    disponible_para_ia: boolean;
}

export interface FiltrosMateriales {
    materia_id?: number;
}

export interface CrearMaterialDto {
    archivo: File;
    titulo: string;
    materia_id: number;
    tema_id?: number;
}
