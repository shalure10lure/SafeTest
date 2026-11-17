export interface ResultadoListadoEstudiante {
  examen_id: number;
  titulo: string | null;
  materia: string | null;
  docente: string | null;
  fecha_envio: string | null;
  resultados_publicados_en: string | null;
  estado: 'pendiente' | 'publicado';
  nota_final: string | null;
  puntaje_total: string | null;
}

export interface IncisoResultadoEstudiante {
  letra: string;
  enunciado_inciso: string;
  puntaje_max: string;
  puntaje_obtenido: string;
  retroalimentacion: string | null;
  respuesta_estudiante: string | null;
  respuesta_correcta: {
    opciones_correctas: { nro_opcion: number; texto_opcion: string }[];
    valor_correcto: string | null;
    tolerancia: string | null;
    solucion_referencia: string | null;
  } | null;
}

export interface PreguntaResultadoEstudiante {
  pregunta_id: number;
  orden: number;
  enunciado: string;
  explicacion: string | null;
  puntaje_max: string;
  puntaje_obtenido: string;
  incisos: IncisoResultadoEstudiante[];
}

export interface DetalleResultadoEstudiante {
  examen_id: number;
  titulo: string | null;
  materia: string | null;
  docente: string | null;
  nota_final: string;
  puntaje_total: string | null;
  fecha_publicacion: string;
  respuestas_correctas_disponibles: boolean;
  preguntas: PreguntaResultadoEstudiante[];
}
