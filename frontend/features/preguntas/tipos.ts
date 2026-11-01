import type {
    TipoFiltroPregunta,
    TipoRespuestaPregunta,
} from './types';

export interface InfoTipoPreguntaFormulario {
    valor: TipoRespuestaPregunta;
    label: string;
    /** Texto que acompaña al bloque de configuración de respuesta. */
    ayuda: string;
}

/**
 * Valores tomados de `inciso.tipo_respuesta` y de
 * `features/evaluaciones/tipos-pregunta.ts`.
 */
export const TIPOS_PREGUNTA_FORMULARIO: InfoTipoPreguntaFormulario[] = [
    {
        valor: 'opcion_unica',
        label: 'Opción única',
        ayuda: 'Marca la única respuesta correcta.',
    },
    {
        valor: 'opcion_multiple',
        label: 'Selección múltiple',
        ayuda: 'Marca una o más respuestas correctas.',
    },
    {
        valor: 'verdadero_falso',
        label: 'Verdadero / Falso',
        ayuda: 'Indica cuál de las dos afirmaciones es la correcta.',
    },
    {
        valor: 'desarrollo',
        label: 'Respuesta abierta',
        ayuda: 'Puedes dejar una solución de referencia para la corrección.',
    },
    {
        valor: 'numerica',
        label: 'Respuesta numérica',
        ayuda: 'Define el valor correcto y, si lo necesitas, una tolerancia.',
    },
];

export function infoTipoPreguntaFormulario(
    tipo: TipoRespuestaPregunta,
): InfoTipoPreguntaFormulario {
    return (
        TIPOS_PREGUNTA_FORMULARIO.find((info) => info.valor === tipo) ??
        TIPOS_PREGUNTA_FORMULARIO[0]
    );
}

export interface InfoTipoFiltroPregunta {
    valor: TipoFiltroPregunta;
    label: string;
}

/** Opciones del select "Tipo" del banco, incluidos los tipos heredados. */
export const TIPOS_FILTRO_PREGUNTA: InfoTipoFiltroPregunta[] = [
    ...TIPOS_PREGUNTA_FORMULARIO.map(({ valor, label }) => ({
        valor,
        label,
    })),
    { valor: 'texto_corto', label: 'Texto corto' },
    { valor: 'mixto', label: 'Varios incisos' },
];
