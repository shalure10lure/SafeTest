'use client';

import { useId, useState } from 'react';

import { cn } from '@/lib/utils';

import type { TipoRespuestaPregunta } from '../types';

interface VistaPreviaRespuestaProps {
    tipo: TipoRespuestaPregunta;
    enunciado?: string;
    /** Textos de las opciones (solo para opción única y múltiple). */
    opciones?: string[];
}

const OPCIONES_VERDADERO_FALSO = ['Verdadero', 'Falso'];

const INSTRUCCION: Record<TipoRespuestaPregunta, string> = {
    opcion_unica: 'Selecciona una opción.',
    opcion_multiple: 'Selecciona una o más opciones.',
    verdadero_falso: 'Indica si la afirmación es verdadera o falsa.',
    desarrollo: 'Escribe tu respuesta.',
    numerica: 'Ingresa un valor numérico.',
};

/**
 * Muestra cómo respondería el estudiante según el tipo de pregunta.
 *
 * Es solo una vista previa: la interacción no se guarda y nunca revela la
 * respuesta correcta. Pensado para reutilizarse en la pantalla de respuesta
 * del estudiante (HU-22).
 */
export default function VistaPreviaRespuesta({
    tipo,
    enunciado = '',
    opciones = [],
}: VistaPreviaRespuestaProps) {
    const nombre = useId();
    const [seleccion, setSeleccion] = useState<number[]>([]);
    const [texto, setTexto] = useState('');
    const [numero, setNumero] = useState('');

    const esMultiple = tipo === 'opcion_multiple';
    const usaLista =
        tipo === 'opcion_unica' ||
        tipo === 'opcion_multiple' ||
        tipo === 'verdadero_falso';

    const lista =
        tipo === 'verdadero_falso' ? OPCIONES_VERDADERO_FALSO : opciones;

    function alternar(indice: number) {
        setSeleccion((previa) => {
            if (!esMultiple) return [indice];

            return previa.includes(indice)
                ? previa.filter((item) => item !== indice)
                : [...previa, indice];
        });
    }

    return (
        <section
            aria-labelledby="vista-previa-titulo"
            className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40 p-4 sm:p-5"
        >
            <h2
                id="vista-previa-titulo"
                className="text-xs font-semibold tracking-wide text-violet-800 uppercase"
            >
                Vista previa para el estudiante
            </h2>

            <p className="mt-1 text-xs text-slate-500">
                Así verá el estudiante cómo responder. Es solo una vista previa
                y no se guarda.
            </p>

            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium whitespace-pre-line text-slate-900">
                    {enunciado.trim() || 'El enunciado aparecerá aquí...'}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                    {INSTRUCCION[tipo]}
                </p>

                {usaLista && (
                    <div className="mt-3 space-y-2">
                        {lista.length === 0 ? (
                            <p className="text-xs text-slate-400">
                                Las opciones aparecerán aquí cuando las escribas.
                            </p>
                        ) : (
                            lista.map((texto_opcion, indice) => {
                                const activa = seleccion.includes(indice);

                                return (
                                    <label
                                        key={`${indice}-${texto_opcion}`}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                                            activa
                                                ? 'border-violet-500 bg-violet-50 text-violet-900'
                                                : 'border-slate-200 text-slate-700 hover:border-slate-300',
                                        )}
                                    >
                                        <input
                                            type={
                                                esMultiple
                                                    ? 'checkbox'
                                                    : 'radio'
                                            }
                                            name={nombre}
                                            checked={activa}
                                            onChange={() => alternar(indice)}
                                            className="size-4 accent-violet-600"
                                        />
                                        {tipo !== 'verdadero_falso' && (
                                            <span
                                                aria-hidden="true"
                                                className="font-semibold text-slate-400"
                                            >
                                                {String.fromCharCode(
                                                    65 + indice,
                                                )}
                                                .
                                            </span>
                                        )}
                                        {texto_opcion}
                                    </label>
                                );
                            })
                        )}
                    </div>
                )}

                {tipo === 'desarrollo' && (
                    <textarea
                        value={texto}
                        onChange={(evento) => setTexto(evento.target.value)}
                        rows={4}
                        aria-label="Vista previa: respuesta del estudiante"
                        placeholder="Escribe tu respuesta aquí..."
                        className="mt-3 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600"
                    />
                )}

                {tipo === 'numerica' && (
                    <input
                        type="number"
                        step="any"
                        value={numero}
                        onChange={(evento) => setNumero(evento.target.value)}
                        aria-label="Vista previa: respuesta numérica del estudiante"
                        placeholder="Ej. 2.5"
                        className="mt-3 h-10 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600"
                    />
                )}
            </div>
        </section>
    );
}