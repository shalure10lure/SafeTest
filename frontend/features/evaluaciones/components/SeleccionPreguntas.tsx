'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';

import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';
import { useMaterias } from '@/features/materias/hooks/useMaterias';
import { cn } from '@/lib/utils';

import { useBancoPreguntas } from '../hooks/useBancoPreguntas';
import { useEvaluacion } from '../hooks/useEvaluacion';
import { mensajeDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type {
    EvaluacionDetalle,
    GuardarSeleccionDto,
    ModoSeleccion,
} from '../types';

import CriteriosAleatorios, { type FilaCriterio } from './CriteriosAleatorios';
import PanelSeleccionadas from './PanelSeleccionadas';
import PreguntaBancoItem from './PreguntaBancoItem';
import SelectorModo from './SelectorModo';

/** Quita tildes y mayúsculas para que "limite" encuentre "Límites". */
function normalizar(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function FormularioSeleccion({
    evaluacion,
}: {
    evaluacion: EvaluacionDetalle;
}) {
    const router = useRouter();
    const { materias } = useMaterias();

    const materiaEvaluacionId = evaluacion.materia?.materia_id ?? null;

    const [modo, setModo] = useState<ModoSeleccion>(evaluacion.modo_seleccion);

    // Modo manual
    const [seleccionIds, setSeleccionIds] = useState<number[]>(
        evaluacion.pregunta_ids,
    );
    const [materiaId, setMateriaId] = useState<number | null>(materiaEvaluacionId);
    const [busqueda, setBusqueda] = useState('');

    // Modo aleatorio
    const [filas, setFilas] = useState<FilaCriterio[]>(() =>
        evaluacion.criterios.length > 0
            ? evaluacion.criterios.map((criterio, indice) => ({
                clave: indice + 1,
                tema_id: criterio.tema_id,
                cantidad: criterio.cantidad,
            }))
            : [{ clave: 1, tema_id: null, cantidad: 2 }],
    );
    const siguienteClave = useRef(filas.length + 1);

    const [guardando, setGuardando] = useState(false);
    const [errorGuardar, setErrorGuardar] = useState('');

    // En modo aleatorio los temas deben ser los de la materia de la evaluación.
    const { banco, conocidas, cargando, error } = useBancoPreguntas(
        evaluacion.examen_id,
        modo === 'aleatorio' ? materiaEvaluacionId : materiaId,
    );

    const bancoActualizado =
        materiaEvaluacionId === null || banco?.materia_id === materiaEvaluacionId;

    const visibles = useMemo(() => {
        const preguntas = banco?.preguntas ?? [];
        const texto = normalizar(busqueda.trim());

        if (!texto) return preguntas;

        return preguntas.filter((pregunta) =>
            normalizar(`${pregunta.enunciado} ${pregunta.tema.nombre_tema}`).includes(
                texto,
            ),
        );
    }, [banco, busqueda]);

    const items = seleccionIds.map((id) => ({ id, pregunta: conocidas[id] }));

    function alternar(id: number) {
        setSeleccionIds((actual) =>
            actual.includes(id)
                ? actual.filter((existente) => existente !== id)
                : [...actual, id],
        );
    }

    function cambiarTema(clave: number, temaId: number | null) {
        const disponibles = temaId
            ? (banco?.temas.find((tema) => tema.tema_id === temaId)?.disponibles ?? 0)
            : 0;

        setFilas((actual) =>
            actual.map((fila) => {
                if (fila.clave !== clave) return fila;

                // Al elegir un tema, la cantidad no puede superar lo disponible.
                const cantidad = temaId
                    ? Math.min(Math.max(fila.cantidad, 1), Math.max(disponibles, 1))
                    : fila.cantidad;

                return { ...fila, tema_id: temaId, cantidad };
            }),
        );
    }

    function cambiarCantidad(clave: number, cantidad: number) {
        setFilas((actual) =>
            actual.map((fila) =>
                fila.clave === clave ? { ...fila, cantidad: Math.max(1, cantidad) } : fila,
            ),
        );
    }

    function agregarFila() {
        const clave = siguienteClave.current++;

        setFilas((actual) => [...actual, { clave, tema_id: null, cantidad: 2 }]);
    }

    function quitarFila(clave: number) {
        setFilas((actual) =>
            actual.length === 1 ? actual : actual.filter((fila) => fila.clave !== clave),
        );
    }

    async function guardar() {
        setErrorGuardar('');

        let datos: GuardarSeleccionDto;

        if (modo === 'manual') {
            datos = { modo_seleccion: 'manual', pregunta_ids: seleccionIds };
        } else {
            const criterios = filas.flatMap((fila) =>
                fila.tema_id === null
                    ? []
                    : [{ tema_id: fila.tema_id, cantidad: fila.cantidad }],
            );

            if (criterios.length !== filas.length) {
                setErrorGuardar(
                    'Selecciona un tema en cada criterio o quita las filas que no uses.',
                );
                return;
            }

            datos = { modo_seleccion: 'aleatorio', criterios };
        }

        setGuardando(true);

        try {
            await evaluacionesService.guardarSeleccion(evaluacion.examen_id, datos);

            // TODO(paso 3 del asistente): ir a la configuración de la evaluación.
            router.push(ROUTES.docente.evaluaciones);
        } catch (e) {
            setErrorGuardar(
                mensajeDeError(
                    e,
                    'No se pudo guardar la selección. Inténtalo de nuevo.',
                ),
            );
            setGuardando(false);
        }
    }

    const opcionesMateria = materias.filter(
        (materia) => materia.activo || materia.materia_id === materiaId,
    );

    return (
        <div
            className={cn(
                'grid gap-5',
                modo === 'manual' && 'lg:grid-cols-[minmax(0,1fr)_17.5rem]',
            )}
        >
            <div className="min-w-0 space-y-5">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">
                        Seleccionar preguntas
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Elige cómo se conformará la evaluación a partir de tu banco.
                    </p>
                </div>

                <SelectorModo modo={modo} onCambiar={setModo} aleatorioDisponible />

                {modo === 'manual' ? (
                    <>
                        <div className="flex gap-2.5 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-800">
                            <Copy className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                            <p>
                                <strong>Reutilización:</strong> las preguntas se agregan como
                                referencia. Seguirán disponibles en el banco y podrás usarlas
                                en otras evaluaciones.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                type="search"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar en el banco..."
                                aria-label="Buscar en el banco"
                                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600"
                            />

                            <select
                                value={materiaId ?? ''}
                                onChange={(e) => setMateriaId(Number(e.target.value) || null)}
                                aria-label="Filtrar por materia"
                                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 sm:w-48"
                            >
                                {materiaId === null && (
                                    <option value="">Selecciona una materia</option>
                                )}
                                {opcionesMateria.map((materia) => (
                                    <option key={materia.materia_id} value={materia.materia_id}>
                                        {materia.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <p className="text-xs text-slate-500" aria-live="polite">
                            {visibles.length} de {banco?.total_banco ?? 0} preguntas en tu
                            banco
                        </p>

                        {cargando ? (
                            <p className="text-sm text-slate-500">Cargando preguntas...</p>
                        ) : error ? (
                            <p className="text-sm text-red-600" role="alert">
                                {error}
                            </p>
                        ) : visibles.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                                {banco && banco.preguntas.length === 0
                                    ? 'No tienes preguntas en esta materia todavía.'
                                    : 'Ninguna pregunta coincide con la búsqueda.'}
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {visibles.map((pregunta) => (
                                    <li key={pregunta.pregunta_id}>
                                        <PreguntaBancoItem
                                            pregunta={pregunta}
                                            seleccionada={seleccionIds.includes(pregunta.pregunta_id)}
                                            onAlternar={() => alternar(pregunta.pregunta_id)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                ) : (
                    <CriteriosAleatorios
                        filas={filas}
                        temas={banco?.temas ?? []}
                        materiaNombre={evaluacion.materia?.nombre ?? 'la materia'}
                        totalMateria={banco?.preguntas.length ?? 0}
                        cargando={cargando || !bancoActualizado}
                        error={error}
                        onCambiarTema={cambiarTema}
                        onCambiarCantidad={cambiarCantidad}
                        onAgregar={agregarFila}
                        onQuitar={quitarFila}
                    />
                )}

                {errorGuardar && (
                    <p className="text-sm text-red-600" role="alert">
                        {errorGuardar}
                    </p>
                )}

                <div className="flex items-center justify-between pt-1">
                    <LinkButton href={ROUTES.docente.evaluacionEditar(evaluacion.examen_id)}>
                        ← Anterior
                    </LinkButton>

                    <button
                        type="button"
                        onClick={guardar}
                        disabled={guardando}
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {guardando
                            ? 'Guardando...'
                            : modo === 'manual' && seleccionIds.length > 0
                                ? `Guardar selección (${seleccionIds.length})`
                                : 'Guardar selección'}
                    </button>
                </div>
            </div>

            {modo === 'manual' && (
                <PanelSeleccionadas items={items} onQuitar={alternar} />
            )}
        </div>
    );
}

export default function SeleccionPreguntas({
    examenId,
}: {
    examenId: number;
}) {
    const { evaluacion, cargando, error } = useEvaluacion(examenId);

    if (cargando) {
        return (
            <p className="text-sm text-slate-500" aria-live="polite">
                Cargando evaluación...
            </p>
        );
    }

    if (error || !evaluacion) {
        return (
            <p className="text-sm text-red-600" role="alert">
                {error || 'No se pudo cargar la evaluación.'}
            </p>
        );
    }

    if (evaluacion.estado !== 'borrador') {
        return (
            <p className="text-sm text-slate-600">
                Solo puedes cambiar las preguntas de una evaluación en borrador.{' '}
                <Link
                    href={ROUTES.docente.evaluaciones}
                    className="font-medium text-violet-700 underline"
                >
                    Volver a Mis evaluaciones
                </Link>
            </p>
        );
    }

    return <FormularioSeleccion evaluacion={evaluacion} />;
}