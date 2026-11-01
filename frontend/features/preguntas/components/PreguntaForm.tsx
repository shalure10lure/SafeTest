'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';
import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';
import { materiasService } from '@/features/materias/services/materias.service';
import type { Materia } from '@/features/materias/types';
import { temasService } from '@/features/temas/services/temas.service';
import type { Tema } from '@/features/temas/types';
import { cn } from '@/lib/utils';

import { preguntasService } from '../services/preguntas.service';
import { TIPOS_PREGUNTA_FORMULARIO } from '../tipos';
import type {
    DificultadPregunta,
    OpcionFormulario,
    PreguntaDetalle,
    TipoRespuestaPregunta,
} from '../types';
import { construirDto, validarFormulario } from '../validacion';

import Campo from './Campo';
import ConfiguracionRespuesta from './ConfiguracionRespuesta';
import RecursosOpcionales from './RecursosOpcionales';

const ENTRADA =
    'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const OPCIONES_INICIALES: OpcionFormulario[] = ['A', 'B', 'C', 'D'].map(
    (id) => ({ id, texto: '', correcta: false }),
);

interface PreguntaFormProps {
    /** Si se envía, el formulario edita esa pregunta en lugar de crear una. */
    pregunta?: PreguntaDetalle;
}

const TIPOS_VALIDOS = TIPOS_PREGUNTA_FORMULARIO.map((info) => info.valor);

function tipoInicial(pregunta?: PreguntaDetalle): TipoRespuestaPregunta {
    return (
        TIPOS_VALIDOS.find((valor) => valor === pregunta?.tipo_respuesta) ??
        'opcion_unica'
    );
}

function opcionesIniciales(pregunta?: PreguntaDetalle): OpcionFormulario[] {
    const tipo = tipoInicial(pregunta);

    if (
        !pregunta ||
        (tipo !== 'opcion_unica' && tipo !== 'opcion_multiple')
    ) {
        return OPCIONES_INICIALES;
    }

    const guardadas: OpcionFormulario[] = pregunta.opciones.map(
        (opcion, indice) => ({
            id: String.fromCharCode(65 + indice),
            texto: opcion.texto_opcion,
            correcta: opcion.es_correcta,
        }),
    );

    // El formulario siempre ofrece al menos 4 opciones.
    while (guardadas.length < 4) {
        guardadas.push({
            id: String.fromCharCode(65 + guardadas.length),
            texto: '',
            correcta: false,
        });
    }

    return guardadas;
}

function respuestaBooleanaInicial(
    pregunta?: PreguntaDetalle,
): 'verdadero' | 'falso' | '' {
    if (!pregunta || tipoInicial(pregunta) !== 'verdadero_falso') return '';

    const correcta = pregunta.opciones
        .find((opcion) => opcion.es_correcta)
        ?.texto_opcion.trim()
        .toLowerCase();

    return correcta === 'verdadero' || correcta === 'falso' ? correcta : '';
}

