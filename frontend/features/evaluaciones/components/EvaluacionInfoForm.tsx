'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mensajeDeError } from '../mensaje-error';

import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';
import { useParalelos } from '@/features/paralelos/hooks/useParalelos';
import { usePeriodos } from '@/features/periodos/hooks/usePeriodos';
import { cn } from '@/lib/utils';

import { evaluacionesService } from '../services/evaluaciones.service';

const ENTRADA =
    'w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

function contarPalabras(texto: string): number {
    const limpio = texto.trim();
    return limpio ? limpio.split(/\s+/).length : 0;
}



function Campo({
    id,
    etiqueta,
    opcional,
    ayuda,
    error,
    children,
}: {
    id: string;
    etiqueta: string;
    opcional?: boolean;
    ayuda?: ReactNode;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-semibold text-slate-900"
            >
                {etiqueta}
                {opcional && (
                    <span className="ml-1 font-normal text-slate-400">(opcional)</span>
                )}
            </label>

            {children}

            {error ? (
                <p id={`${id}-descripcion`} role="alert" className="mt-1.5 text-xs text-red-600">
                    {error}
                </p>
            ) : ayuda ? (
                <p id={`${id}-descripcion`} className="mt-1.5 text-xs text-slate-500">
                    {ayuda}
                </p>
            ) : null}
        </div>
    );
}

