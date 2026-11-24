'use client';

import { useState, type FormEvent } from 'react';
import { ClipboardPaste, Plus, Trash2 } from 'lucide-react';

import Alerta from '@/components/ui/Alerta';
import { describirError, erroresPorFila } from '@/lib/mensajes';
import { filaNueva } from '@/features/configuracion-academica/hooks/useAsistentePeriodo';
import type { ErroresFilas, FilaMateriaNueva } from '@/features/configuracion-academica/types';
import {
    filaVacia,
    parsearListaMaterias,
    sugerirCodigo,
    validarMaterias,
} from '@/features/configuracion-academica/utils';

import { materiasService } from '../services/materias.service';

interface Props {
    /** Se llama con la cantidad de materias creadas cuando todo salió bien. */
    onGuardado: (cantidad: number) => void;
    onCancelar: () => void;
}

const INPUT =
    'w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
const BOTON_SECUNDARIO =
    'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-600';

/**
 * Crea VARIAS materias con un solo formulario (antes era una por pantalla).
 * Si el servidor marca una fila (ej. código repetido), se pinta en rojo
 * y no se guarda ninguna hasta corregirla.
 */
export function MateriasLoteForm({ onGuardado, onCancelar }: Props) {
    // Empieza con 3 filas vacías para que se vea que se pueden agregar varias
    const [filas, setFilas] = useState<FilaMateriaNueva[]>([
        filaNueva(),
        filaNueva(),
        filaNueva(),
    ]);
    const [errores, setErrores] = useState<ErroresFilas>({});
    const [errorGeneral, setErrorGeneral] = useState<{ titulo: string; detalle: string } | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [mostrarPegar, setMostrarPegar] = useState(false);
    const [textoPegado, setTextoPegado] = useState('');

    const codigosUsados = filas.map((f) => f.codigo).filter(Boolean);

    function cambiarFila(clave: string, cambio: Partial<FilaMateriaNueva>) {
        setFilas((actuales) =>
            actuales.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)),
        );
        // Al editar una fila, se limpia el error que tenía marcado
        setErrores((actuales) => {
            const copia = { ...actuales };
            delete copia[clave];
            return copia;
        });
    }

    function sugerirAlSalir(fila: FilaMateriaNueva) {
        if (fila.codigo.trim() || !fila.nombre.trim()) return;
        cambiarFila(fila.clave, { codigo: sugerirCodigo(fila.nombre, codigosUsados) });
    }

    function agregarPegadas() {
        const nuevas = parsearListaMaterias(textoPegado, codigosUsados).map((f) =>
            filaNueva(f.nombre, f.codigo),
        );
        if (nuevas.length === 0) return;

        setFilas((actuales) => [...actuales.filter((f) => !filaVacia(f)), ...nuevas]);
        setTextoPegado('');
        setMostrarPegar(false);
    }

    async function guardar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErrorGeneral(null);

        const llenas = filas.filter((f) => !filaVacia(f));
        const { general, filas: erroresLocales } = validarMaterias([], llenas, []);
        // validarMaterias avisa "agrega al menos una" si no hay ninguna
        setErrores(erroresLocales);
        if (general) {
            setErrorGeneral({ titulo: 'No se pudo guardar', detalle: general });
            return;
        }

        try {
            setGuardando(true);
            const creadas = await materiasService.createLote({
                materias: llenas.map((f) => ({
                    nombre: f.nombre.trim(),
                    codigo: f.codigo.trim().toUpperCase(),
                })),
            });
            onGuardado(creadas.length);
        } catch (fallo) {
            // El servidor puede marcar filas concretas (código repetido, etc.)
            const delServidor = erroresPorFila(fallo);
            if (delServidor.length > 0) {
                const porClave: ErroresFilas = {};
                for (const item of delServidor) {
                    const clave = llenas[item.indice]?.clave;
                    if (clave) porClave[clave] = { ...porClave[clave], [item.campo]: item.mensaje };
                }
                setErrores(porClave);
            }
            const { titulo, detalle } = describirError(fallo, 'No se pudieron crear las materias');
            setErrorGeneral({ titulo, detalle });
        } finally {
            setGuardando(false);
        }
    }

    const llenasCount = filas.filter((f) => !filaVacia(f)).length;

    return (
        <form
            onSubmit={guardar}
            className="max-w-3xl space-y-5 rounded-lg border bg-white p-4 sm:p-6"
        >
            <div>
                <h2 className="font-semibold">Datos de las materias</h2>
                <p className="text-sm text-slate-500">
                    Agrega todas las que necesites y guárdalas juntas. Las materias quedan
                    asociadas únicamente a tu cuenta.
                </p>
            </div>

            {errorGeneral && (
                <Alerta tono="error" titulo={errorGeneral.titulo} onCerrar={() => setErrorGeneral(null)}>
                    {errorGeneral.detalle}
                </Alerta>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => setMostrarPegar((v) => !v)}
                    aria-expanded={mostrarPegar}
                    className={BOTON_SECUNDARIO}
                >
                    <ClipboardPaste className="size-3.5" aria-hidden="true" />
                    Pegar varias a la vez
                </button>
            </div>

            {mostrarPegar && (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <label htmlFor="pegar-lote" className="text-xs text-slate-600">
                        Una materia por línea: <strong>Nombre; CÓDIGO</strong> (el código es
                        opcional). Puedes pegar desde Excel.
                    </label>
                    <textarea
                        id="pegar-lote"
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

            <ul className="space-y-3">
                {filas.map((fila, indice) => {
                    const error = errores[fila.clave];

                    return (
                        <li
                            key={fila.clave}
                            className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-start"
                        >
                            <div>
                                <input
                                    aria-label={`Nombre de la materia ${indice + 1}`}
                                    placeholder="Nombre de la materia"
                                    value={fila.nombre}
                                    onChange={(e) => cambiarFila(fila.clave, { nombre: e.target.value })}
                                    onBlur={() => sugerirAlSalir(fila)}
                                    aria-invalid={!!error?.nombre}
                                    className={`${INPUT} ${error?.nombre ? 'border-red-400' : 'border-slate-300'}`}
                                />
                                {error?.nombre && <p className="mt-1 text-xs text-red-600">{error.nombre}</p>}
                            </div>

                            <div className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto">
                                <input
                                    aria-label={`Código de la materia ${indice + 1}`}
                                    placeholder="Código"
                                    value={fila.codigo}
                                    onChange={(e) => cambiarFila(fila.clave, { codigo: e.target.value })}
                                    aria-invalid={!!error?.codigo}
                                    className={`${INPUT} font-mono uppercase ${error?.codigo ? 'border-red-400' : 'border-slate-300'}`}
                                />
                                {error?.codigo && <p className="mt-1 text-xs text-red-600">{error.codigo}</p>}
                            </div>

                            <button
                                type="button"
                                onClick={() => setFilas((actuales) => actuales.filter((f) => f.clave !== fila.clave))}
                                disabled={filas.length === 1}
                                aria-label={`Quitar la materia ${indice + 1}`}
                                className="row-start-1 rounded-md border border-slate-300 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 sm:row-start-auto"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                        </li>
                    );
                })}
            </ul>

            <button
                type="button"
                onClick={() => setFilas((actuales) => [...actuales, filaNueva()])}
                className={BOTON_SECUNDARIO}
            >
                <Plus className="size-3.5" aria-hidden="true" />
                Agregar otra materia
            </button>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                    type="button"
                    onClick={onCancelar}
                    disabled={guardando}
                    className="rounded-md border px-4 py-2 text-sm"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={guardando || llenasCount === 0}
                    className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    {guardando
                        ? 'Guardando...'
                        : llenasCount > 1
                          ? `Guardar ${llenasCount} materias`
                          : 'Guardar materia'}
                </button>
            </div>
        </form>
    );
}
