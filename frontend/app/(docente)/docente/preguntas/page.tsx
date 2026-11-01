
'use client';

import { useMemo, useState } from 'react';

import { useMaterias } from '@/features/materias/hooks/useMaterias';
import { useTemas } from '@/features/temas/hooks/useTemas';

import FiltrosPreguntas from '@/features/preguntas/components/FiltrosPreguntas';
import PreguntaList from '@/features/preguntas/components/PreguntaList';
import { useDebouncedValor } from '@/features/preguntas/hooks/useDebouncedValor';
import { usePreguntas } from '@/features/preguntas/hooks/usePreguntas';
import type {
    FiltrosPreguntas as Filtros,
    TipoFiltroPregunta,
} from '@/features/preguntas/types';

export default function PreguntasPage() {
    const [buscar, setBuscar] = useState('');
    const [materiaId, setMateriaId] = useState('');
    const [temaId, setTemaId] = useState('');
    const [tipo, setTipo] = useState('');

    const buscarDiferido = useDebouncedValor(buscar, 350);

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

    const materiasActivas = useMemo(
        () => materias.filter((materia) => materia.activo),
        [materias],
    );

    const filtros = useMemo<Filtros>(
        () => ({
            materia_id: materiaId ? Number(materiaId) : undefined,
            tema_id: temaId ? Number(temaId) : undefined,
            tipo: (tipo as TipoFiltroPregunta) || undefined,
            buscar: buscarDiferido.trim() || undefined,
        }),
        [materiaId, temaId, tipo, buscarDiferido],
    );

    const {
        preguntas,
        isLoading,
        isDeleting,
        error,
        eliminarPregunta,
    } = usePreguntas(filtros);

    const hayFiltros = Boolean(
        materiaId || temaId || tipo || buscar.trim(),
    );

    function cambiarMateria(valor: string) {
        setMateriaId(valor);

        if (!valor) {
            setTemaId('');
            return;
        }

        const temaPertenece = temas.some(
            (tema) =>
                String(tema.tema_id) === temaId &&
                String(tema.materia_id) === valor,
        );

        if (!temaPertenece) setTemaId('');
    }

    function limpiarFiltros() {
        setBuscar('');
        setMateriaId('');
        setTemaId('');
        setTipo('');
    }

    const errorDatos = errorMaterias ?? errorTemas;

    return (
        <main className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                    className="text-sm text-slate-600"
                    aria-live="polite"
                >
                    <span className="font-semibold text-slate-900">
                        {preguntas.length}
                    </span>{' '}
                    {preguntas.length === 1
                        ? 'pregunta encontrada'
                        : 'preguntas encontradas'}
                </p>

                {isLoading && preguntas.length > 0 && (
                    <span className="text-xs text-slate-400">
                        Actualizando...
                    </span>
                )}
            </div>

            {errorDatos && (
                <p
                    role="alert"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                >
                    {errorDatos}
                </p>
            )}

            <FiltrosPreguntas
                buscar={buscar}
                onBuscar={setBuscar}
                materiaId={materiaId}
                onMateria={cambiarMateria}
                materias={materiasActivas}
                temaId={temaId}
                onTema={setTemaId}
                temas={temas}
                tipo={tipo}
                onTipo={setTipo}
                hayFiltros={hayFiltros}
                onLimpiar={limpiarFiltros}
                cargandoDatos={cargandoMaterias || cargandoTemas}
            />

            <PreguntaList
                preguntas={preguntas}
                isLoading={isLoading}
                isDeleting={isDeleting}
                error={error}
                hayFiltros={hayFiltros}
                onLimpiarFiltros={limpiarFiltros}
                onEliminar={eliminarPregunta}
            />
        </main>
    );
}
