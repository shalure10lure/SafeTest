'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/Card';
import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';

import { formatearDuracion, formatearFechaHora } from '../configuracion';
import { formatearPuntos } from '../formato';
import { mensajeDeError, problemasDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type {
    MotivoPreguntaSinPuntaje,
    ProblemaPublicacion,
    ResumenEvaluacion,
} from '../types';
import SeccionConfiguracion from './SeccionConfiguracion';

/** Cuántos nombres se muestran antes de resumir con "+N más". */
const MAX_CHIPS = 8;

const MOTIVO_SIN_PUNTAJE: Record<MotivoPreguntaSinPuntaje, string> = {
    sin_incisos: 'No tiene incisos.',
    inciso_sin_puntaje: 'Tiene incisos sin un puntaje mayor que 0.',
    puntaje_no_finito: 'El puntaje no es un número válido.',
};

const RUTA_PASO: Record<number, (id: number) => string> = {
    1: ROUTES.docente.evaluacionEditar,
    2: ROUTES.docente.evaluacionPreguntas,
    3: ROUTES.docente.evaluacionConfiguracion,
    4: ROUTES.docente.evaluacionAsignacion,
};

const BOTON_PRIMARIO =
    'inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60';

const BOTON_SECUNDARIO =
    'inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600';

function FilaResumen({
    etiqueta,
    valor,
}: {
    etiqueta: string;
    valor: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-slate-100 py-2.5 first:border-t-0 first:pt-0 last:pb-0">
            <dt className="text-sm text-slate-500">{etiqueta}</dt>
            <dd className="text-right text-sm font-medium text-slate-900">{valor}</dd>
        </div>
    );
}

function EnlaceEditar({ href }: { href: string }) {
    return (
        <Link
            href={href}
            className="rounded text-xs font-medium text-violet-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
            Editar
        </Link>
    );
}

function Contenido({ datos }: { datos: ResumenEvaluacion }) {
    const router = useRouter();
    
    const [mostrarTodos, setMostrarTodos] = useState(false);
    const [publicando, setPublicando] = useState(false);
    const [error, setError] = useState('');
    const [problemas, setProblemas] = useState<ProblemaPublicacion[]>([]);
    const [publicandoRespuestas, setPublicandoRespuestas] = useState(false);
    const [errorRespuestas, setErrorRespuestas] = useState('');
    const [respuestasPublicadasEn, setRespuestasPublicadasEn] = useState(
        datos.resultados_publicados_en,
    );

    const examenId = datos.examen_id;

    const estudiantesVisibles = mostrarTodos
        ? datos.estudiantes_asignados
        : datos.estudiantes_asignados.slice(0, MAX_CHIPS);
    const publicada = datos.estado === 'publicado';
    const respuestasPublicadas = respuestasPublicadasEn !== null;
    const totalCriterios = datos.criterios.reduce(
        (suma, criterio) => suma + criterio.cantidad,
        0,
    );
    const puntajes = datos.puntajes;
    const esAleatorio = datos.modo_seleccion === 'aleatorio';
    const etiquetaPuntajeTotal = esAleatorio
        ? publicada
            ? 'Puntaje máximo total'
            : 'Puntaje máximo garantizado'
        : 'Puntaje total';
    const valorPuntajeTotal =
        puntajes.disponible && puntajes.puntaje_total !== null
            ? `${formatearPuntos(puntajes.puntaje_total)} pts`
            : puntajes.motivo === 'sin_instantanea'
                ? 'Sin instantánea'
                : puntajes.motivo === 'instantanea_invalida'
                    ? 'Instantánea inválida'
                    : 'No se puede garantizar';
    async function publicar() {
        setError('');
        setProblemas([]);
        setPublicando(true);

        try {
            await evaluacionesService.publicar(examenId);
            router.push(ROUTES.docente.evaluaciones);
        } catch (e) {
            setProblemas(problemasDeError(e));
            setError(
                mensajeDeError(
                    e,
                    'No se pudo publicar la evaluación. Inténtalo de nuevo.',
                ),
            );
            setPublicando(false);
        }
    }

    async function publicarRespuestas() {
        setErrorRespuestas('');
        setPublicandoRespuestas(true);

        try {
            const resultado =
                await evaluacionesService.publicarRespuestas(examenId);
            setRespuestasPublicadasEn(resultado.resultados_publicados_en);
        } catch (e) {
            setErrorRespuestas(
                mensajeDeError(
                    e,
                    'No se pudieron publicar las respuestas. Inténtalo de nuevo.',
                ),
            );
        } finally {
            setPublicandoRespuestas(false);
        }
    }

    return (
        <section className="space-y-5">
            <header>
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">
                        Resumen de la evaluación
                    </h2>
                    {publicada && <Badge tono="violet">Publicada</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                    Revisa toda la información antes de guardar o habilitar.
                </p>
            </header>

            {problemas.length > 0 && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    <p className="font-semibold">No se pudo publicar la evaluación.</p>

                    <ul className="mt-2 space-y-1.5">
                        {problemas.map((problema) => {
                            const ruta = RUTA_PASO[problema.paso];

                            return (
                                <li
                                    key={`${problema.paso}-${problema.mensaje}`}
                                    className="flex flex-wrap items-baseline gap-2"
                                >
                                    <span>{problema.mensaje}</span>
                                    {ruta && (
                                        <Link
                                            href={ruta(examenId)}
                                            className="font-medium text-violet-700 underline"
                                        >
                                            Ir al paso {problema.paso}
                                        </Link>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {error && problemas.length === 0 && (
                <p className="text-sm text-red-600" role="alert">
                    {error}
                </p>
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-4">
                    <SeccionConfiguracion
                        numero={1}
                        titulo="Información"
                        accion={
                            !publicada && (
                                <EnlaceEditar
                                    href={ROUTES.docente.evaluacionEditar(examenId)}
                                />
                            )
                        }
                    >
                        <dl>
                            <FilaResumen
                                etiqueta="Nombre"
                                valor={datos.titulo ?? 'Sin título'}
                            />
                            <FilaResumen
                                etiqueta="Materia"
                                valor={datos.materia?.nombre ?? '—'}
                            />
                            <FilaResumen
                                etiqueta="Periodo"
                                valor={datos.semestre.gestion}
                            />
                            <FilaResumen
                                etiqueta="Paralelos"
                                valor={
                                    datos.paralelos.length > 0
                                        ? datos.paralelos
                                            .map((paralelo) => paralelo.nombre_paralelo)
                                            .join(', ')
                                        : '—'
                                }
                            />
                        </dl>
                    </SeccionConfiguracion>

                    <SeccionConfiguracion
                        numero={2}
                        titulo="Preguntas"
                        accion={
                            !publicada && (
                                <EnlaceEditar
                                    href={ROUTES.docente.evaluacionPreguntas(examenId)}
                                />
                            )
                        }
                    >
                        <dl>
                            <FilaResumen
                                etiqueta="Modo de selección"
                                valor={
                                    datos.modo_seleccion === 'manual'
                                        ? 'Manual'
                                        : 'Aleatorio'
                                }
                            />
                            <FilaResumen
                                etiqueta="Cantidad de preguntas"
                                valor={`${datos.total_preguntas} ${datos.total_preguntas === 1
                                        ? 'pregunta'
                                        : 'preguntas'
                                    }`}
                            />
                            <FilaResumen
                                etiqueta={etiquetaPuntajeTotal}
                                valor={valorPuntajeTotal}
                            />
                            {puntajes.preguntas_sin_puntaje.length > 0 && (
                                <FilaResumen
                                    etiqueta="Preguntas sin puntaje"
                                    valor={`${puntajes.preguntas_sin_puntaje.length} ${puntajes.preguntas_sin_puntaje.length === 1
                                            ? 'pregunta'
                                            : 'preguntas'
                                        }`}
                                />
                            )}
                        </dl>
                    </SeccionConfiguracion>

                    <SeccionConfiguracion
                        numero={3}
                        titulo="Configuración"
                        accion={
                            !publicada && (
                                <EnlaceEditar
                                    href={ROUTES.docente.evaluacionConfiguracion(
                                        examenId,
                                    )}
                                />
                            )
                        }
                    >
                        <dl>
                            <FilaResumen
                                etiqueta="Orden"
                                valor={
                                    datos.orden_preguntas === 'definido'
                                        ? 'Definido'
                                        : 'Aleatorio'
                                }
                            />
                            <FilaResumen
                                etiqueta="Duración"
                                valor={
                                    datos.duracion_min === null
                                        ? '—'
                                        : formatearDuracion(datos.duracion_min)
                                }
                            />
                            <FilaResumen
                                etiqueta="Disponibilidad"
                                valor={`${formatearFechaHora(
                                    datos.disponible_desde,
                                )} → ${formatearFechaHora(datos.disponible_hasta)}`}
                            />
                            <FilaResumen
                                etiqueta="Resultados"
                                valor={
                                    datos.modo_entrega_nota === 'al_publicar'
                                        ? 'Después de revisión docente'
                                        : 'Automática cuando corresponda'
                                }
                            />
                            {publicada && (
                                <FilaResumen
                                    etiqueta="Respuestas correctas"
                                    valor={
                                        respuestasPublicadas
                                            ? `Publicadas el ${formatearFechaHora(
                                                respuestasPublicadasEn,
                                            )}`
                                            : 'Aún no publicadas'
                                    }
                                />
                            )}
                        </dl>
                    </SeccionConfiguracion>

                    <SeccionConfiguracion
                        numero={4}
                        titulo="Asignación"
                        accion={
                            !publicada && (
                                <EnlaceEditar
                                    href={ROUTES.docente.evaluacionAsignacion(
                                        examenId,
                                    )}
                                />
                            )
                        }
                    >
                        <dl>
                            <FilaResumen
                                etiqueta="Modalidad"
                                valor={
                                    datos.modo_asignacion === 'paralelos'
                                        ? 'Paralelos completos'
                                        : 'Estudiantes específicos'
                                }
                            />
                            <FilaResumen
                                etiqueta="Estudiantes asignados"
                                valor={`${datos.total_estudiantes} ${datos.total_estudiantes === 1
                                        ? 'estudiante'
                                        : 'estudiantes'
                                    }`}
                            />
                        </dl>
                    </SeccionConfiguracion>
                </div>

                <aside className="space-y-4">
                    {datos.modo_seleccion === 'aleatorio' && (
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                    Criterios aleatorios
                                </h3>
                                <span className="flex size-6 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white tabular-nums">
                                    {totalCriterios}
                                </span>
                            </div>

                            {datos.criterios.length === 0 ? (
                                <p className="mt-3 text-xs text-slate-500">
                                    Sin criterios definidos.
                                </p>
                            ) : (
                                <ul className="mt-3 space-y-2">
                                    {datos.criterios.map((criterio) => (
                                        <li
                                            key={criterio.tema_id}
                                            className="flex items-baseline justify-between gap-2 text-sm"
                                        >
                                            <span className="min-w-0 truncate text-slate-800">
                                                {criterio.nombre_tema}
                                            </span>
                                            <span className="text-xs whitespace-nowrap text-violet-700 tabular-nums">
                                                {criterio.cantidad} al azar
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}


                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Distribución de puntajes
                        </h3>

                        {puntajes.temas.length === 0 ? (
                            <p className="mt-3 text-xs text-slate-500">
                                {puntajes.motivo === 'sin_instantanea'
                                    ? 'No hay datos definitivos de la instantánea.'
                                    : 'No hay preguntas seleccionadas.'}
                            </p>
                        ) : (
                            <>
                                <ul className="mt-3 space-y-2">
                                    {puntajes.temas.map((tema) => (
                                        <li
                                            key={tema.tema_id}
                                            className="flex items-baseline justify-between gap-2 text-sm"
                                        >
                                            <span className="min-w-0 truncate text-slate-800">
                                                {tema.nombre_tema}
                                            </span>
                                            <span className="text-xs whitespace-nowrap text-violet-700 tabular-nums">
                                                {esAleatorio
                                                    ? `${tema.cantidad_seleccionada} de ${tema.cantidad_candidatas} preguntas`
                                                    : `${tema.cantidad_seleccionada} ${tema.cantidad_seleccionada === 1
                                                        ? 'pregunta'
                                                        : 'preguntas'
                                                    }`}
                                                {' · '}
                                                {tema.puntaje_maximo !== null &&
                                                tema.garantizado
                                                    ? `${formatearPuntos(tema.puntaje_maximo)} pts`
                                                    : 'Sin garantía'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                                    {etiquetaPuntajeTotal}:{' '}
                                    <strong className="text-slate-800">
                                        {valorPuntajeTotal}
                                    </strong>
                                </p>
                            </>
                        )}
                    </section>

                    {!puntajes.disponible && (
                        <section
                            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
                            role="alert"
                        >
                            <h3 className="text-xs font-semibold tracking-wider uppercase">
                                {puntajes.motivo === 'sin_instantanea'
                                    ? 'Sin instantánea'
                                    : 'No se puede garantizar el puntaje'}
                            </h3>
                            {puntajes.detalle && (
                                <p className="mt-2 text-xs">{puntajes.detalle}</p>
                            )}
                            {puntajes.temas.some((tema) => !tema.garantizado) && (
                                <ul className="mt-3 space-y-2">
                                    {puntajes.temas
                                        .filter((tema) => !tema.garantizado)
                                        .map((tema) => (
                                            <li
                                                key={tema.tema_id}
                                                className="rounded-lg bg-white/70 px-2.5 py-2 text-xs"
                                            >
                                                <span className="block font-medium text-slate-800">
                                                    {tema.nombre_tema}
                                                </span>
                                                {tema.detalle && (
                                                    <span className="mt-1 block text-amber-800">
                                                        {tema.detalle}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </section>
                    )}

                    {puntajes.preguntas_sin_puntaje.length > 0 && (
                        <section
                            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
                            role="alert"
                        >
                            <h3 className="text-xs font-semibold tracking-wider uppercase">
                                Preguntas sin puntaje válido
                            </h3>
                            <p className="mt-2 text-xs">
                                Corrige su puntaje antes de publicar. La
                                distribución no incluye estos puntos.
                            </p>
                            <ul className="mt-3 space-y-2">
                                {puntajes.preguntas_sin_puntaje.map((pregunta) => (
                                    <li
                                        key={pregunta.pregunta_id}
                                        className="rounded-lg bg-white/70 px-2.5 py-2 text-xs"
                                    >
                                        <span className="line-clamp-2 block text-slate-800">
                                            {pregunta.enunciado}
                                        </span>
                                        <span className="mt-1 block text-amber-800">
                                            {MOTIVO_SIN_PUNTAJE[pregunta.motivo] ??
                                                'El puntaje no es válido.'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}


                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Estudiantes asignados
                        </h3>

                        {datos.estudiantes_asignados.length === 0 ? (
                            <p className="mt-3 text-xs text-slate-500">
                                Ningún estudiante asignado.
                            </p>
                        ) : (
                            <>
                                <ul className="mt-3 flex flex-wrap gap-1.5">
                                    {estudiantesVisibles.map((estudiante) => (
                                        <li
                                            key={estudiante.estudiante_id}
                                            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                                        >
                                            {estudiante.nombre_completo}
                                        </li>
                                    ))}
                                </ul>

                                {datos.estudiantes_asignados.length > MAX_CHIPS && (
                                    <button
                                        type="button"
                                        onClick={() => setMostrarTodos((actual) => !actual)}
                                        aria-expanded={mostrarTodos}
                                        className="mt-3 text-xs font-medium text-violet-700 hover:underline focus-visible:outline-2 focus-visible:outline-violet-600"
                                    >
                                        {mostrarTodos
                                            ? 'Ver menos'
                                            : `Ver todos (+${datos.estudiantes_asignados.length - MAX_CHIPS} más)`}
                                    </button>
                                )}
                            </>
                        )}
                    </section>


                    {publicada && (
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Respuestas correctas
                            </h3>

                            {respuestasPublicadas ? (
                                <p className="mt-3 text-xs text-slate-600">
                                    Los estudiantes ya pueden consultar las
                                    respuestas y explicaciones. Publicadas el{' '}
                                    {formatearFechaHora(respuestasPublicadasEn)}.
                                </p>
                            ) : (
                                <>
                                    <p className="mt-3 text-xs text-slate-600">
                                        Los estudiantes no verán las respuestas
                                        ni las explicaciones hasta que las
                                        publiques.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={publicarRespuestas}
                                        disabled={publicandoRespuestas}
                                        className={`${BOTON_PRIMARIO} mt-3 w-full`}
                                    >
                                        {publicandoRespuestas
                                            ? 'Publicando...'
                                            : 'Publicar respuestas'}
                                    </button>
                                </>
                            )}

                            {errorRespuestas && (
                                <p
                                    className="mt-2 text-xs text-red-600"
                                    role="alert"
                                >
                                    {errorRespuestas}
                                </p>
                            )}
                        </section>
                    )}
                </aside>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3">
                {!publicada && (
                    <LinkButton
                        href={ROUTES.docente.evaluacionAsignacion(examenId)}
                    >
                        ← Anterior
                    </LinkButton>
                )}

                <div className="ml-auto flex flex-wrap gap-2">
                    {publicada ? (
                        <LinkButton
                            href={ROUTES.docente.evaluaciones}
                            variante="primaria"
                        >
                            Volver a Mis evaluaciones
                        </LinkButton>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => router.push(ROUTES.docente.evaluaciones)}
                                className={BOTON_SECUNDARIO}
                            >
                                Guardar borrador
                            </button>

                            <button
                                type="button"
                                onClick={publicar}
                                disabled={publicando}
                                className={BOTON_PRIMARIO}
                            >
                                {publicando ? 'Publicando...' : 'Publicar / Habilitar'}
                            </button>
                        </>
                    )}
                </div>
            </footer>
        </section>
    );
}

export default function ResumenPublicacion({ examenId }: { examenId: number }) {
    const [datos, setDatos] = useState<ResumenEvaluacion | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let vigente = true;

        evaluacionesService
            .getResumen(examenId)
            .then((respuesta) => {
                if (vigente) setDatos(respuesta);
            })
            .catch((e) => {
                if (vigente) {
                    setError(
                        mensajeDeError(
                            e,
                            'No se pudo cargar el resumen de la evaluación.',
                        ),
                    );
                }
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });

        return () => {
            vigente = false;
        };
    }, [examenId]);

    if (cargando) {
        return (
            <p className="text-sm text-slate-500" aria-live="polite">
                Cargando resumen...
            </p>
        );
    }

    if (error || !datos) {
        return (
            <p className="text-sm text-red-600" role="alert">
                {error || 'No se pudo cargar el resumen de la evaluación.'}
            </p>
        );
    }

    return <Contenido datos={datos} />;
}
