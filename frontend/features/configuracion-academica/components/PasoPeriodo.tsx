'use client';

import type { DatosPeriodo } from '../types';

interface PasoPeriodoProps {
    datos: DatosPeriodo;
    errores: Record<string, string>;
    onCambiar: (cambio: Partial<DatosPeriodo>) => void;
}

const INPUT =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
const ETIQUETA = 'mb-1 block text-sm font-medium text-slate-700';
const ERROR = 'mt-1 text-xs text-red-600';

/** Paso 1: nombre, número de pruebas y fechas del periodo. */
export default function PasoPeriodo({ datos, errores, onCambiar }: PasoPeriodoProps) {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-base font-semibold text-slate-900">Datos del periodo</h2>
                <p className="text-sm text-slate-500">
                    El periodo quedará asociado únicamente a tu cuenta.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                    <label htmlFor="asistente-gestion" className={ETIQUETA}>
                        Gestión
                    </label>
                    <input
                        id="asistente-gestion"
                        className={INPUT}
                        placeholder="Ej. 2027-I"
                        value={datos.gestion}
                        onChange={(e) => onCambiar({ gestion: e.target.value })}
                        aria-invalid={!!errores.gestion}
                    />
                    {errores.gestion && <p className={ERROR}>{errores.gestion}</p>}
                </div>

                <div>
                    <label htmlFor="asistente-pruebas" className={ETIQUETA}>
                        N.° de pruebas
                    </label>
                    <input
                        id="asistente-pruebas"
                        type="number"
                        min={1}
                        className={INPUT}
                        value={datos.nroPruebas}
                        onChange={(e) => onCambiar({ nroPruebas: e.target.value })}
                        aria-invalid={!!errores.nroPruebas}
                    />
                    {errores.nroPruebas && <p className={ERROR}>{errores.nroPruebas}</p>}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="asistente-inicio" className={ETIQUETA}>
                        Fecha de inicio
                    </label>
                    <input
                        id="asistente-inicio"
                        type="date"
                        className={INPUT}
                        value={datos.fechaInicio}
                        onChange={(e) => onCambiar({ fechaInicio: e.target.value })}
                        aria-invalid={!!errores.fechaInicio}
                    />
                    {errores.fechaInicio && <p className={ERROR}>{errores.fechaInicio}</p>}
                </div>

                <div>
                    <label htmlFor="asistente-fin" className={ETIQUETA}>
                        Fecha de finalización
                    </label>
                    <input
                        id="asistente-fin"
                        type="date"
                        className={INPUT}
                        value={datos.fechaFin}
                        onChange={(e) => onCambiar({ fechaFin: e.target.value })}
                        aria-invalid={!!errores.fechaFin}
                    />
                    {errores.fechaFin && <p className={ERROR}>{errores.fechaFin}</p>}
                </div>
            </div>
        </div>
    );
}
