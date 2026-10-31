'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/Card';
import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';

import { formatearDuracion, formatearFechaHora } from '../configuracion';
import { mensajeDeError, problemasDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type { ProblemaPublicacion, ResumenEvaluacion } from '../types';
import SeccionConfiguracion from './SeccionConfiguracion';

/** Cuántos nombres se muestran antes de resumir con "+N más". */
const MAX_CHIPS = 8;

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

    const [publicando, setPublicando] = useState(false);
    const [error, setError] = useState('');
    const [problemas, setProblemas] = useState<ProblemaPublicacion[]>([]);

    const examenId = datos.examen_id;
    const publicada = datos.estado === 'publicado';
    const totalCriterios = datos.criterios.reduce(
        (suma, criterio) => suma + criterio.cantidad,
        0,
    );

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
                                valor={`${datos.total_preguntas} ${
                                    datos.total_preguntas === 1
                                        ? 'pregunta'
                                        : 'preguntas'
                                }`}
                            />
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
                                valor={`${datos.total_estudiantes} ${
                                    datos.total_estudiantes === 1
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
                            Estudiantes asignados
                        </h3>

                        {datos.estudiantes_asignados.length === 0 ? (
                            <p className="mt-3 text-xs text-slate-500">
                                Ningún estudiante asignado.
                            </p>
                        ) : (
                            <ul className="mt-3 flex flex-wrap gap-1.5">
                                {datos.estudiantes_asignados
                                    .slice(0, MAX_CHIPS)
                                    .map((estudiante) => (
                                        <li
                                            key={estudiante.estudiante_id}
                                            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                                        >
                                            {estudiante.nombre_completo}
                                        </li>
                                    ))}

                                {datos.estudiantes_asignados.length > MAX_CHIPS && (
                                    <li className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                        +{datos.estudiantes_asignados.length - MAX_CHIPS}{' '}
                                        más
                                    </li>
                                )}
                            </ul>
                        )}
                    </section>
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
