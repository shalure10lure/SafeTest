import type { Material } from '../materiales/types';
import { TIPOS_PREGUNTA_FORMULARIO } from '../preguntas/tipos';
import type {
    DificultadPregunta,
    TipoRespuestaPregunta,
} from '../preguntas/types';
import type { Tema } from '../temas/types';
import type { CrearGeneracionIaDto } from './types';

/** Límites publicados por el backend (`iageneracion.types.ts`). */
export const CANTIDAD_MINIMA_IA = 1;
export const CANTIDAD_MAXIMA_IA = 50;

/**
 * Valor por defecto de `IA_MAX_MATERIALES` en el backend. El servidor sigue
 * siendo la autoridad: si su configuración cambia, su validación responde.
 */
export const MAX_MATERIALES_CONTEXTO = 3;

export const DIFICULTADES_IA: DificultadPregunta[] = [
    'facil',
    'media',
    'dificil',
];

const TIPOS_VALIDOS = new Set(
    TIPOS_PREGUNTA_FORMULARIO.map((info) => info.valor),
);

export interface DatosFormularioIa {
    materiaId: string;
    temaId: string;
    tipo: string;
    cantidad: string;
    dificultad: string;
    materialIds: number[];
    temasDeMateria: Tema[];
    /** Solo materiales activos, con texto y autorizados para IA. */
    materialesSeleccionables: Material[];
}

export interface ErroresFormularioIa {
    materia?: string;
    tema?: string;
    tipo?: string;
    cantidad?: string;
    dificultad?: string;
    materiales?: string;
}

export interface ResultadoValidacionIa {
    errores: ErroresFormularioIa;
    hayErrores: boolean;
}

function esDificultad(valor: string): valor is DificultadPregunta {
    return DIFICULTADES_IA.includes(valor as DificultadPregunta);
}

function esTipoRespuesta(valor: string): valor is TipoRespuestaPregunta {
    return TIPOS_VALIDOS.has(valor as TipoRespuestaPregunta);
}

/** Validación previa al envío; replica los límites reales del DTO. */
export function validarFormularioIa(
    datos: DatosFormularioIa,
): ResultadoValidacionIa {
    const errores: ErroresFormularioIa = {};

    const materiaId = Number(datos.materiaId);
    if (
        !datos.materiaId ||
        !Number.isInteger(materiaId) ||
        materiaId < 1
    ) {
        errores.materia = 'Selecciona una materia activa.';
    }

    const temaId = Number(datos.temaId);
    if (!datos.temaId || !Number.isInteger(temaId) || temaId < 1) {
        errores.tema = 'Selecciona un tema de la materia.';
    } else if (
        !datos.temasDeMateria.some((tema) => tema.tema_id === temaId)
    ) {
        errores.tema = 'El tema seleccionado no pertenece a la materia.';
    }

    if (!esTipoRespuesta(datos.tipo)) {
        errores.tipo = 'Selecciona un tipo de pregunta válido.';
    }

    const cantidad = Number(datos.cantidad);
    if (datos.cantidad.trim() === '' || !Number.isInteger(cantidad)) {
        errores.cantidad = 'Indica una cantidad entera de preguntas.';
    } else if (cantidad < CANTIDAD_MINIMA_IA || cantidad > CANTIDAD_MAXIMA_IA) {
        errores.cantidad = `La cantidad debe estar entre ${CANTIDAD_MINIMA_IA} y ${CANTIDAD_MAXIMA_IA}.`;
    }

    if (!esDificultad(datos.dificultad)) {
        errores.dificultad = 'Selecciona una dificultad.';
    }

    const idsSeleccionables = new Set(
        datos.materialesSeleccionables.map((material) => material.material_id),
    );

    if (datos.materialIds.length === 0) {
        errores.materiales =
            'Selecciona al menos un material autorizado con texto extraído.';
    } else if (datos.materialIds.some((id) => !idsSeleccionables.has(id))) {
        errores.materiales =
            'Solo puedes usar materiales activos, con texto extraído y autorizados para IA.';
    } else if (datos.materialIds.length > MAX_MATERIALES_CONTEXTO) {
        errores.materiales = `Selecciona como máximo ${MAX_MATERIALES_CONTEXTO} materiales de contexto.`;
    }

    return { errores, hayErrores: Object.keys(errores).length > 0 };
}

/** Construye el DTO exacto con los materiales seleccionados como fuente. */
export function construirDtoIa(
    datos: DatosFormularioIa,
): CrearGeneracionIaDto {
    return {
        materia_id: Number(datos.materiaId),
        tema_id: Number(datos.temaId),
        tipo_respuesta: datos.tipo as TipoRespuestaPregunta,
        cantidad: Number(datos.cantidad),
        dificultad: datos.dificultad as DificultadPregunta,
        material_ids: [...datos.materialIds],
    };
}
