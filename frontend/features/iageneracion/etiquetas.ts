import { TIPOS_PREGUNTA_FORMULARIO } from '../preguntas/tipos';
import type {
    DificultadPregunta,
    TipoRespuestaPregunta,
} from '../preguntas/types';

export const ETIQUETAS_DIFICULTAD: Record<DificultadPregunta, string> = {
    facil: 'Fácil',
    media: 'Media',
    dificil: 'Difícil',
};

/** Resumen pedagógico que se muestra al docente al elegir el nivel. */
export const DESCRIPCIONES_DIFICULTAD: Record<DificultadPregunta, string> = {
    facil: 'Reconoce definiciones y conceptos básicos en situaciones sencillas.',
    media: 'Aplica lo aprendido para interpretar información y resolver casos prácticos moderados.',
    dificil: 'Analiza, relaciona conceptos y justifica conclusiones con varios pasos de razonamiento.',
};

export function etiquetaTipo(
    tipo: TipoRespuestaPregunta | null,
): string {
    if (!tipo) return 'No disponible';

    return (
        TIPOS_PREGUNTA_FORMULARIO.find((info) => info.valor === tipo)?.label ??
        tipo
    );
}
