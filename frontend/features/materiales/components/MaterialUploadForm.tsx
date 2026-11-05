'use client';

import {
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react';
import Link from 'next/link';
import {
    AlertCircle,
    CheckCircle2,
    FileUp,
    Loader2,
    Upload,
} from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';
import { useMaterias } from '@/features/materias/hooks/useMaterias';
import { useTemas } from '@/features/temas/hooks/useTemas';
import { cn } from '@/lib/utils';

import {
    ACCEPT_ARCHIVO,
    EXTENSIONES_PERMITIDAS,
    MAX_BYTES,
    formatearTamano,
    formatoDeArchivo,
    validarArchivo,
} from '../formato';
import { materialesService } from '../services/materiales.service';
import type { Material } from '../types';

interface ErroresFormulario {
    archivo?: string;
    titulo?: string;
    materia?: string;
}

const CONTROL =
    'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const BOTON_PRIMARIO =
    'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60';

export default function MaterialUploadForm() {
    const {
        materias,
        isLoading: cargandoMaterias,
        error: errorMaterias,
    } = useMaterias();
    const {
        temas,
        isLoading: cargandoTemas,
        error: errorTemas,
    } = useTemas();

    const inputArchivo = useRef<HTMLInputElement>(null);

    const [archivo, setArchivo] = useState<File | null>(null);
    const [titulo, setTitulo] = useState('');
    const [materiaId, setMateriaId] = useState('');
    const [temaId, setTemaId] = useState('');
    const [errores, setErrores] = useState<ErroresFormulario>({});
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [creado, setCreado] = useState<Material | null>(null);

    const materiasActivas = useMemo(
        () => materias.filter((materia) => materia.activo),
        [materias],
    );

    const temasDeMateria = useMemo(
        () =>
            materiaId
                ? temas.filter(
                      (tema) => String(tema.materia_id) === materiaId,
                  )
                : [],
        [temas, materiaId],
    );

    const errorDatos = errorMaterias ?? errorTemas;

    function seleccionarArchivo(evento: ChangeEvent<HTMLInputElement>) {
        const seleccionado = evento.target.files?.[0] ?? null;

        if (!seleccionado) {
            setArchivo(null);
            return;
        }

        const error = validarArchivo(seleccionado);

        if (error) {
            setArchivo(null);
            setErrores((previos) => ({ ...previos, archivo: error }));
            evento.target.value = '';
            return;
        }

        setArchivo(seleccionado);
        setErrores((previos) => ({ ...previos, archivo: undefined }));

        if (!titulo.trim()) {
            setTitulo(
                seleccionado.name.replace(/\.[^.]+$/, '').slice(0, 200),
            );
        }
    }

    function cambiarMateria(valor: string) {
        setMateriaId(valor);
        setTemaId('');
        setErrores((previos) => ({ ...previos, materia: undefined }));
    }

    async function enviar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();

        const nuevosErrores: ErroresFormulario = {};

        if (!archivo) {
            nuevosErrores.archivo =
                'Selecciona un archivo PDF, TXT o DOCX.';
        } else {
            const errorArchivo = validarArchivo(archivo);

            if (errorArchivo) nuevosErrores.archivo = errorArchivo;
        }

        if (!titulo.trim()) {
            nuevosErrores.titulo = 'El título es obligatorio.';
        } else if (titulo.trim().length > 200) {
            nuevosErrores.titulo =
                'El título no puede superar 200 caracteres.';
        }

        if (!materiaId) {
            nuevosErrores.materia =
                'Selecciona la materia a la que pertenece el material.';
        }

        setErrores(nuevosErrores);

        if (Object.keys(nuevosErrores).length > 0 || !archivo) return;

        try {
            setEnviando(true);
            setErrorGeneral(null);

            const material = await materialesService.crear({
                archivo,
                titulo: titulo.trim(),
                materia_id: Number(materiaId),
                tema_id: temaId ? Number(temaId) : undefined,
            });

            setCreado(material);
        } catch (err) {
            setErrorGeneral(
                mensajeDeError(
                    err,
                    'No se pudo cargar el material. Intenta de nuevo.',
                ),
            );
        } finally {
            setEnviando(false);
        }
    }

    function cargarOtro() {
        setCreado(null);
        setArchivo(null);
        setTitulo('');
        setMateriaId('');
        setTemaId('');
        setErrores({});
        setErrorGeneral(null);

        if (inputArchivo.current) inputArchivo.current.value = '';
    }

    if (creado) {
        return (
            <section
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-6"
                role="status"
            >
                <div className="flex items-start gap-3">
                    <CheckCircle2
                        className="mt-0.5 size-5 shrink-0 text-emerald-600"
                        aria-hidden="true"
                    />

                    <div className="min-w-0">
                        <h2 className="font-semibold text-emerald-900">
                            Material cargado correctamente
                        </h2>

                        <p className="mt-1 text-sm text-emerald-800">
                            «{creado.titulo}» quedó registrado en{' '}
                            {creado.materia ?? 'tu materia'}.
                        </p>

                        <p className="mt-1 text-sm text-emerald-800">
                            Texto extraído:{' '}
                            {creado.estado_extraccion.caracteres.toLocaleString(
                                'es-EC',
                            )}{' '}
                            caracteres. La autorización para IA permanece
                            desactivada hasta que la actives manualmente.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                                href={ROUTES.docente.materialDetalle(
                                    creado.material_id,
                                )}
                                className={BOTON_PRIMARIO}
                            >
                                Ver detalle
                            </Link>

                            <button
                                type="button"
                                onClick={cargarOtro}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                            >
                                <Upload className="size-4" aria-hidden="true" />
                                Cargar otro material
                            </button>

                            <Link
                                href={ROUTES.docente.materiales}
                                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                            >
                                Volver a materiales
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <form
            onSubmit={enviar}
            noValidate
            className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
            {errorDatos && (
                <p
                    role="alert"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                >
                    {errorDatos}
                </p>
            )}

            {errorGeneral && (
                <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    <AlertCircle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <p>{errorGeneral}</p>
                </div>
            )}

            {/* Archivo */}
            <div>
                <label
                    htmlFor="material-archivo"
                    className="mb-1.5 block text-sm font-medium text-slate-800"
                >
                    Archivo del material
                </label>

                <label
                    htmlFor="material-archivo"
                    className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-violet-400 hover:bg-violet-50/40',
                        errores.archivo && 'border-red-300 bg-red-50/40',
                    )}
                >
                    <FileUp
                        className="size-7 text-violet-600"
                        aria-hidden="true"
                    />

                    {archivo ? (
                        <>
                            <span className="max-w-full truncate font-medium text-slate-900">
                                {archivo.name}
                            </span>
                            <span className="text-xs text-slate-500">
                                {formatearTamano(archivo.size)} · Haz clic para
                                cambiar el archivo
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="font-medium text-slate-900">
                                Haz clic para seleccionar un archivo
                            </span>
                            <span className="text-xs text-slate-500">
                                Formatos permitidos: {EXTENSIONES_PERMITIDAS} ·
                                Máximo {formatearTamano(MAX_BYTES)}
                            </span>
                        </>
                    )}

                    <input
                        ref={inputArchivo}
                        id="material-archivo"
                        type="file"
                        accept={ACCEPT_ARCHIVO}
                        onChange={seleccionarArchivo}
                        disabled={enviando}
                        className="sr-only"
                        aria-describedby={
                            errores.archivo ? 'error-material-archivo' : undefined
                        }
                    />
                </label>

                {errores.archivo ? (
                    <p
                        id="error-material-archivo"
                        role="alert"
                        className="mt-1.5 text-sm text-red-600"
                    >
                        {errores.archivo}
                    </p>
                ) : (
                    archivo && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-emerald-700">
                            <CheckCircle2
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                            Formato{' '}
                            {formatoDeArchivo(archivo.name, archivo.type) ??
                                'válido'}{' '}
                            · {formatearTamano(archivo.size)} — listo para
                            subir
                        </p>
                    )
                )}
            </div>

            {/* Título */}
            <div>
                <label
                    htmlFor="material-titulo"
                    className="mb-1.5 block text-sm font-medium text-slate-800"
                >
                    Título
                </label>

                <input
                    id="material-titulo"
                    type="text"
                    value={titulo}
                    onChange={(evento) => {
                        setTitulo(evento.target.value);
                        setErrores((previos) => ({
                            ...previos,
                            titulo: undefined,
                        }));
                    }}
                    maxLength={200}
                    placeholder="Ej. Apuntes de la unidad 1"
                    disabled={enviando}
                    className={CONTROL}
                    aria-invalid={Boolean(errores.titulo)}
                    aria-describedby={
                        errores.titulo ? 'error-material-titulo' : undefined
                    }
                />

                <div className="mt-1 flex items-start justify-between gap-3">
                    {errores.titulo ? (
                        <p
                            id="error-material-titulo"
                            role="alert"
                            className="text-sm text-red-600"
                        >
                            {errores.titulo}
                        </p>
                    ) : (
                        <span className="text-xs text-slate-500">
                            Nombre con el que identificarás el material.
                        </span>
                    )}

                    <span className="shrink-0 text-xs text-slate-400">
                        {titulo.length}/200
                    </span>
                </div>
            </div>

            {/* Materia y tema */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="material-materia"
                        className="mb-1.5 block text-sm font-medium text-slate-800"
                    >
                        Materia
                    </label>

                    <select
                        id="material-materia"
                        value={materiaId}
                        onChange={(evento) =>
                            cambiarMateria(evento.target.value)
                        }
                        disabled={enviando || cargandoMaterias}
                        className={CONTROL}
                        aria-invalid={Boolean(errores.materia)}
                        aria-describedby={
                            errores.materia
                                ? 'error-material-materia'
                                : undefined
                        }
                    >
                        <option value="">
                            {cargandoMaterias
                                ? 'Cargando materias...'
                                : 'Selecciona una materia'}
                        </option>

                        {materiasActivas.map((materia) => (
                            <option
                                key={materia.materia_id}
                                value={materia.materia_id}
                            >
                                {materia.nombre}
                            </option>
                        ))}
                    </select>

                    {errores.materia && (
                        <p
                            id="error-material-materia"
                            role="alert"
                            className="mt-1.5 text-sm text-red-600"
                        >
                            {errores.materia}
                        </p>
                    )}

                    {!cargandoMaterias && materiasActivas.length === 0 && (
                        <p className="mt-1.5 text-xs text-amber-700">
                            No tienes materias activas. Crea una materia antes de
                            subir materiales.
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="material-tema"
                        className="mb-1.5 block text-sm font-medium text-slate-800"
                    >
                        Tema{' '}
                        <span className="font-normal text-slate-500">
                            (opcional)
                        </span>
                    </label>

                    <select
                        id="material-tema"
                        value={temaId}
                        onChange={(evento) => setTemaId(evento.target.value)}
                        disabled={
                            enviando ||
                            cargandoTemas ||
                            !materiaId ||
                            temasDeMateria.length === 0
                        }
                        className={CONTROL}
                    >
                        <option value="">
                            {!materiaId
                                ? 'Selecciona primero una materia'
                                : cargandoTemas
                                  ? 'Cargando temas...'
                                  : temasDeMateria.length === 0
                                    ? 'Sin temas registrados'
                                    : 'Sin tema específico'}
                        </option>

                        {temasDeMateria.map((tema) => (
                            <option key={tema.tema_id} value={tema.tema_id}>
                                {tema.nombre_tema}
                            </option>
                        ))}
                    </select>

                    <p className="mt-1.5 text-xs text-slate-500">
                        Asociar un tema ayuda a clasificar las preguntas
                        generadas.
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <Link
                    href={ROUTES.docente.materiales}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                >
                    Cancelar
                </Link>

                <button
                    type="submit"
                    disabled={enviando}
                    className={BOTON_PRIMARIO}
                >
                    {enviando ? (
                        <>
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                            Procesando archivo...
                        </>
                    ) : (
                        <>
                            <Upload className="size-4" aria-hidden="true" />
                            Subir material
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