export default function EvaluacionInfoForm() {
    const router = useRouter();

    const {
        periodos,
        isLoading: cargandoPeriodos,
        error: errorPeriodos,
    } = usePeriodos();

    const {
        paralelos,
        cargando: cargandoParalelos,
        error: errorParalelos,
    } = useParalelos();

    const [titulo, setTitulo] = useState('');
    const [periodoElegido, setPeriodoElegido] = useState<number | null>(null);
    const [materiaId, setMateriaId] = useState<number | null>(null);
    const [paraleloId, setParaleloId] = useState<number | null>(null);
    const [instrucciones, setInstrucciones] = useState('');

    const [intentoGuardar, setIntentoGuardar] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState('');

    // El periodo arranca en el vigente (o el primero) hasta que el docente elija otro.
    const periodoVigente = periodos.find((p) => p.activo) ?? periodos[0];
    const periodoId = periodoElegido ?? periodoVigente?.semestre_id ?? null;
    const periodo = periodos.find((p) => p.semestre_id === periodoId);

    const materias = periodo?.materias ?? [];
    const paralelosDisponibles = paralelos.filter(
        (p) => p.materia_id === materiaId && p.semestre_id === periodoId,
    );

    const errores = {
        titulo: titulo.trim() ? '' : 'Escribe el nombre de la evaluación.',
        materia: materiaId ? '' : 'Selecciona una materia.',
        paralelo: paraleloId ? '' : 'Selecciona un paralelo.',
    };
    const hayErrores = Object.values(errores).some(Boolean);

    // Los errores solo se muestran después del primer intento de guardar.
    const mostrar = (mensaje: string) => (intentoGuardar ? mensaje : '');

    const palabras = contarPalabras(instrucciones);

    function alCambiarPeriodo(valor: string) {
        setPeriodoElegido(Number(valor) || null);
        setMateriaId(null);
        setParaleloId(null);
    }

    function alCambiarMateria(valor: string) {
        setMateriaId(Number(valor) || null);
        setParaleloId(null);
    }

    async function guardar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setIntentoGuardar(true);
        setErrorEnvio('');

        if (hayErrores || periodoId === null || materiaId === null || paraleloId === null) {
            return;
        }

        setEnviando(true);

        try {
            const creada = await evaluacionesService.create({
                titulo: titulo.trim(),
                materia_id: materiaId,
                semestre_id: periodoId,
                paralelo_id: paraleloId,
                instrucciones: instrucciones.trim() || undefined,
            });

            router.push(ROUTES.docente.evaluacionPreguntas(creada.examen_id));
        } catch (error) {
            setErrorEnvio(
                mensajeDeError(
                    error,
                    'No se pudo guardar la evaluación. Inténtalo de nuevo.',
                ),
            );
        }
    }

    const cargando = cargandoPeriodos || cargandoParalelos;
    const errorDatos = errorPeriodos || errorParalelos;
    const sinPeriodos = !cargandoPeriodos && !errorPeriodos && periodos.length === 0;

    return (
        <form onSubmit={guardar} noValidate>
            <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                {errorDatos && (
                    <p className="text-sm text-red-600" role="alert">
                        {errorDatos}
                    </p>
                )}

                {sinPeriodos && (
                    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        Aún no tienes periodos académicos.{' '}
                        <Link href={ROUTES.docente.periodos} className="font-medium underline">
                            Crea uno en Mis periodos
                        </Link>{' '}
                        para poder crear evaluaciones.
                    </p>
                )}

                <Campo id="titulo" etiqueta="Nombre de la evaluación" error={mostrar(errores.titulo)}>
                    <input
                        id="titulo"
                        type="text"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        maxLength={200}
                        placeholder="Ej. Parcial 1 — Programación lineal"
                        aria-invalid={Boolean(mostrar(errores.titulo))}
                        aria-describedby="titulo-descripcion"
                        className={cn(ENTRADA, 'h-10', mostrar(errores.titulo) ? 'border-red-400' : 'border-slate-200')}
                    />
                </Campo>

                <div className="grid gap-5 sm:grid-cols-2">
                    <Campo id="materia" etiqueta="Materia" error={mostrar(errores.materia)}>
                        <select
                            id="materia"
                            value={materiaId ?? ''}
                            onChange={(e) => alCambiarMateria(e.target.value)}
                            disabled={cargando || materias.length === 0}
                            aria-invalid={Boolean(mostrar(errores.materia))}
                            aria-describedby="materia-descripcion"
                            className={cn(ENTRADA, 'h-10', mostrar(errores.materia) ? 'border-red-400' : 'border-slate-200')}
                        >
                            <option value="">
                                {materias.length === 0 && !cargando
                                    ? 'Este periodo no tiene materias'
                                    : 'Selecciona una materia'}
                            </option>
                            {materias.map((materia) => (
                                <option key={materia.materia_id} value={materia.materia_id}>
                                    {materia.nombre}
                                </option>
                            ))}
                        </select>
                    </Campo>

                    <Campo id="periodo" etiqueta="Periodo académico">
                        <select
                            id="periodo"
                            value={periodoId ?? ''}
                            onChange={(e) => alCambiarPeriodo(e.target.value)}
                            disabled={cargando || periodos.length === 0}
                            className={cn(ENTRADA, 'h-10 border-slate-200')}
                        >
                            {periodos.length === 0 && <option value="">Sin periodos</option>}
                            {periodos.map((p) => (
                                <option key={p.semestre_id} value={p.semestre_id}>
                                    {p.gestion}
                                    {p.activo ? ' (vigente)' : ''}
                                </option>
                            ))}
                        </select>
                    </Campo>
                </div>

                <Campo
                    id="paralelo"
                    etiqueta="Paralelo o contexto"
                    error={mostrar(errores.paralelo)}
                    ayuda="Podrás asignar más paralelos o estudiantes específicos en el paso 4."
                >
                    <select
                        id="paralelo"
                        value={paraleloId ?? ''}
                        onChange={(e) => setParaleloId(Number(e.target.value) || null)}
                        disabled={cargando || materiaId === null || paralelosDisponibles.length === 0}
                        aria-invalid={Boolean(mostrar(errores.paralelo))}
                        aria-describedby="paralelo-descripcion"
                        className={cn(ENTRADA, 'h-10', mostrar(errores.paralelo) ? 'border-red-400' : 'border-slate-200')}
                    >
                        <option value="">
                            {materiaId === null
                                ? 'Primero elige una materia'
                                : paralelosDisponibles.length === 0
                                    ? 'Esta materia no tiene paralelos en este periodo'
                                    : 'Selecciona un paralelo'}
                        </option>
                        {paralelosDisponibles.map((paralelo) => (
                            <option key={paralelo.paralelo_id} value={paralelo.paralelo_id}>
                                {paralelo.nombre_paralelo}
                            </option>
                        ))}
                    </select>
                </Campo>

                <Campo
                    id="instrucciones"
                    etiqueta="Instrucciones"
                    opcional
                    ayuda={`${palabras} ${palabras === 1 ? 'palabra' : 'palabras'}`}
                >
                    <textarea
                        id="instrucciones"
                        value={instrucciones}
                        onChange={(e) => setInstrucciones(e.target.value)}
                        maxLength={5000}
                        rows={5}
                        placeholder="Indica a los estudiantes cómo deben responder, qué materiales pueden usar, etc."
                        aria-describedby="instrucciones-descripcion"
                        className={cn(ENTRADA, 'min-h-32 resize-y border-slate-200 py-2.5')}
                    />
                </Campo>
            </div>

            {errorEnvio && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                    {errorEnvio}
                </p>
            )}

            <div className="mt-5 flex items-center justify-between">
                <LinkButton href={ROUTES.docente.evaluaciones}>Cancelar</LinkButton>

                <input
                    type="submit"
                    disabled={enviando}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                    value={enviando ? 'Guardando...' : 'Siguiente →'}
                />
            </div>
        </form>
    );
}