/** Contratos de HU-31, tomados del RevisionCalificacionesService del backend. */
export interface EstudianteCalificacion {
  estudiante_id: number;
  nombre_completo: string;
  estado: string;
  nota_final: string | null;
  fecha_envio: string | null;
  total_incisos: number;
  pendientes_revision: number;
  lista_para_publicar: boolean;
}

export interface ResumenCalificaciones {
  examen_id: number;
  titulo: string | null;
  puntaje_total: string | null;
  calificaciones_revisadas_en: string | null;
  resultados_publicados_en: string | null;
  respuestas_publicadas_en: string | null;
  disponible_hasta: string | null;
  total_rendiciones: number;
  total_listas: number;
  total_pendientes: number;
  estudiantes: EstudianteCalificacion[];
}

export interface OpcionCalificacion {
  nro_opcion: number;
  texto_opcion: string;
  seleccionada: boolean;
  correcta: boolean;
}

export interface ProcedimientoCalificacion {
  modelo_id: number | null;
  valores: unknown;
  resultado_final: string | null;
  formula_ids: number[];
}

export interface IncisoCalificacion {
  letra: string;
  enunciado_inciso: string;
  tipo_respuesta: string;
  puntaje_max: string;
  respuesta_texto: string | null;
  puntaje_obtenido: string | null;
  estado_correccion: string;
  pendiente_revision: boolean;
  retroalimentacion: string | null;
  opciones: OpcionCalificacion[];
  solucion_numerica: string | null;
  solucion_referencia: string | null;
  procedimiento: ProcedimientoCalificacion | null;
}

export interface PreguntaCalificacion {
  pregunta_id: number;
  orden: number;
  enunciado: string;
  puntaje_maximo_evaluacion: number | null;
  incisos: IncisoCalificacion[];
}

export interface DetalleCalificacion {
  examen_id: number;
  estudiante_id: number;
  nombre_completo: string;
  titulo: string | null;
  estado_rendicion: string;
  nota_final: string | null;
  calificaciones_revisadas_en: string | null;
  resultados_publicados_en: string | null;
  preguntas: PreguntaCalificacion[];
}

export interface RespuestaValoracion {
  puntaje: number;
  retroalimentacion?: string | null;
}

export interface ResultadoValoracion {
  examen_id: number;
  estudiante_id: number;
  pregunta_id: number;
  letra: string;
  estado_correccion: string;
  puntaje_obtenido: string;
  nota_final: string | null;
  estado_rendicion: string;
  pendientes_revision: number;
}

export interface ResultadoConfirmacion {
  examen_id: number;
  calificaciones_revisadas_en: string;
  ya_confirmadas: boolean;
}

export interface EvaluacionDocenteBasica {
  examen_id: number;
  titulo: string | null;
  estado: string;
  disponible_hasta: string | null;
  materia?: { nombre: string } | null;
  modo_entrega_nota?: string;
}
