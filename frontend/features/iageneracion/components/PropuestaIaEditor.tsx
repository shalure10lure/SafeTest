'use client';

import { useMemo, useState, type FormEvent } from 'react';

import Campo from '@/features/preguntas/components/Campo';
import ConfiguracionRespuesta from '@/features/preguntas/components/ConfiguracionRespuesta';
import { construirDto, validarFormulario } from '@/features/preguntas/validacion';
import type {
    DificultadPregunta,
    OpcionFormulario,
} from '@/features/preguntas/types';

import type {
    ActualizarPropuestaIaDto,
    PropuestaGeneracionIa,
} from '../types';

interface PropuestaIaEditorProps {
    propuesta: PropuestaGeneracionIa;
    guardando: boolean;
    onGuardar: (dto: ActualizarPropuestaIaDto) => void;
    onCancelar: () => void;
}

const DIFICULTADES: { valor: DificultadPregunta; etiqueta: string }[] = [
    { valor: 'facil', etiqueta: 'Fácil' },
    { valor: 'media', etiqueta: 'Media' },
    { valor: 'dificil', etiqueta: 'Difícil' },
];

const CAMPO =
    'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600';

function opcionesIniciales(
    propuesta: PropuestaGeneracionIa,
): OpcionFormulario[] {
    if (
        propuesta.tipo_respuesta === 'opcion_unica' ||
        propuesta.tipo_respuesta === 'opcion_multiple' ||
        propuesta.tipo_respuesta === 'verdadero_falso'
    ) {
        return propuesta.contenido.opciones.map((opcion, indice) => ({
            id: String(indice),
            texto: opcion.texto_opcion,
            correcta: opcion.es_correcta,
        }));
    }

    return ['A', 'B', 'C', 'D'].map((id) => ({
        id,
        texto: '',
        correcta: false,
    }));
}

function respuestaBooleanaInicial(
    propuesta: PropuestaGeneracionIa,
): 'verdadero' | 'falso' | '' {
    if (propuesta.tipo_respuesta !== 'verdadero_falso') return '';

    const correcta = propuesta.contenido.opciones
        .find((opcion) => opcion.es_correcta)
        ?.texto_opcion.trim()
        .toLowerCase();

    return correcta === 'verdadero' || correcta === 'falso' ? correcta : '';
}

