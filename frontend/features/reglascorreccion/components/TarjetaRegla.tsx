'use client';

import type { ReactNode } from 'react';
import { Check, Info } from 'lucide-react';

import { Badge, Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

import {
    MODOS_CALIFICACION_MULTIPLE,
    infoTipoRegla,
    modoCalificacionMultiple,
    normalizarParametros,
    parametrosDeModoCalificacion,
    sonParametrosIguales,
} from '../tipos';
import type {
    BorradorRegla,
    ParametrosRegla,
    ReglaCorreccion,
    TipoRespuestaRegla,
} from '../types';

import Interruptor from './Interruptor';

interface TarjetaReglaProps {
    tipo: TipoRespuestaRegla;
    regla?: ReglaCorreccion;
    borrador?: BorradorRegla;
    guardando: boolean;
    error?: string;
    onCambiarParametros: (
        tipo: TipoRespuestaRegla,
        parametros: ParametrosRegla,
    ) => void;
    onCambiarActivo: (tipo: TipoRespuestaRegla, activo: boolean) => void;
    onConfigurar: (tipo: TipoRespuestaRegla) => void;
    onCancelar: (tipo: TipoRespuestaRegla) => void;
}

const CAMPO =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 transition-colors hover:border-slate-300 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const ETIQUETA = 'mb-1.5 block text-xs font-medium text-slate-600';
const AYUDA = 'mt-1.5 text-[11px] leading-relaxed text-slate-500';

interface NotaReglaProps {
    children: ReactNode;
}

function NotaRegla({ children }: NotaReglaProps) {
    return (
        <p className="flex gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-600">
            <Info
                className="mt-0.5 size-3.5 shrink-0 text-slate-400"
                aria-hidden="true"
            />
            <span>{children}</span>
        </p>
    );
}

function FilaSiempre({ etiqueta }: { etiqueta: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-600">
                {etiqueta}
            </span>
            <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white"
            >
                <Check className="size-3" />
            </span>
        </div>
    );
}

export default function TarjetaRegla({
    tipo,
    regla,
    borrador,
    guardando,
    error,
    onCambiarParametros,
    onCambiarActivo,
    onConfigurar,
    onCancelar,
}: TarjetaReglaProps) {
    const info = infoTipoRegla(tipo);
    const sinConfigurar = !regla;
    const parametros = normalizarParametros(
        tipo,
        borrador?.parametros ?? regla?.parametros ?? {},
    );
    const activo = borrador?.activo ?? regla?.activo ?? true;

    const cambioReal = borrador
        ? !regla ||
          borrador.activo !== regla.activo ||
          !sonParametrosIguales(
              tipo,
              borrador.parametros,
              regla.parametros,
          )
        : false;

    const modoMultiple = modoCalificacionMultiple(parametros);
    const ayudaMultiple =
        MODOS_CALIFICACION_MULTIPLE.find(
            (modo) => modo.valor === modoMultiple,
        )?.ayuda ?? '';

    const textoEstado = sinConfigurar
        ? 'Sin regla configurada'
        : borrador
          ? cambioReal
              ? 'Cambios sin guardar'
              : 'Sin cambios pendientes'
          : '';

    const esAutomatica = info.estrategia === 'automatica';

    return (
        <Card
            role="article"
            aria-labelledby={`titulo-${tipo}`}
            className="flex h-full flex-col p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2
                        id={`titulo-${tipo}`}
                        className="text-[15px] leading-tight font-semibold text-slate-900"
                    >
                        {info.label}
                    </h2>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        {info.descripcion}
                    </p>
                </div>

                <Badge
                    tono={esAutomatica ? 'blue' : 'amber'}
                    className={cn(
                        'shrink-0 rounded-md border-0 px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase',
                        esAutomatica
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-amber-100 text-amber-800',
                    )}
                >
                    {esAutomatica ? 'Automática' : 'Revisión manual'}
                </Badge>
            </div>

            <div className="mt-4 flex-1 space-y-4">
                {tipo === 'opcion_unica' ? (
                    <>
                        <FilaSiempre etiqueta="Puntaje completo solo si coincide" />
                        <p className={AYUDA}>
                            La opción correcta se define en cada pregunta.
                        </p>
                    </>
                ) : null}

                {tipo === 'opcion_multiple' ? (
                    <div>
                        <label
                            htmlFor={`${tipo}-modo`}
                            className={ETIQUETA}
                        >
                            Modo de calificación
                        </label>
                        <select
                            id={`${tipo}-modo`}
                            value={modoMultiple}
                            onChange={(evento) =>
                                onCambiarParametros(tipo, {
                                    ...parametros,
                                    ...parametrosDeModoCalificacion(
                                        evento.target
                                            .value as typeof modoMultiple,
                                    ),
                                })
                            }
                            disabled={guardando}
                            className={CAMPO}
                        >
                            {MODOS_CALIFICACION_MULTIPLE.map((modo) => (
                                <option key={modo.valor} value={modo.valor}>
                                    {modo.label}
                                </option>
                            ))}
                        </select>
                        <p className={AYUDA}>{ayudaMultiple}</p>
                    </div>
                ) : null}

                {tipo === 'verdadero_falso' ? (
                    <NotaRegla>
                        La respuesta correcta se define en cada pregunta. La
                        regla aplica la corrección automática.
                    </NotaRegla>
                ) : null}

                {tipo === 'numerica' ? (
                    <>
                        <div>
                            <label
                                htmlFor={`${tipo}-redondeo`}
                                className={ETIQUETA}
                            >
                                Redondeo de decimales
                            </label>
                            <select
                                id={`${tipo}-redondeo`}
                                value={parametros.redondeo_decimales ?? 2}
                                onChange={(evento) =>
                                    onCambiarParametros(tipo, {
                                        ...parametros,
                                        redondeo_decimales: Number(
                                            evento.target.value,
                                        ),
                                    })
                                }
                                disabled={guardando}
                                className={CAMPO}
                            >
                                {[0, 1, 2, 3, 4, 5, 6].map((decimales) => (
                                    <option
                                        key={decimales}
                                        value={decimales}
                                    >
                                        {decimales}{' '}
                                        {decimales === 1
                                            ? 'decimal'
                                            : 'decimales'}
                                    </option>
                                ))}
                            </select>
                            <p className={AYUDA}>
                                Cantidad de decimales que se conservan al
                                calificar.
                            </p>
                        </div>

                        <NotaRegla>
                            La respuesta esperada y la tolerancia se definen en
                            cada pregunta.
                        </NotaRegla>
                    </>
                ) : null}

                {tipo === 'desarrollo' ? (
                    <>
                        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <p className="text-[11px] font-semibold text-slate-700">
                                Rúbrica de evaluación
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                Los criterios y porcentajes de la rúbrica se
                                definen en cada pregunta.
                            </p>
                        </div>

                        <FilaSiempre etiqueta="Requiere revisión del docente" />

                        <div className="rounded-lg bg-amber-50 px-2.5 py-2">
                            <p className="text-[11px] font-semibold text-amber-800">
                                Revisión manual mediante rúbrica
                            </p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                                Las respuestas abiertas no se autocorrigen.
                            </p>
                        </div>
                    </>
                ) : null}
            </div>

            {error ? (
                <p
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                    {error}
                </p>
            ) : null}

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                <Interruptor
                    id={`${tipo}-activo`}
                    etiqueta="Regla activa"
                    checked={activo}
                    onChange={(valor) => onCambiarActivo(tipo, valor)}
                    disabled={guardando}
                />

                {(textoEstado || borrador) && (
                    <div className="flex items-center justify-between gap-3">
                        <span
                            className={cn(
                                'text-[11px] font-medium',
                                cambioReal
                                    ? 'text-amber-600'
                                    : 'text-slate-400',
                            )}
                        >
                            {textoEstado}
                        </span>

                        {borrador ? (
                            <button
                                type="button"
                                onClick={() => onCancelar(tipo)}
                                disabled={guardando}
                                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                        ) : null}

                        {sinConfigurar && !borrador ? (
                            <button
                                type="button"
                                onClick={() => onConfigurar(tipo)}
                                disabled={guardando}
                                className="text-[11px] font-semibold text-violet-700 hover:text-violet-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Configurar regla
                            </button>
                        ) : null}
                    </div>
                )}
            </div>
        </Card>
    );
}
