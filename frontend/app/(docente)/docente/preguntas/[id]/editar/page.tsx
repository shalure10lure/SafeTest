'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';
import { materiasService } from '@/features/materias/services/materias.service';
import type { Materia } from '@/features/materias/types';
import Campo from '@/features/preguntas/components/Campo';
import { preguntasService } from '@/features/preguntas/services/preguntas.service';
import type {
    DificultadPregunta,
    Pregunta,
} from '@/features/preguntas/types';
import { temasService } from '@/features/temas/services/temas.service';
import type { Tema } from '@/features/temas/types';
import { cn } from '@/lib/utils';

const ENTRADA =
    'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const AREA =
    'w-full rounded-lg border bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600';

interface ErroresFormulario {
    enunciado?: string;
    materia?: string;
    tema?: string;
}

export default function EditarPreguntaPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const id = Number(params.id);

    const [pregunta, setPregunta] = useState<Pregunta | null>(null);
    const [materias, setMaterias] = useState<Materia[]>([]);
    const [temas, setTemas] = useState<Tema[]>([]);

    const [enunciado, setEnunciado] = useState('');
    const [materiaId, setMateriaId] = useState('');
    const [temaId, setTemaId] = useState('');
    const [dificultad, setDificultad] =
        useState<DificultadPregunta>('media');

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [errorCarga, setErrorCarga] = useState('');
    const [errorEnvio, setErrorEnvio] = useState('');
    const [errores, setErrores] = useState<ErroresFormulario>({});

    useEffect(() => {
        let vigente = true;

        async function cargarDatos() {
            if (!Number.isInteger(id) || id <= 0) {
                setErrorCarga(
                    'El identificador de la pregunta no es válido.',
                );
                setCargando(false);
                return;
            }

            try {
                const [datosPregunta, datosMaterias, datosTemas] =
                    await Promise.all([
                        preguntasService.getById(id),
                        materiasService.getAll(),
                        temasService.getAll(),
                    ]);

                if (!vigente) return;

                // La materia se deriva del tema (pregunta.tema_id).
                const materiaActual =
                    datosPregunta.materia?.materia_id ??
                    datosPregunta.tema?.materia?.materia_id ??
                    datosTemas.find(
                        (tema) =>
                            tema.tema_id === datosPregunta.tema_id,
                    )?.materia_id ??
                    '';

                setPregunta(datosPregunta);
                setMaterias(
                    datosMaterias.filter((materia) => materia.activo),
                );
                setTemas(datosTemas);
                setEnunciado(datosPregunta.enunciado);
                setDificultad(datosPregunta.dificultad ?? 'media');
                setMateriaId(String(materiaActual));
                setTemaId(String(datosPregunta.tema_id));
            } catch (error) {
                if (vigente) {
                    setErrorCarga(
                        mensajeDeError(
                            error,
                            'No se pudo cargar la pregunta o sus materias y temas.',
                        ),
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
    }, [id]);

    const temasDeMateria = useMemo(() => {
        if (!materiaId) return [];

        return temas.filter(
            (tema) => tema.materia_id === Number(materiaId),
        );
    }, [temas, materiaId]);

    function cambiarMateria(valor: string) {
        setMateriaId(valor);

        // El tema elegido deja de ser válido al cambiar de materia.
        const temaPertenece = temas.some(
            (tema) =>
                String(tema.tema_id) === temaId &&
                String(tema.materia_id) === valor,
        );

        if (!temaPertenece) setTemaId('');

        setErrores((previos) => ({
            ...previos,
            materia: undefined,
            tema: undefined,
        }));
    }

    async function guardar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setErrorEnvio('');

        const nuevosErrores: ErroresFormulario = {};

        if (!enunciado.trim()) {
            nuevosErrores.enunciado =
                'Escribe el enunciado de la pregunta.';
        }

        if (!materiaId) {
            nuevosErrores.materia = 'Selecciona una materia.';
        }

        if (!temaId) {
            nuevosErrores.tema = 'Selecciona un tema.';
        }

        setErrores(nuevosErrores);

        if (Object.keys(nuevosErrores).length > 0) return;

        try {
            setGuardando(true);

            // Se envían materia y tema para validar la coherencia en el
            // backend; si no cambiaron, la clasificación se conserva.
            await preguntasService.update(id, {
                enunciado: enunciado.trim(),
                materia_id: Number(materiaId),
                tema_id: Number(temaId),
                dificultad,
            });

            router.push(ROUTES.docente.preguntas);
            router.refresh();
        } catch (error) {
            setErrorEnvio(
                mensajeDeError(
                    error,
                    'No se pudieron guardar los cambios. Verifica los datos e inténtalo de nuevo.',
                ),
            );
        } finally {
            setGuardando(false);
        }
    }

    if (cargando) {
        return (
            <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
                <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    Cargando pregunta...
                </p>
            </main>
        );
    }

    if (!pregunta) {
        return (
            <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
                <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {errorCarga || 'No se encontró la pregunta.'}
                </p>

                <Link
                    href={ROUTES.docente.preguntas}
                    className="text-sm font-medium text-violet-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                >
                    ← Volver al banco de preguntas
                </Link>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
            <div>
                <Link
                    href={ROUTES.docente.preguntas}
                    className="text-sm font-medium text-violet-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                >
                    ← Volver al banco de preguntas
                </Link>

                <h1 className="mt-3 text-2xl font-bold text-slate-900">
                    Editar pregunta
                </h1>

                <p className="mt-1 text-sm text-slate-600">
                    Modifica el enunciado, la clasificación por materia y
                    tema, o la dificultad.
                </p>
            </div>

            {errorCarga && (
                <p
                    role="alert"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                >
                    {errorCarga}
                </p>
            )}

            {errorEnvio && (
                <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {errorEnvio}
                </p>
            )}

            <form
                onSubmit={guardar}
                noValidate
                className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
                <Campo
                    id="enunciado"
                    etiqueta="Enunciado"
                    error={errores.enunciado}
                >
                    <textarea
                        id="enunciado"
                        value={enunciado}
                        onChange={(evento) => {
                            setEnunciado(evento.target.value);
                            setErrores((previos) => ({
                                ...previos,
                                enunciado: undefined,
                            }));
                        }}
                        rows={5}
                        aria-invalid={Boolean(errores.enunciado)}
                        aria-describedby={
                            errores.enunciado
                                ? 'enunciado-descripcion'
                                : undefined
                        }
                        className={cn(
                            AREA,
                            errores.enunciado
                                ? 'border-red-300'
                                : 'border-slate-200',
                        )}
                        placeholder="Escribe el enunciado de la pregunta"
                    />
                </Campo>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo
                        id="materia"
                        etiqueta="Materia"
                        error={errores.materia}
                    >
                        <select
                            id="materia"
                            value={materiaId}
                            onChange={(evento) =>
                                cambiarMateria(evento.target.value)
                            }
                            disabled={materias.length === 0}
                            aria-invalid={Boolean(errores.materia)}
                            aria-describedby={
                                errores.materia
                                    ? 'materia-descripcion'
                                    : undefined
                            }
                            className={cn(
                                ENTRADA,
                                errores.materia
                                    ? 'border-red-300'
                                    : 'border-slate-200',
                            )}
                        >
                            <option value="">
                                {materias.length === 0
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
                    </Campo>

                    <Campo
                        id="tema"
                        etiqueta="Tema"
                        error={errores.tema}
                        ayuda={
                            !materiaId
                                ? 'Selecciona una materia para ver sus temas.'
                                : temasDeMateria.length === 0
                                  ? 'Esta materia no tiene temas. Crea uno en Mis temas.'
                                  : undefined
                        }
                    >
                        <select
                            id="tema"
                            value={temaId}
                            onChange={(evento) => {
                                setTemaId(evento.target.value);
                                setErrores((previos) => ({
                                    ...previos,
                                    tema: undefined,
                                }));
                            }}
                            disabled={!materiaId || temasDeMateria.length === 0}
                            aria-invalid={Boolean(errores.tema)}
                            aria-describedby={
                                errores.tema ||
                                !materiaId ||
                                temasDeMateria.length === 0
                                    ? 'tema-descripcion'
                                    : undefined
                            }
                            className={cn(
                                ENTRADA,
                                errores.tema
                                    ? 'border-red-300'
                                    : 'border-slate-200',
                            )}
                        >
                            <option value="">
                                {!materiaId
                                    ? 'Primero elige una materia'
                                    : temasDeMateria.length === 0
                                      ? 'Sin temas'
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
                    </Campo>
                </div>

                <Campo id="dificultad" etiqueta="Dificultad">
                    <select
                        id="dificultad"
                        value={dificultad}
                        onChange={(evento) =>
                            setDificultad(
                                evento.target.value as DificultadPregunta,
                            )
                        }
                        className={cn(ENTRADA, 'border-slate-200')}
                    >
                        <option value="facil">Fácil</option>
                        <option value="media">Media</option>
                        <option value="dificil">Difícil</option>
                    </select>
                </Campo>

                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                    <button
                        type="submit"
                        disabled={guardando}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {guardando ? 'Guardando...' : 'Guardar cambios'}
                    </button>

                    <Link
                        href={ROUTES.docente.preguntas}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                        Cancelar
                    </Link>
                </div>
            </form>
        </main>
    );
}