export default function PropuestaIaEditor({
    propuesta,
    guardando,
    onGuardar,
    onCancelar,
}: PropuestaIaEditorProps) {
    const tipo = propuesta.tipo_respuesta;
    const contenido = propuesta.contenido;
    const [enunciado, setEnunciado] = useState(contenido.enunciado);
    const [dificultad, setDificultad] = useState<DificultadPregunta>(
        contenido.dificultad,
    );
    const [puntaje, setPuntaje] = useState(String(contenido.puntaje_max));
    const [opciones, setOpciones] = useState(() =>
        opcionesIniciales(propuesta),
    );
    const [respuestaBooleana, setRespuestaBooleana] = useState<
        'verdadero' | 'falso' | ''
    >(() => respuestaBooleanaInicial(propuesta));
    const [valorCorrecto, setValorCorrecto] = useState(
        propuesta.tipo_respuesta === 'numerica'
            ? String(propuesta.contenido.valor_correcto)
            : '',
    );
    const [tolerancia, setTolerancia] = useState(
        propuesta.tipo_respuesta === 'numerica'
            ? String(propuesta.contenido.tolerancia ?? 0)
            : '0',
    );
    const [solucionReferencia, setSolucionReferencia] = useState(
        propuesta.tipo_respuesta === 'desarrollo'
            ? propuesta.contenido.solucion_referencia ?? ''
            : '',
    );
    const [explicacion, setExplicacion] = useState(
        contenido.explicacion ?? '',
    );
    const [mostrarErrores, setMostrarErrores] = useState(false);

    const validacion = useMemo(
        () =>
            validarFormulario({
                materiaId: '1',
                temaId: '1',
                temasDeMateria: [{ tema_id: 1 }],
                tipo,
                puntaje,
                enunciado,
                opciones,
                respuestaBooleana,
                valorCorrecto,
                tolerancia,
                solucionReferencia,
            }),
        [
            enunciado,
            opciones,
            puntaje,
            respuestaBooleana,
            solucionReferencia,
            tipo,
            tolerancia,
            valorCorrecto,
        ],
    );

    const puntajePrecisionInvalida =
        validacion.puntajeNumero > 0 &&
        !/^\d+(?:[.,]\d{1,2})?$/.test(puntaje.trim());
    const erroresGenerales = {
        ...validacion.erroresGenerales,
        enunciado:
            enunciado.length > 4_000
                ? 'El enunciado no puede superar los 4000 caracteres.'
                : validacion.erroresGenerales.enunciado,
        puntaje:
            puntajePrecisionInvalida
                ? 'El puntaje admite hasta 2 decimales.'
                : validacion.erroresGenerales.puntaje,
        explicacion:
            explicacion.length > 2_000
                ? 'La explicación no puede superar los 2000 caracteres.'
                : '',
    };

    const hayErrores =
        validacion.hayErrores ||
        enunciado.length > 4_000 ||
        puntajePrecisionInvalida ||
        explicacion.length > 2_000;

    function cambiarOpcion(id: string, texto: string) {
        setOpciones((anteriores) =>
            anteriores.map((opcion) =>
                opcion.id === id ? { ...opcion, texto } : opcion,
            ),
        );
    }

    function marcarCorrecta(id: string) {
        setOpciones((anteriores) =>
            tipo === 'opcion_unica'
                ? anteriores.map((opcion) => ({
                      ...opcion,
                      correcta: opcion.id === id,
                  }))
                : anteriores.map((opcion) =>
                      opcion.id === id
                          ? { ...opcion, correcta: !opcion.correcta }
                          : opcion,
                  ),
        );
    }

    function agregarOpcion() {
        const siguiente = opciones.reduce((maximo, opcion) => {
            const numero = Number(opcion.id.replace(/\D/g, ''));
            return Number.isFinite(numero)
                ? Math.max(maximo, numero)
                : maximo;
        }, -1) + 1;

        setOpciones((anteriores) => [
            ...anteriores,
            {
                id: `opcion-${siguiente}`,
                texto: '',
                correcta: false,
            },
        ]);
    }

    function guardar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setMostrarErrores(true);
        if (hayErrores) return;

        const datos = construirDto(
            {
                materiaId: '1',
                temaId: '1',
                temasDeMateria: [{ tema_id: 1 }],
                tipo,
                puntaje,
                enunciado,
                opciones,
                respuestaBooleana,
                valorCorrecto,
                tolerancia,
                solucionReferencia,
            },
            validacion.puntajeNumero,
        );

        onGuardar({
            enunciado: datos.enunciado,
            dificultad,
            puntaje_max: datos.puntaje_max,
            ...(datos.opciones ? { opciones: datos.opciones } : {}),
            ...(datos.valor_correcto !== undefined
                ? { valor_correcto: datos.valor_correcto }
                : {}),
            ...(datos.tolerancia !== undefined
                ? { tolerancia: datos.tolerancia }
                : {}),
            ...(datos.solucion_referencia
                ? { solucion_referencia: datos.solucion_referencia }
                : {}),
            ...(explicacion.trim()
                ? { explicacion: explicacion.trim() }
                : {}),
        });
    }

    return (
        <form
            onSubmit={guardar}
            noValidate
            className="space-y-4 border-t border-slate-200 pt-4"
        >
            <Campo
                id={`enunciado-${propuesta.propuesta_id}`}
                etiqueta="Enunciado"
                error={mostrarErrores ? erroresGenerales.enunciado : ''}
            >
                <textarea
                    id={`enunciado-${propuesta.propuesta_id}`}
                    value={enunciado}
                    onChange={(evento) => setEnunciado(evento.target.value)}
                    rows={4}
                    maxLength={4_000}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600"
                />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                    id={`dificultad-${propuesta.propuesta_id}`}
                    etiqueta="Dificultad"
                >
                    <select
                        id={`dificultad-${propuesta.propuesta_id}`}
                        value={dificultad}
                        onChange={(evento) => {
                            const seleccion = DIFICULTADES.find(
                                (item) => item.valor === evento.target.value,
                            );
                            if (seleccion) setDificultad(seleccion.valor);
                        }}
                        className={CAMPO}
                    >
                        {DIFICULTADES.map((item) => (
                            <option key={item.valor} value={item.valor}>
                                {item.etiqueta}
                            </option>
                        ))}
                    </select>
                </Campo>
                <Campo
                    id={`puntaje-${propuesta.propuesta_id}`}
                    etiqueta="Puntaje máximo"
                    error={mostrarErrores ? erroresGenerales.puntaje : ''}
                >
                    <input
                        id={`puntaje-${propuesta.propuesta_id}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={puntaje}
                        onChange={(evento) => setPuntaje(evento.target.value)}
                        className={CAMPO}
                    />
                </Campo>
            </div>

            <ConfiguracionRespuesta
                tipo={tipo}
                opciones={opciones}
                respuestaBooleana={respuestaBooleana}
                valorCorrecto={valorCorrecto}
                tolerancia={tolerancia}
                solucionReferencia={solucionReferencia}
                errores={validacion.erroresConfiguracion}
                mostrarErrores={mostrarErrores}
                onCambiarOpcion={cambiarOpcion}
                onMarcarCorrecta={marcarCorrecta}
                onCambiarBooleana={setRespuestaBooleana}
                onCambiarValorCorrecto={setValorCorrecto}
                onCambiarTolerancia={setTolerancia}
                onCambiarSolucionReferencia={setSolucionReferencia}
                maxLengthSolucion={4_000}
                onAgregarOpcion={
                    tipo === 'opcion_unica' || tipo === 'opcion_multiple'
                        ? agregarOpcion
                        : undefined
                }
                onEliminarOpcion={
                    tipo === 'opcion_unica' || tipo === 'opcion_multiple'
                        ? (id) =>
                              setOpciones((anteriores) =>
                                  anteriores.filter(
                                      (opcion) => opcion.id !== id,
                                  ),
                              )
                        : undefined
                }
            />

            <Campo
                id={`explicacion-${propuesta.propuesta_id}`}
                etiqueta="Explicación"
                opcional
                error={mostrarErrores ? erroresGenerales.explicacion : ''}
            >
                <textarea
                    id={`explicacion-${propuesta.propuesta_id}`}
                    value={explicacion}
                    onChange={(evento) => setExplicacion(evento.target.value)}
                    rows={3}
                    maxLength={2_000}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600"
                />
            </Campo>

            <div className="flex flex-wrap justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancelar}
                    disabled={guardando}
                    className="h-9 rounded-lg border border-slate-200 px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={guardando}
                    className="h-9 rounded-lg bg-violet-600 px-3.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                >
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
        </form>
    );
}
