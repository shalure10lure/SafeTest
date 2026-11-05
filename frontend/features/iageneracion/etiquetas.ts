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

export function etiquetaTipo(
    tipo: TipoRespuestaPregunta | null,
): string {
    if (!tipo) return 'No disponible';

    return (
        TIPOS_PREGUNTA_FORMULARIO.find((info) => info.valor === tipo)?.label ??
        tipo
    );
}
