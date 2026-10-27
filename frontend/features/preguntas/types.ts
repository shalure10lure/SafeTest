export interface PreguntaBanco {
    pregunta_id: number;
    enunciado: string;
    dificultad: string | null;
    tipo_respuesta: string | null;
    puntaje_total: number;
    tema: { tema_id: number; nombre_tema: string };
    materia: { materia_id: number; nombre: string };
    /** En cuántas evaluaciones ya se usa. */
    usada_en: number;
}

const ETIQUETAS_TIPO: Record<string, string> = {
    opcion_unica: 'Opción única',
    seleccion_multiple: 'Selección múltiple',
    verdadero_falso: 'Verdadero / Falso',
    respuesta_abierta: 'Respuesta abierta',
    respuesta_numerica: 'Respuesta numérica',
    mixta: 'Mixta',
};

export function etiquetaTipo(tipo: string | null): string {
    if (!tipo) return 'Sin incisos';
    return ETIQUETAS_TIPO[tipo] ?? tipo;
}