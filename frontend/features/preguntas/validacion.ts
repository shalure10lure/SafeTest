import type {
    CrearPreguntaDto,
    ErroresConfiguracion,
    OpcionFormulario,
    TipoRespuestaPregunta,
} from './types';

export interface DatosFormularioPregunta {
    materiaId: string;
    temaId: string;
    temasDeMateria: { tema_id: number }[];
    tipo: TipoRespuestaPregunta;
    puntaje: string;
    enunciado: string;
    opciones: OpcionFormulario[];
    respuestaBooleana: 'verdadero' | 'falso' | '';
    valorCorrecto: string;
    tolerancia: string;
    solucionReferencia: string;
}

export interface ResultadoValidacionFormulario {
    erroresGenerales: Record<string, string>;
    erroresConfiguracion: ErroresConfiguracion;
    hayErrores: boolean;
    puntajeNumero: number;
}

export function normalizarOpcion(texto: string): string {
    return texto.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

export function aNumero(valor: string): number {
    return Number(valor.replace(',', '.'));
}

export function validarFormulario(
    datos: DatosFormularioPregunta,
): ResultadoValidacionFormulario {
    const puntajeNumero = aNumero(datos.puntaje);
    const puntajeValido =
        datos.puntaje.trim() !== '' &&
        Number.isFinite(puntajeNumero) &&
        puntajeNumero > 0;

    const temaPerteneceAMateria = datos.temasDeMateria.some(
        (tema) => String(tema.tema_id) === datos.temaId,
    );

    const erroresGenerales: Record<string, string> = {
        materia: datos.materiaId ? '' : 'Selecciona una materia.',
        tema: !datos.materiaId
            ? 'Selecciona una materia primero.'
            : !datos.temaId
              ? 'Selecciona un tema.'
              : !temaPerteneceAMateria
                ? 'Selecciona un tema de la materia elegida.'
                : '',
        enunciado: datos.enunciado.trim()
            ? ''
            : 'Escribe el enunciado de la pregunta.',
        puntaje: puntajeValido
            ? ''
            : 'El puntaje debe ser un número mayor que 0.',
    };

    const erroresConfiguracion: ErroresConfiguracion = {};

    if (
        datos.tipo === 'opcion_unica' ||
        datos.tipo === 'opcion_multiple'
    ) {
        const conTexto = datos.opciones.filter((opcion) =>
            opcion.texto.trim(),
        );

        if (conTexto.length < 2) {
            erroresConfiguracion.opciones =
                'Agrega al menos 2 opciones con texto.';
        } else {
            const textos = conTexto.map((opcion) =>
                normalizarOpcion(opcion.texto),
            );

            if (new Set(textos).size !== textos.length) {
                erroresConfiguracion.opciones =
                    'Las opciones no pueden repetirse.';
            } else if (
                datos.opciones.some(
                    (opcion) => opcion.correcta && !opcion.texto.trim(),
                )
            ) {
                erroresConfiguracion.opciones =
                    'Completa el texto de la opción marcada como correcta.';
            } else {
                const correctas = datos.opciones.filter(
                    (opcion) => opcion.correcta,
                ).length;

                if (datos.tipo === 'opcion_unica' && correctas !== 1) {
                    erroresConfiguracion.opciones =
                        'Marca exactamente una respuesta correcta.';
                }

                if (datos.tipo === 'opcion_multiple' && correctas < 1) {
                    erroresConfiguracion.opciones =
                        'Marca al menos una respuesta correcta.';
                }
            }
        }
    }

    if (datos.tipo === 'verdadero_falso' && !datos.respuestaBooleana) {
        erroresConfiguracion.booleana =
            'Selecciona si la respuesta correcta es Verdadero o Falso.';
    }

    if (datos.tipo === 'numerica') {
        if (
            !datos.valorCorrecto.trim() ||
            !Number.isFinite(aNumero(datos.valorCorrecto))
        ) {
            erroresConfiguracion.valorCorrecto =
                'Ingresa un valor numérico válido.';
        }

        if (
            datos.tolerancia.trim() &&
            (!Number.isFinite(aNumero(datos.tolerancia)) ||
                aNumero(datos.tolerancia) < 0)
        ) {
            erroresConfiguracion.tolerancia =
                'La tolerancia debe ser un número mayor o igual que 0.';
        }
    }

    return {
        erroresGenerales,
        erroresConfiguracion,
        hayErrores:
            Object.values(erroresGenerales).some(Boolean) ||
            Object.values(erroresConfiguracion).some(Boolean),
        puntajeNumero,
    };
}

export function construirDto(
    datos: DatosFormularioPregunta,
    puntajeNumero: number,
): CrearPreguntaDto {
    const dto: CrearPreguntaDto = {
        materia_id: Number(datos.materiaId),
        tema_id: Number(datos.temaId),
        tipo_respuesta: datos.tipo,
        puntaje_max: puntajeNumero,
        enunciado: datos.enunciado.trim(),
    };

    if (datos.tipo === 'opcion_unica' || datos.tipo === 'opcion_multiple') {
        dto.opciones = datos.opciones
            .filter((opcion) => opcion.texto.trim())
            .map((opcion) => ({
                texto_opcion: opcion.texto.trim(),
                es_correcta: opcion.correcta,
            }));
    } else if (datos.tipo === 'verdadero_falso') {
        dto.opciones = [
            {
                texto_opcion: 'Verdadero',
                es_correcta: datos.respuestaBooleana === 'verdadero',
            },
            {
                texto_opcion: 'Falso',
                es_correcta: datos.respuestaBooleana === 'falso',
            },
        ];
    } else if (datos.tipo === 'numerica') {
        dto.valor_correcto = aNumero(datos.valorCorrecto);
        dto.tolerancia = datos.tolerancia.trim()
            ? aNumero(datos.tolerancia)
            : 0;
    } else if (datos.tipo === 'desarrollo' && datos.solucionReferencia.trim()) {
        dto.solucion_referencia = datos.solucionReferencia.trim();
    }

    return dto;
}
