'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Sparkles } from 'lucide-react';

import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';
import { useMateriales } from '@/features/materiales/hooks/useMateriales';
import { useMaterias } from '@/features/materias/hooks/useMaterias';
import Campo from '@/features/preguntas/components/Campo';
import { TIPOS_PREGUNTA_FORMULARIO } from '@/features/preguntas/tipos';
import type {
    DificultadPregunta,
    TipoRespuestaPregunta,
} from '@/features/preguntas/types';
import { useTemas } from '@/features/temas/hooks/useTemas';
import { cn } from '@/lib/utils';

import { esMaterialSeleccionableParaIa } from '../elegibilidad';
import {
    ETIQUETAS_DIFICULTAD,
    etiquetaTipo,
} from '../etiquetas';
import { useGeneracionIa } from '../hooks/useGeneracionIa';
import {
    construirDtoIa,
    MAX_MATERIALES_CONTEXTO,
    validarFormularioIa,
} from '../validacion';
import EstadoGeneracionPanel from './EstadoGeneracionPanel';
import ResumenConfiguracionIa from './ResumenConfiguracionIa';
import SelectorMaterialesIa from './SelectorMaterialesIa';

const ENTRADA =
    'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export default function GeneracionIaForm() {
    const {
        materias,
        isLoading: cargandoMaterias,
        error: errorMaterias,
        refetch: recargarMaterias,
    } = useMaterias();
    const {
        temas,
        isLoading: cargandoTemas,
        error: errorTemas,
        refetch: recargarTemas,
    } = useTemas();
    const {
        materiales,
        isLoading: cargandoMateriales,
        error: errorCargaMateriales,
        cargar: recargarMateriales,
    } = useMateriales();

    const [materiaId, setMateriaId] = useState('');
    const [temaId, setTemaId] = useState('');
    const [tipo, setTipo] = useState<TipoRespuestaPregunta>('opcion_unica');
    const [cantidad, setCantidad] = useState('10');
    const [dificultad, setDificultad] = useState<DificultadPregunta | ''>('');
    const [materialIds, setMaterialIds] = useState<number[]>([]);
    const [tocados, setTocados] = useState<Record<string, boolean>>({});

    const {
        creacion,
        generacion,
        enviando,
        consultando,
        siguiendo,
        limiteAlcanzado,
        errorEnvio,
        errorSeguimiento,
        crear,
        refrescar,
        reiniciar,
    } = useGeneracionIa();

    const materiasActivas = useMemo(
        () => materias.filter((materia) => materia.activo),
        [materias],
    );

    const temasDeMateria = useMemo(() => {
        const id = Number(materiaId);

        if (!materiaId || !Number.isInteger(id)) return [];

        return temas.filter((tema) => tema.materia_id === id);
    }, [temas, materiaId]);

    const materialesSeleccionables = useMemo(
        () => materiales.filter(esMaterialSeleccionableParaIa),
        [materiales],
    );

    const materialesOrdenados = useMemo(() => {
        const materiaSeleccionada = Number(materiaId);

        return [...materiales].sort((a, b) => {
            const aEsDeMateria = a.materia_id === materiaSeleccionada;
            const bEsDeMateria = b.materia_id === materiaSeleccionada;

            if (aEsDeMateria !== bEsDeMateria) return aEsDeMateria ? -1 : 1;

            return a.titulo.localeCompare(b.titulo, 'es');
        });
    }, [materiales, materiaId]);

    // Un tema solo cuenta si sigue perteneciendo a la materia seleccionada.
    const temaIdValido = useMemo(() => {
        const id = Number(temaId);

        if (!temaId || !Number.isInteger(id)) return '';

        return temasDeMateria.some((tema) => tema.tema_id === id)
            ? temaId
            : '';
    }, [temaId, temasDeMateria]);

    // Si un material deja de ser autorizado o se recarga la lista, no se envía.
    const materialIdsSeleccionados = useMemo(() => {
        const seleccionables = new Set(
            materialesSeleccionables.map(
                (material) => material.material_id,
            ),
        );

        return materialIds.filter((id) => seleccionables.has(id));
    }, [materialIds, materialesSeleccionables]);

    const cargandoDatos = cargandoMaterias || cargandoTemas;
    const bloqueado = enviando || siguiendo;
    const refrescandoManual = consultando && !siguiendo;
    const puedeEnviar =
        !bloqueado &&
        !refrescandoManual &&
        !cargandoDatos &&
        materiasActivas.length > 0;

    const datosFormulario = {
        materiaId,
        temaId: temaIdValido,
        tipo,
        cantidad,
        dificultad,
        materialIds: materialIdsSeleccionados,
        temasDeMateria,
        materialesSeleccionables,
    };

    const { errores, hayErrores } = validarFormularioIa(datosFormulario);

    const materiaSeleccionada =
        materiasActivas.find(
            (materia) => materia.materia_id === Number(materiaId),
        )?.nombre ?? 'Sin seleccionar';
    const temaSeleccionado =
        temasDeMateria.find((tema) => tema.tema_id === Number(temaIdValido))
            ?.nombre_tema ?? 'Sin seleccionar';
    const tipoSeleccionado = tipo
        ? etiquetaTipo(tipo)
        : 'Sin seleccionar';
    const dificultadSeleccionada = dificultad
        ? ETIQUETAS_DIFICULTAD[dificultad]
        : 'Sin seleccionar';
    const cantidadResumen = cantidad.trim()
        ? `${cantidad} preguntas`
        : 'Sin definir';
    const materialesResumen = materialIdsSeleccionados.map((id) => {
        const material = materiales.find(
            (item) => item.material_id === id,
        );

        return {
            material_id: id,
            titulo: material?.titulo ?? `Material #${id}`,
        };
    });

    function mostrar(campo: string, mensaje?: string): string {
        return tocados[campo] && mensaje ? mensaje : '';
    }

    function marcarTocado(campo: string) {
        setTocados((previos) => ({ ...previos, [campo]: true }));
    }

    function cambiarMateria(valor: string) {
        setMateriaId(valor);
        setTemaId('');
        marcarTocado('materia');
    }

    function cambiarMateriales(ids: number[]) {
        setMaterialIds(ids);
        marcarTocado('materiales');
    }

    async function enviar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();

        setTocados({
            materia: true,
            tema: true,
            tipo: true,
            cantidad: true,
            dificultad: true,
            materiales: true,
        });

        if (hayErrores) return;

        await crear(construirDtoIa(datosFormulario));
    }

    const errorMateria = mostrar('materia', errores.materia);
    const errorTema = mostrar('tema', errores.tema);
    const errorTipo = mostrar('tipo', errores.tipo);
    const errorCantidad = mostrar('cantidad', errores.cantidad);
    const errorDificultad = mostrar('dificultad', errores.dificultad);
    const errorMateriales = mostrar('materiales', errores.materiales);

    return (
        <form onSubmit={enviar} noValidate className="space-y-5">
            <EstadoGeneracionPanel
                creacion={creacion}
                generacion={generacion}
                consultando={consultando}
                siguiendo={siguiendo}
                limiteAlcanzado={limiteAlcanzado}
                errorEnvio={errorEnvio}
                errorSeguimiento={errorSeguimiento}
                onRefrescar={() => void refrescar()}
                onReiniciar={reiniciar}
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
                <div className="space-y-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Configuración de la generación
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                                Elige una materia activa, uno de sus temas y el
                                formato de las preguntas que quieres obtener.
                            </p>
                        </div>

                        {(errorMaterias || errorTemas) && (
                            <div
                                role="alert"
                                className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                            >
                                <p>
                                    {[errorMaterias, errorTemas]
                                        .filter(Boolean)
                                        .join(' ')}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (errorMaterias) {
                                            void recargarMaterias();
                                        }
                                        if (errorTemas) {
                                            void recargarTemas();
                                        }
                                    }}
                                    className="inline-flex h-8 items-center rounded-lg border border-amber-300 bg-white px-3 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                                >
                                    Reintentar carga
                                </button>
                            </div>
                        )}

                        {Object.keys(tocados).length > 0 && hayErrores && (
                            <p
                                role="alert"
                                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                            >
                                Revisa los campos marcados antes de generar.
                            </p>
                        )}

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            <Campo
                                id="materia-ia"
                                etiqueta="Materia"
                                error={errorMateria}
                            >
                                <select
                                    id="materia-ia"
                                    name="materia"
                                    value={materiaId}
                                    onChange={(evento) =>
                                        cambiarMateria(evento.target.value)
                                    }
                                    disabled={
                                        cargandoMaterias ||
                                        bloqueado ||
                                        materiasActivas.length === 0
                                    }
                                    aria-invalid={Boolean(errorMateria)}
                                    aria-describedby={
                                        errorMateria
                                            ? 'materia-ia-descripcion'
                                            : undefined
                                    }
                                    className={cn(
                                        ENTRADA,
                                        errorMateria
                                            ? 'border-red-300'
                                            : 'border-slate-200',
                                    )}
                                >
                                    <option value="">
                                        {cargandoMaterias
                                            ? 'Cargando materias...'
                                            : materiasActivas.length === 0
                                              ? 'No tienes materias activas'
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

                                {!cargandoMaterias &&
                                    materiasActivas.length === 0 && (
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
                                id="tema-ia"
                                etiqueta="Tema"
                                error={errorTema}
                            >
                                <select
                                    id="tema-ia"
                                    name="tema"
                                    value={temaIdValido}
                                    onChange={(evento) => {
                                        setTemaId(evento.target.value);
                                        marcarTocado('tema');
                                    }}
                                    disabled={
                                        !materiaId ||
                                        cargandoTemas ||
                                        bloqueado ||
                                        temasDeMateria.length === 0
                                    }
                                    aria-invalid={Boolean(errorTema)}
                                    aria-describedby={
                                        errorTema
                                            ? 'tema-ia-descripcion'
                                            : undefined
                                    }
                                    className={cn(
                                        ENTRADA,
                                        errorTema
                                            ? 'border-red-300'
                                            : 'border-slate-200',
                                    )}
                                >
                                    <option value="">
                                        {!materiaId
                                            ? 'Primero elige una materia'
                                            : cargandoTemas
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
                                    !cargandoTemas &&
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

                            <Campo
                                id="tipo-ia"
                                etiqueta="Tipo de pregunta"
                                error={errorTipo}
                            >
                                <select
                                    id="tipo-ia"
                                    name="tipo_respuesta"
                                    value={tipo}
                                    onChange={(evento) =>
                                        setTipo(
                                            evento.target
                                                .value as TipoRespuestaPregunta,
                                        )
                                    }
                                    disabled={bloqueado}
                                    aria-invalid={Boolean(errorTipo)}
                                    aria-describedby={
                                        errorTipo
                                            ? 'tipo-ia-descripcion'
                                            : undefined
                                    }
                                    className={cn(
                                        ENTRADA,
                                        errorTipo
                                            ? 'border-red-300'
                                            : 'border-slate-200',
                                    )}
                                >
                                    {TIPOS_PREGUNTA_FORMULARIO.map((info) => (
                                        <option
                                            key={info.valor}
                                            value={info.valor}
                                        >
                                            {info.label}
                                        </option>
                                    ))}
                                </select>
                            </Campo>

                            <Campo
                                id="cantidad-ia"
                                etiqueta="Cantidad de preguntas"
                                ayuda="Entre 1 y 50 preguntas."
                                error={errorCantidad}
                            >
                                <input
                                    id="cantidad-ia"
                                    name="cantidad"
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={50}
                                    step={1}
                                    value={cantidad}
                                    onChange={(evento) =>
                                        setCantidad(evento.target.value)
                                    }
                                    onBlur={() => marcarTocado('cantidad')}
                                    disabled={bloqueado}
                                    aria-invalid={Boolean(errorCantidad)}
                                    aria-describedby={
                                        errorCantidad
                                            ? 'cantidad-ia-descripcion'
                                            : undefined
                                    }
                                    className={cn(
                                        ENTRADA,
                                        errorCantidad
                                            ? 'border-red-300'
                                            : 'border-slate-200',
                                    )}
                                />
                            </Campo>

                            <Campo
                                id="dificultad-ia"
                                etiqueta="Dificultad"
                                error={errorDificultad}
                            >
                                <select
                                    id="dificultad-ia"
                                    name="dificultad"
                                    value={dificultad}
                                    onChange={(evento) => {
                                        setDificultad(
                                            evento.target
                                                .value as DificultadPregunta | '',
                                        );
                                        marcarTocado('dificultad');
                                    }}
                                    disabled={bloqueado}
                                    aria-invalid={Boolean(errorDificultad)}
                                    aria-describedby={
                                        errorDificultad
                                            ? 'dificultad-ia-descripcion'
                                            : undefined
                                    }
                                    className={cn(
                                        ENTRADA,
                                        errorDificultad
                                            ? 'border-red-300'
                                            : 'border-slate-200',
                                    )}
                                >
                                    <option value="">
                                        Selecciona una dificultad
                                    </option>
                                    <option value="facil">Fácil</option>
                                    <option value="media">Media</option>
                                    <option value="dificil">Difícil</option>
                                </select>
                            </Campo>
                        </div>
                    </section>

                    <SelectorMaterialesIa
                        materiales={materialesOrdenados}
                        isLoading={cargandoMateriales}
                        error={errorCargaMateriales}
                        seleccionados={materialIdsSeleccionados}
                        deshabilitado={bloqueado}
                        errorValidacion={errorMateriales}
                        onCambiar={cambiarMateriales}
                        onReintentar={() => void recargarMateriales()}
                    />
                </div>

                <aside className="space-y-5 lg:sticky lg:top-4">
                    <ResumenConfiguracionIa
                        materia={materiaSeleccionada}
                        tema={temaSeleccionado}
                        tipo={tipoSeleccionado}
                        cantidad={cantidadResumen}
                        dificultad={dificultadSeleccionada}
                        materiales={materialesResumen.slice(
                            0,
                            MAX_MATERIALES_CONTEXTO,
                        )}
                    />
                </aside>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <LinkButton href={ROUTES.docente.preguntas}>
                    Cancelar
                </LinkButton>

                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    {siguiendo && (
                        <p className="text-xs text-slate-500">
                            La generación está en curso. Podrás iniciar otra
                            cuando termine.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!puedeEnviar}
                        aria-busy={enviando}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {enviando ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <Sparkles
                                className="size-4"
                                aria-hidden="true"
                            />
                        )}
                        {enviando
                            ? 'Enviando solicitud...'
                            : 'Generar preguntas'}
                    </button>
                </div>
            </div>
        </form>
    );
}
