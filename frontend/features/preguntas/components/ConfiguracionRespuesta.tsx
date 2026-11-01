'use client';

import { cn } from '@/lib/utils';

import { infoTipoPreguntaFormulario } from '../tipos';
import type {
    ErroresConfiguracion,
    OpcionFormulario,
    TipoRespuestaPregunta,
} from '../types';

import Campo from './Campo';

interface ConfiguracionRespuestaProps {
    tipo: TipoRespuestaPregunta;
    opciones: OpcionFormulario[];
    respuestaBooleana: 'verdadero' | 'falso' | '';
    valorCorrecto: string;
    tolerancia: string;
    solucionReferencia: string;
    errores: ErroresConfiguracion;
    mostrarErrores: boolean;
    onCambiarOpcion: (id: string, texto: string) => void;
    onMarcarCorrecta: (id: string) => void;
    onCambiarBooleana: (valor: 'verdadero' | 'falso') => void;
    onCambiarValorCorrecto: (valor: string) => void;
    onCambiarTolerancia: (valor: string) => void;
    onCambiarSolucionReferencia: (valor: string) => void;
}

const ENTRADA =
    'h-9 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export default function ConfiguracionRespuesta({
    tipo,
    opciones,
    respuestaBooleana,
    valorCorrecto,
    tolerancia,
    solucionReferencia,
    errores,
    mostrarErrores,
    onCambiarOpcion,
    onMarcarCorrecta,
    onCambiarBooleana,
    onCambiarValorCorrecto,
    onCambiarTolerancia,
    onCambiarSolucionReferencia,
}: ConfiguracionRespuestaProps) {
    const info = infoTipoPreguntaFormulario(tipo);
    const errorOpciones = mostrarErrores ? errores.opciones : '';
    const errorBooleana = mostrarErrores ? errores.booleana : '';
    const errorValorCorrecto = mostrarErrores ? errores.valorCorrecto : '';
    const errorTolerancia = mostrarErrores ? errores.tolerancia : '';

    return (
        <section
            aria-labelledby="configuracion-respuesta"
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
        >
            <h2
                id="configuracion-respuesta"
                className="text-xs font-semibold tracking-wide text-slate-600 uppercase"
            >
                Configuración de respuesta — {info.label}
            </h2>

            {tipo === 'opcion_unica' || tipo === 'opcion_multiple' ? (
                <div className="mt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {opciones.map((opcion, indice) => {
                            const letra = String.fromCharCode(65 + indice);
                            const esUnica = tipo === 'opcion_unica';

                            return (
                                <div
                                    key={opcion.id}
                                    className="flex items-center gap-2"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                            opcion.correcta
                                                ? 'bg-violet-100 text-violet-700'
                                                : 'bg-slate-100 text-slate-500',
                                        )}
                                    >
                                        {letra}
                                    </span>

                                    <input
                                        id={`opcion-${opcion.id}`}
                                        type="text"
                                        value={opcion.texto}
                                        onChange={(evento) =>
                                            onCambiarOpcion(
                                                opcion.id,
                                                evento.target.value,
                                            )
                                        }
                                        maxLength={500}
                                        placeholder={`Opción ${letra}`}
                                        aria-label={`Texto de la opción ${letra}`}
                                        aria-invalid={Boolean(
                                            errorOpciones &&
                                                opcion.correcta &&
                                                !opcion.texto.trim(),
                                        )}
                                        className={cn(
                                            ENTRADA,
                                            'min-w-0 flex-1',
                                            errorOpciones
                                                ? 'border-red-300'
                                                : 'border-slate-200',
                                        )}
                                    />

                                    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-slate-500">
                                        <input
                                            type={esUnica ? 'radio' : 'checkbox'}
                                            name={
                                                esUnica
                                                    ? 'respuesta-correcta'
                                                    : undefined
                                            }
                                            checked={opcion.correcta}
                                            onChange={() =>
                                                onMarcarCorrecta(opcion.id)
                                            }
                                            aria-label={`Marcar opción ${letra} como correcta`}
                                            className="size-4 accent-violet-600"
                                        />
                                        Correcta
                                    </label>
                                </div>
                            );
                        })}
                    </div>

                    <p className="mt-3 text-xs text-slate-500">{info.ayuda}</p>

                    {errorOpciones && (
                        <p role="alert" className="mt-2 text-xs text-red-600">
                            {errorOpciones}
                        </p>
                    )}
                </div>
            ) : null}

            {tipo === 'verdadero_falso' ? (
                <div className="mt-4">
                    <fieldset>
                        <legend className="sr-only">
                            Respuesta correcta de la pregunta
                        </legend>

                        <div className="flex flex-wrap gap-3">
                            {(['verdadero', 'falso'] as const).map((valor) => (
                                <label
                                    key={valor}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                                        respuestaBooleana === valor
                                            ? 'border-violet-500 bg-violet-50 text-violet-800'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="respuesta-booleana"
                                        value={valor}
                                        checked={respuestaBooleana === valor}
                                        onChange={() =>
                                            onCambiarBooleana(valor)
                                        }
                                        className="size-4 accent-violet-600"
                                    />
                                    {valor === 'verdadero'
                                        ? 'Verdadero'
                                        : 'Falso'}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <p className="mt-3 text-xs text-slate-500">{info.ayuda}</p>

                    {errorBooleana && (
                        <p role="alert" className="mt-2 text-xs text-red-600">
                            {errorBooleana}
                        </p>
                    )}
                </div>
            ) : null}

            {tipo === 'desarrollo' ? (
                <div className="mt-4">
                    <Campo
                        id="solucion-referencia"
                        etiqueta="Solución de referencia"
                        opcional
                        ayuda="Se guarda como rúbrica para orientar la corrección."
                    >
                        <textarea
                            id="solucion-referencia"
                            value={solucionReferencia}
                            onChange={(evento) =>
                                onCambiarSolucionReferencia(
                                    evento.target.value,
                                )
                            }
                            rows={3}
                            maxLength={5000}
                            placeholder="Describe la respuesta esperada o los criterios de corrección..."
                            aria-describedby="solucion-referencia-descripcion"
                            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600"
                        />
                    </Campo>
                </div>
            ) : null}

            {tipo === 'numerica' ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Campo
                        id="valor-correcto"
                        etiqueta="Valor correcto"
                        error={errorValorCorrecto}
                    >
                        <input
                            id="valor-correcto"
                            type="number"
                            step="any"
                            value={valorCorrecto}
                            onChange={(evento) =>
                                onCambiarValorCorrecto(evento.target.value)
                            }
                            placeholder="Ej. 2.5"
                            aria-invalid={Boolean(errorValorCorrecto)}
                            aria-describedby="valor-correcto-descripcion"
                            className={cn(
                                ENTRADA,
                                errorValorCorrecto
                                    ? 'border-red-300'
                                    : 'border-slate-200',
                            )}
                        />
                    </Campo>

                    <Campo
                        id="tolerancia"
                        etiqueta="Tolerancia"
                        opcional
                        error={errorTolerancia}
                        ayuda="Margen aceptado alrededor del valor correcto. Por defecto 0."
                    >
                        <input
                            id="tolerancia"
                            type="number"
                            min="0"
                            step="any"
                            value={tolerancia}
                            onChange={(evento) =>
                                onCambiarTolerancia(evento.target.value)
                            }
                            placeholder="0"
                            aria-invalid={Boolean(errorTolerancia)}
                            aria-describedby="tolerancia-descripcion"
                            className={cn(
                                ENTRADA,
                                errorTolerancia
                                    ? 'border-red-300'
                                    : 'border-slate-200',
                            )}
                        />
                    </Campo>
                </div>
            ) : null}
        </section>
    );
}
