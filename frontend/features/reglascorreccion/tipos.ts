import type {
    EstrategiaRegla,
    ParametrosRegla,
    TipoRespuestaRegla,
} from './types';

export interface InfoTipoRegla {
    tipo: TipoRespuestaRegla;
    label: string;
    descripcion: string;
    estrategia: EstrategiaRegla;
}

/**
 * Tipos admitidos por el backend y su estrategia de corrección.
 *
 * El orden es el mismo que el de la referencia visual: primero las preguntas
 * de selección, después la numérica y al final la respuesta abierta.
 */
export const TIPOS_REGLA: readonly InfoTipoRegla[] = [
    {
        tipo: 'opcion_unica',
        label: 'Opción única',
        descripcion: 'Una sola opción correcta por pregunta.',
        estrategia: 'automatica',
    },
    {
        tipo: 'opcion_multiple',
        label: 'Opción múltiple',
        descripcion: 'Varias opciones correctas por pregunta.',
        estrategia: 'automatica',
    },
    {
        tipo: 'verdadero_falso',
        label: 'Verdadero / Falso',
        descripcion: 'Dos opciones posibles: verdadero o falso.',
        estrategia: 'automatica',
    },
    {
        tipo: 'numerica',
        label: 'Numérica',
        descripcion: 'Respuesta con valor numérico y tolerancia.',
        estrategia: 'automatica',
    },
    {
        tipo: 'desarrollo',
        label: 'Desarrollo',
        descripcion: 'Respuesta abierta con revisión manual.',
        estrategia: 'manual_rubrica',
    },
];

export function infoTipoRegla(tipo: TipoRespuestaRegla): InfoTipoRegla {
    return TIPOS_REGLA.find((info) => info.tipo === tipo) ?? TIPOS_REGLA[0];
}

function redondeoValido(valor: unknown): valor is number {
    return (
        typeof valor === 'number' &&
        Number.isInteger(valor) &&
        valor >= 0 &&
        valor <= 6
    );
}

/**
 * Devuelve solo los parámetros permitidos para el tipo y completa los valores
 * por defecto que el formulario necesita mostrar.
 *
 * Para `desarrollo` la estrategia siempre es manual: no se envían ni se
 * muestran opciones de autocorrección.
 */
export function normalizarParametros(
    tipo: TipoRespuestaRegla,
    parametros: ParametrosRegla = {},
): ParametrosRegla {
    switch (tipo) {
        case 'opcion_multiple':
            return {
                estrategia: 'automatica',
                puntaje_parcial: parametros.puntaje_parcial === true,
                penalizar_incorrectas:
                    parametros.penalizar_incorrectas === true,
            };
        case 'numerica':
            return {
                estrategia: 'automatica',
                redondeo_decimales: redondeoValido(
                    parametros.redondeo_decimales,
                )
                    ? parametros.redondeo_decimales
                    : 2,
            };
        case 'desarrollo':
            return { estrategia: 'manual_rubrica' };
        default:
            return { estrategia: 'automatica' };
    }
}

/* ------------------------------------------------------------------ */
/* Modo de calificación de opción múltiple                             */
/* ------------------------------------------------------------------ */

/**
 * El backend guarda dos booleanos independientes. La referencia visual usa un
 * único selector, así que cada modo representa una combinación válida.
 */
export type ModoCalificacionMultiple =
    | 'exacta'
    | 'parcial'
    | 'parcial_penalizada'
    | 'penalizada';

export interface OpcionModoCalificacion {
    valor: ModoCalificacionMultiple;
    label: string;
    ayuda: string;
}

export const MODOS_CALIFICACION_MULTIPLE: readonly OpcionModoCalificacion[] =
    [
        {
            valor: 'exacta',
            label: 'Selección exacta',
            ayuda: 'Solo se otorga puntaje si la selección coincide por completo.',
        },
        {
            valor: 'parcial',
            label: 'Parcial por opción correcta',
            ayuda: 'Se otorga puntaje por cada opción correcta seleccionada.',
        },
        {
            valor: 'parcial_penalizada',
            label: 'Parcial con penalización',
            ayuda: 'Suma por aciertos y resta por opciones incorrectas.',
        },
        {
            valor: 'penalizada',
            label: 'Solo penalización',
            ayuda: 'Resta puntaje por opciones incorrectas sin puntaje parcial.',
        },
    ];

export function modoCalificacionMultiple(
    parametros: ParametrosRegla,
): ModoCalificacionMultiple {
    const parcial = parametros.puntaje_parcial === true;
    const penaliza = parametros.penalizar_incorrectas === true;

    if (parcial && penaliza) return 'parcial_penalizada';
    if (parcial) return 'parcial';
    if (penaliza) return 'penalizada';

    return 'exacta';
}

export function parametrosDeModoCalificacion(
    modo: ModoCalificacionMultiple,
): Pick<ParametrosRegla, 'puntaje_parcial' | 'penalizar_incorrectas'> {
    switch (modo) {
        case 'parcial':
            return { puntaje_parcial: true, penalizar_incorrectas: false };
        case 'parcial_penalizada':
            return { puntaje_parcial: true, penalizar_incorrectas: true };
        case 'penalizada':
            return { puntaje_parcial: false, penalizar_incorrectas: true };
        default:
            return { puntaje_parcial: false, penalizar_incorrectas: false };
    }
}

/** Compara dos configuraciones ya normalizadas para detectar cambios reales. */
export function sonParametrosIguales(
    tipo: TipoRespuestaRegla,
    actual: ParametrosRegla,
    guardado: ParametrosRegla,
): boolean {
    return (
        JSON.stringify(normalizarParametros(tipo, actual)) ===
        JSON.stringify(normalizarParametros(tipo, guardado))
    );
}