export default function PreguntaForm({ pregunta }: PreguntaFormProps) {
    const router = useRouter();
    const esEdicion = Boolean(pregunta);

    const [materias, setMaterias] = useState<Materia[]>([]);
    const [temas, setTemas] = useState<Tema[]>([]);
    const [cargando, setCargando] = useState(true);
    const [errorDatos, setErrorDatos] = useState('');

    const [materiaId, setMateriaId] = useState(
        String(
            pregunta?.materia?.materia_id ??
                pregunta?.tema?.materia?.materia_id ??
                '',
        ),
    );
    const [temaId, setTemaId] = useState(
        pregunta ? String(pregunta.tema_id) : '',
    );
    const [tipo, setTipo] = useState<TipoRespuestaPregunta>(
        tipoInicial(pregunta),
    );
    const [puntaje, setPuntaje] = useState(
        String(pregunta?.puntaje_max ?? 2),
    );
    const [enunciado, setEnunciado] = useState(pregunta?.enunciado ?? '');
    const [dificultad, setDificultad] = useState<DificultadPregunta | ''>(
        pregunta?.dificultad ?? '',
    );

    const [opciones, setOpciones] = useState<OpcionFormulario[]>(
        opcionesIniciales(pregunta),
    );
    const [respuestaBooleana, setRespuestaBooleana] = useState<
        'verdadero' | 'falso' | ''
    >(respuestaBooleanaInicial(pregunta));
    const [valorCorrecto, setValorCorrecto] = useState(
        pregunta?.valor_correcto !== null &&
            pregunta?.valor_correcto !== undefined
            ? String(pregunta.valor_correcto)
            : '',
    );
    const [tolerancia, setTolerancia] = useState(
        String(pregunta?.tolerancia ?? 0),
    );
    const [solucionReferencia, setSolucionReferencia] = useState(
        pregunta?.solucion_referencia ?? '',
    );

    const [tocados, setTocados] = useState<Record<string, boolean>>({});
    const [enviando, setEnviando] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState('');

    useEffect(() => {
        let vigente = true;

        async function cargarDatos() {
            try {
                const [datosMaterias, datosTemas] = await Promise.all([
                    materiasService.getAll(),
                    temasService.getAll(),
                ]);

                if (!vigente) return;

                setMaterias(
                    datosMaterias.filter((materia) => materia.activo),
                );
                setTemas(datosTemas);

                // Si la pregunta no trae su materia, se deduce del tema.
                if (pregunta) {
                    const temaGuardado = pregunta.tema_id;

                    setMateriaId(
                        (actual) =>
                            actual ||
                            String(
                                datosTemas.find(
                                    (tema) => tema.tema_id === temaGuardado,
                                )?.materia_id ?? '',
                            ),
                    );
                }
            } catch {
                if (vigente) {
                    setErrorDatos(
                        'No se pudieron cargar las materias y temas. Comprueba tu sesión y la conexión con el servidor.',
                    );
                }
            } finally {
                if (vigente) setCargando(false);
            }
        }

        void cargarDatos();

        return () => {
            vigente = false;
        };
    }, [pregunta]);

    const temasDeMateria = useMemo(() => {
        if (!materiaId) return [];

        return temas.filter(
            (tema) => tema.materia_id === Number(materiaId),
        );
    }, [temas, materiaId]);

    const datosFormulario = {
        materiaId,
        temaId,
        temasDeMateria,
        tipo,
        puntaje,
        enunciado,
        opciones,
        respuestaBooleana,
        valorCorrecto,
        tolerancia,
        solucionReferencia,
    };

    const {
        erroresGenerales,
        erroresConfiguracion,
        hayErrores,
        puntajeNumero,
    } = validarFormulario(datosFormulario);

    const formularioValido = !cargando && !hayErrores;

    const mostrar = (campo: string, mensaje: string) =>
        tocados[campo] ? mensaje : '';

    function marcarTocado(campo: string) {
        setTocados((previos) => ({ ...previos, [campo]: true }));
    }

    function cambiarMateria(valor: string) {
        setMateriaId(valor);
        setTemaId('');
        marcarTocado('materia');
    }

    function cambiarTipo(nuevoTipo: TipoRespuestaPregunta) {
        setTipo(nuevoTipo);
        setOpciones((previas) =>
            previas.map((opcion) => ({ ...opcion, correcta: false })),
        );
        setRespuestaBooleana('');
        setTocados((previos) => ({
            ...previos,
            configuracion: false,
        }));
    }

    function cambiarOpcion(id: string, texto: string) {
        setOpciones((previas) =>
            previas.map((opcion) =>
                opcion.id === id ? { ...opcion, texto } : opcion,
            ),
        );
        marcarTocado('configuracion');
    }

    function marcarCorrecta(id: string) {
        setOpciones((previas) => {
            if (tipo === 'opcion_unica') {
                return previas.map((opcion) => ({
                    ...opcion,
                    correcta: opcion.id === id,
                }));
            }

            return previas.map((opcion) =>
                opcion.id === id
                    ? { ...opcion, correcta: !opcion.correcta }
                    : opcion,
            );
        });
        marcarTocado('configuracion');
    }

    async function guardar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();

        setTocados({
            materia: true,
            tema: true,
            enunciado: true,
            puntaje: true,
            configuracion: true,
        });
        setErrorEnvio('');

        if (hayErrores) return;

        setEnviando(true);

        const datos = {
            ...construirDto(datosFormulario, puntajeNumero),
            ...(dificultad ? { dificultad } : {}),
        };

        try {
            if (pregunta) {
                await preguntasService.update(pregunta.pregunta_id, datos);
            } else {
                await preguntasService.create(datos);
            }

            router.push(ROUTES.docente.preguntas);
            router.refresh();
        } catch (error) {
            setErrorEnvio(
                mensajeDeError(
                    error,
                    'No se pudo guardar la pregunta. Verifica los datos e inténtalo de nuevo.',
                ),
            );
        } finally {
            setEnviando(false);
        }
    }

    return (
        <form onSubmit={guardar} noValidate className="space-y-5">
            <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                {errorDatos && (
                    <p role="alert" className="text-sm text-red-600">
                        {errorDatos}
                    </p>
                )}

                {pregunta &&
                    !TIPOS_VALIDOS.some(
                        (valor) => valor === pregunta.tipo_respuesta,
                    ) && (
                        <p
                            role="status"
                            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                        >
                            Esta pregunta no tiene un tipo compatible con este
                            formulario. Elige un tipo y configura su respuesta
                            para actualizarla.
                        </p>
                    )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Campo
                        id="materia"
                        etiqueta="Materia"
                        error={mostrar('materia', erroresGenerales.materia)}
                    >
                        <select
                            id="materia"
                            value={materiaId}
                            onChange={(evento) =>
                                cambiarMateria(evento.target.value)
                            }
                            disabled={cargando || materias.length === 0}
                            aria-invalid={Boolean(
                                mostrar(
                                    'materia',
                                    erroresGenerales.materia,
                                ),
                            )}
                            aria-describedby={
                                mostrar(
                                    'materia',
                                    erroresGenerales.materia,
                                )
                                    ? 'materia-descripcion'
                                    : undefined
                            }
                            className={cn(
                                ENTRADA,
                                mostrar('materia', erroresGenerales.materia)
                                    ? 'border-red-300'
                                    : 'border-slate-200',
                            )}
                        >
                            <option value="">
                                {cargando
                                    ? 'Cargando materias...'
                                    : materias.length === 0
                                      ? 'No tienes materias activas'
                                      : 'Selecciona una materia'}
                            </option>

                            {materias.map((materia) => (
                                <option
                                    key={materia.materia_id}
                                    value={materia.materia_id}
                                >
                                    {materia.nombre}
                                </option>
                            ))}
                        </select>

                        {!cargando && materias.length === 0 && (
                            <p className="mt-1.5 text-xs text-amber-700">
                                Primero crea una materia en{' '}
                                <Link
                                    href={ROUTES.docente.materias}
                                    className="font-medium underline"
                                >
                                    Mis materias
                                </Link>
                                .
                            </p>
                        )}
                    </Campo>

                    <Campo
                        id="tema"
                        etiqueta="Tema"
                        error={mostrar('tema', erroresGenerales.tema)}
                    >
                        <select
                            id="tema"
                            value={temaId}
                            onChange={(evento) => {
                                setTemaId(evento.target.value);
                                marcarTocado('tema');
                            }}
                            disabled={
                                !materiaId ||
                                cargando ||
                                temasDeMateria.length === 0
                            }
                            aria-invalid={Boolean(
                                mostrar('tema', erroresGenerales.tema),
                            )}
                            aria-describedby={
                                mostrar('tema', erroresGenerales.tema)
                                    ? 'tema-descripcion'
                                    : undefined
                            }
                            className={cn(
                                ENTRADA,
                                mostrar('tema', erroresGenerales.tema)
                                    ? 'border-red-300'
                                    : 'border-slate-200',
                            )}
                        >
                            <option value="">
                                {!materiaId
                                    ? 'Primero elige una materia'
                                    : cargando
                                      ? 'Cargando temas...'
                                      : temasDeMateria.length === 0
                                        ? 'Esta materia no tiene temas'
                                        : 'Selecciona un tema'}
                            </option>

                            {temasDeMateria.map((tema) => (
                                <option
                                    key={tema.tema_id}
                                    value={tema.tema_id}
                                >
                                    {tema.nombre_tema}
                                </option>
                            ))}
                        </select>

                        {materiaId &&
                            !cargando &&
                            temasDeMateria.length === 0 && (
                                <p className="mt-1.5 text-xs text-amber-700">
                                    Esta materia no tiene temas.{' '}
                                    <Link
                                        href={ROUTES.docente.temaNuevo}
                                        className="font-medium underline"
                                    >
                                        Crear tema
                                    </Link>
                                </p>
                            )}
                    </Campo>

                    <Campo id="tipo" etiqueta="Tipo de pregunta">
                        <select
                            id="tipo"
                            value={tipo}
                            onChange={(evento) =>
                                cambiarTipo(
                                    evento.target
                                        .value as TipoRespuestaPregunta,
                                )
                            }
                            className={cn(ENTRADA, 'border-slate-200')}
                        >
                            {TIPOS_PREGUNTA_FORMULARIO.map((info) => (
                                <option key={info.valor} value={info.valor}>
                                    {info.label}
                                </option>
                            ))}
                        </select>
                    </Campo>

                    <Campo
                        id="puntaje"
                        etiqueta="Puntaje máximo"
                        error={mostrar(
                            'puntaje',
                            erroresGenerales.puntaje,
                        )}
                    >
                        <input
                            id="puntaje"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={puntaje}
                            onChange={(evento) =>
                                setPuntaje(evento.target.value)
                            }
                            onBlur={() => marcarTocado('puntaje')}
                            aria-invalid={Boolean(
                                mostrar(
                                    'puntaje',
                                    erroresGenerales.puntaje,
                                ),
                            )}
                            aria-describedby={
                                mostrar(
                                    'puntaje',
                                    erroresGenerales.puntaje,
                                )
                                    ? 'puntaje-descripcion'
                                    : undefined
                            }
                            className={cn(
                                ENTRADA,
                                mostrar(
                                    'puntaje',
                                    erroresGenerales.puntaje,
                                )
                                    ? 'border-red-300'
                                    : 'border-slate-200',
                            )}
                        />
                    </Campo>
                </div>

                <Campo
                    id="enunciado"
                    etiqueta="Enunciado"
                    error={mostrar(
                        'enunciado',
                        erroresGenerales.enunciado,
                    )}
                >
                    <textarea
                        id="enunciado"
                        value={enunciado}
                        onChange={(evento) =>
                            setEnunciado(evento.target.value)
                        }
                        onBlur={() => marcarTocado('enunciado')}
                        rows={4}
                        maxLength={5000}
                        placeholder="Escribe el enunciado de la pregunta..."
                        aria-invalid={Boolean(
                            mostrar(
                                'enunciado',
                                erroresGenerales.enunciado,
                            ),
                        )}
                        aria-describedby={
                            mostrar(
                                'enunciado',
                                erroresGenerales.enunciado,
                            )
                                ? 'enunciado-descripcion'
                                : undefined
                        }
                        className={cn(
                            'w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600',
                            mostrar(
                                'enunciado',
                                erroresGenerales.enunciado,
                            )
                                ? 'border-red-300'
                                : 'border-slate-200',
                        )}
                    />
                </Campo>

                <Campo id="dificultad" etiqueta="Dificultad" opcional>
                    <select
                        id="dificultad"
                        value={dificultad}
                        onChange={(evento) =>
                            setDificultad(
                                evento.target.value as DificultadPregunta | '',
                            )
                        }
                        className={cn(ENTRADA, 'max-w-xs border-slate-200')}
                    >
                        {!pregunta?.dificultad && (
                            <option value="">Sin definir</option>
                        )}
                        <option value="facil">Fácil</option>
                        <option value="media">Media</option>
                        <option value="dificil">Difícil</option>
                    </select>
                </Campo>

                <RecursosOpcionales />

                <ConfiguracionRespuesta
                    tipo={tipo}
                    opciones={opciones}
                    respuestaBooleana={respuestaBooleana}
                    valorCorrecto={valorCorrecto}
                    tolerancia={tolerancia}
                    solucionReferencia={solucionReferencia}
                    errores={erroresConfiguracion}
                    mostrarErrores={Boolean(tocados.configuracion)}
                    onCambiarOpcion={cambiarOpcion}
                    onMarcarCorrecta={marcarCorrecta}
                    onCambiarBooleana={(valor) => {
                        setRespuestaBooleana(valor);
                        marcarTocado('configuracion');
                    }}
                    onCambiarValorCorrecto={(valor) => {
                        setValorCorrecto(valor);
                        marcarTocado('configuracion');
                    }}
                    onCambiarTolerancia={(valor) => {
                        setTolerancia(valor);
                        marcarTocado('configuracion');
                    }}
                    onCambiarSolucionReferencia={setSolucionReferencia}
                />

                {errorEnvio && (
                    <p
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                        {errorEnvio}
                    </p>
                )}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <LinkButton href={ROUTES.docente.preguntas}>
                    Cancelar
                </LinkButton>

                <button
                    type="submit"
                    disabled={!formularioValido || enviando}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {enviando
                        ? 'Guardando...'
                        : esEdicion
                          ? 'Guardar cambios'
                          : 'Guardar pregunta'}
                </button>
            </div>
        </form>
    );
}
