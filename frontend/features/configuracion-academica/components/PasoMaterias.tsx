'use client';

import { useState } from 'react';
import { ClipboardPaste, Copy, Plus, Trash2 } from 'lucide-react';

import Alerta from '@/components/ui/Alerta';
import type { Materia } from '@/features/materias/types';
import { filaNueva } from '../hooks/useAsistentePeriodo';
import type { ErroresFilas, FilaMateriaNueva } from '../types';
import { parsearListaMaterias, sugerirCodigo } from '../utils';

interface PasoMateriasProps {
    /** Materias del docente que están activas. */
    materiasExistentes: Materia[];
    cargando: boolean;
    errorCarga: string | null;
    /** Materias del periodo anterior, para el botón "Copiar". */
    materiasPeriodoAnterior: Materia[];
    nombrePeriodoAnterior: string | null;
    materiaIds: number[];
    onCambiarIds: (ids: number[]) => void;
    nuevas: FilaMateriaNueva[];
    onCambiarNuevas: (filas: FilaMateriaNueva[]) => void;
    /** Errores por fila (los locales y los que devolvió el servidor). */
    errores: ErroresFilas;
    errorGeneral: string | null;
}

const INPUT =
    'w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
const BOTON_SECUNDARIO =
    'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-600';

/** Paso 2: elegir materias existentes y/o crear varias materias nuevas. */
export default function PasoMaterias({
    materiasExistentes,
    cargando,
    errorCarga,
    materiasPeriodoAnterior,
    nombrePeriodoAnterior,
    materiaIds,
    onCambiarIds,
    nuevas,
    onCambiarNuevas,
    errores,
    errorGeneral,
}: PasoMateriasProps) {
    const [mostrarPegar, setMostrarPegar] = useState(false);
    const [textoPegado, setTextoPegado] = useState('');

    // Códigos que ya están ocupados (existentes + filas nuevas) para sugerir sin repetir
    const codigosUsados = [
        ...materiasExistentes.map((m) => m.codigo),
        ...nuevas.map((fila) => fila.codigo).filter(Boolean),
    ];

    function alternarMateria(id: number) {
        onCambiarIds(
            materiaIds.includes(id)
                ? materiaIds.filter((x) => x !== id)
                : [...materiaIds, id],
        );
    }

    /** Une las materias del periodo anterior a las ya marcadas (solo las activas). */
    function copiarDelPeriodoAnterior() {
        const activas = new Set(materiasExistentes.map((m) => m.materia_id));
        const idsAnteriores = materiasPeriodoAnterior
            .map((m) => m.materia_id)
            .filter((id) => activas.has(id));

        onCambiarIds([...new Set([...materiaIds, ...idsAnteriores])]);
    }

    function cambiarFila(clave: string, cambio: Partial<FilaMateriaNueva>) {
        onCambiarNuevas(
            nuevas.map((fila) => (fila.clave === clave ? { ...fila, ...cambio } : fila)),
        );
    }

    /** Al salir del nombre, si no hay código, propone uno con las iniciales. */
    function sugerirAlSalir(fila: FilaMateriaNueva) {
        if (fila.codigo.trim() || !fila.nombre.trim()) return;

        const otros = codigosUsados.filter((c) => c !== fila.codigo);
        cambiarFila(fila.clave, { codigo: sugerirCodigo(fila.nombre, otros) });
    }

    function agregarPegadas() {
        const filas = parsearListaMaterias(textoPegado, codigosUsados).map((f) =>
            filaNueva(f.nombre, f.codigo),
        );
        if (filas.length === 0) return;

        // Si la última fila estaba vacía, se reemplaza en vez de dejar un hueco
        const base = nuevas.filter((fila) => fila.nombre.trim() || fila.codigo.trim());
        onCambiarNuevas([...base, ...filas]);
        setTextoPegado('');
        setMostrarPegar(false);
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-base font-semibold text-slate-900">Materias del periodo</h2>
                <p className="text-sm text-slate-500">
                    Elige las materias que ya tienes y agrega las nuevas en este mismo paso.
                </p>
            </div>

            {errorGeneral && <Alerta tono="aviso">{errorGeneral}</Alerta>}

            {/* ---------- Materias que ya existen ---------- */}
            <section aria-labelledby="titulo-existentes" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id="titulo-existentes" className="text-sm font-semibold text-slate-800">
                        Tus materias{' '}
                        <span className="font-normal text-slate-500">
                            ({materiaIds.length} de {materiasExistentes.length} seleccionadas)
                        </span>
                    </h3>

                    <div className="flex flex-wrap gap-2">
                        {materiasPeriodoAnterior.length > 0 && (
                            <button
                                type="button"
                                onClick={copiarDelPeriodoAnterior}
                                className={BOTON_SECUNDARIO}
                                title={`Marca las materias que usaste en ${nombrePeriodoAnterior}`}
                            >
                                <Copy className="size-3.5" aria-hidden="true" />
                                Copiar de {nombrePeriodoAnterior}
                            </button>
                        )}
                        {materiasExistentes.length > 0 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onCambiarIds(materiasExistentes.map((m) => m.materia_id))
                                    }
                                    className={BOTON_SECUNDARIO}
                                >
                                    Seleccionar todas
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onCambiarIds([])}
                                    className={BOTON_SECUNDARIO}
                                >
                                    Quitar todas
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {cargando && <p className="text-sm text-slate-500">Cargando tus materias…</p>}
                {errorCarga && <Alerta tono="error" titulo="No se pudieron cargar tus materias">{errorCarga}</Alerta>}

                {!cargando && !errorCarga && materiasExistentes.length === 0 && (
                    <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                        Todavía no tienes materias registradas. Agrégalas abajo, en «Materias nuevas».
                    </p>
                )}

                {materiasExistentes.length > 0 && (
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {materiasExistentes.map((materia) => {
                            const marcada = materiaIds.includes(materia.materia_id);

                            return (
                                <li key={materia.materia_id}>
                                    <label
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                                            marcada
                                                ? 'border-violet-400 bg-violet-50'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={marcada}
                                            onChange={() => alternarMateria(materia.materia_id)}
                                            className="size-4 accent-violet-600"
                                        />
                                        <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                                            {materia.nombre}
                                        </span>
                                        <span className="font-mono text-xs text-slate-500">
                                            {materia.codigo}
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {/* ---------- Materias nuevas ---------- */}
            <section aria-labelledby="titulo-nuevas" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id="titulo-nuevas" className="text-sm font-semibold text-slate-800">
                        Materias nuevas{' '}
                        <span className="font-normal text-slate-500">(opcional)</span>
                    </h3>
                    <button
                        type="button"
                        onClick={() => setMostrarPegar((valor) => !valor)}
                        className={BOTON_SECUNDARIO}
                        aria-expanded={mostrarPegar}
                    >
                        <ClipboardPaste className="size-3.5" aria-hidden="true" />
                        Pegar varias a la vez
                    </button>
                </div>

                {mostrarPegar && (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <label htmlFor="pegar-materias" className="text-xs text-slate-600">
                            Una materia por línea con el formato <strong>Nombre; CÓDIGO</strong>.
                            El código es opcional: si falta, lo sugerimos. Puedes pegar
                            directamente desde Excel.
                        </label>
                        <textarea
                            id="pegar-materias"
                            rows={4}
                            value={textoPegado}
                            onChange={(e) => setTextoPegado(e.target.value)}
                            placeholder={'Cálculo I; MAT101\nInvestigación Operativa; IO'}
                            className={`${INPUT} border-slate-300 font-mono text-xs`}
                        />
                        <button
                            type="button"
                            onClick={agregarPegadas}
                            disabled={!textoPegado.trim()}
                            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                            Agregar a la lista
                        </button>
                    </div>
                )}

                {nuevas.length > 0 && (
                    <ul className="space-y-3">
                        {nuevas.map((fila, indice) => {
                            const error = errores[fila.clave];

                            return (
                                <li
                                    key={fila.clave}
                                    className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-start"
                                >
                                    <div>
                                        <input
                                            aria-label={`Nombre de la materia nueva ${indice + 1}`}
                                            placeholder="Nombre de la materia"
                                            value={fila.nombre}
                                            onChange={(e) =>
                                                cambiarFila(fila.clave, { nombre: e.target.value })
                                            }
                                            onBlur={() => sugerirAlSalir(fila)}
                                            aria-invalid={!!error?.nombre}
                                            className={`${INPUT} ${error?.nombre ? 'border-red-400' : 'border-slate-300'}`}
                                        />
                                        {error?.nombre && (
                                            <p className="mt-1 text-xs text-red-600">{error.nombre}</p>
                                        )}
                                    </div>

                                    <div className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto">
                                        <input
                                            aria-label={`Código de la materia nueva ${indice + 1}`}
                                            placeholder="Código"
                                            value={fila.codigo}
                                            onChange={(e) =>
                                                cambiarFila(fila.clave, { codigo: e.target.value })
                                            }
                                            aria-invalid={!!error?.codigo}
                                            className={`${INPUT} font-mono uppercase ${error?.codigo ? 'border-red-400' : 'border-slate-300'}`}
                                        />
                                        {error?.codigo && (
                                            <p className="mt-1 text-xs text-red-600">{error.codigo}</p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onCambiarNuevas(
                                                nuevas.filter((f) => f.clave !== fila.clave),
                                            )
                                        }
                                        aria-label={`Quitar la materia nueva ${indice + 1}`}
                                        className="row-start-1 rounded-md border border-slate-300 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 sm:row-start-auto"
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <button
                    type="button"
                    onClick={() => onCambiarNuevas([...nuevas, filaNueva()])}
                    className={BOTON_SECUNDARIO}
                >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Agregar otra materia
                </button>
            </section>
        </div>
    );
}
