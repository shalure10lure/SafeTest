'use client';

import { useMemo, useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    RefreshCw,
    Save,
} from 'lucide-react';

import { Card } from '@/components/ui/Card';

import { useReglasCorreccion } from '../hooks/useReglasCorreccion';
import {
    TIPOS_REGLA,
    normalizarParametros,
    sonParametrosIguales,
} from '../tipos';
import type {
    BorradorRegla,
    CambioRegla,
    ParametrosRegla,
    ReglaCorreccion,
    TipoRespuestaRegla,
} from '../types';

import TarjetaRegla from './TarjetaRegla';

type MapaBorradores = Partial<
    Record<TipoRespuestaRegla, BorradorRegla>
>;
type MapaErrores = Partial<Record<TipoRespuestaRegla, string>>;

export default function ReglasCorreccion() {
    const {
        reglas,
        cargando,
        errorCarga,
        guardando,
        cargar,
        guardar,
    } = useReglasCorreccion();

    const [borradores, setBorradores] = useState<MapaBorradores>({});
    const [errores, setErrores] = useState<MapaErrores>({});
    const [errorGeneral, setErrorGeneral] = useState('');
    const [exito, setExito] = useState('');

    const reglasPorTipo = useMemo(() => {
        const mapa: Partial<Record<TipoRespuestaRegla, ReglaCorreccion>> =
            {};

        for (const regla of reglas) {
            mapa[regla.tipo_respuesta] = regla;
        }

        return mapa;
    }, [reglas]);

    const cambios = useMemo<CambioRegla[]>(() => {
        return TIPOS_REGLA.flatMap(({ tipo }) => {
            const borrador = borradores[tipo];

            if (!borrador) return [];

            const regla = reglasPorTipo[tipo];
            const parametros = normalizarParametros(
                tipo,
                borrador.parametros,
            );

            if (
                regla &&
                borrador.activo === regla.activo &&
                sonParametrosIguales(tipo, parametros, regla.parametros)
            ) {
                return [];
            }

            return [
                {
                    tipo_respuesta: tipo,
                    regla_id: regla?.regla_id,
                    parametros,
                    activo: borrador.activo,
                },
            ];
        });
    }, [borradores, reglasPorTipo]);

    const hayBorradores = Object.keys(borradores).length > 0;
    const hayCambios = cambios.length > 0;

    function limpiarAvisos(tipo?: TipoRespuestaRegla) {
        setExito('');
        setErrorGeneral('');

        if (tipo) {
            setErrores((actuales) => {
                if (!actuales[tipo]) return actuales;

                const copia = { ...actuales };
                delete copia[tipo];
                return copia;
            });
        }
    }

    function actualizarBorrador(
        tipo: TipoRespuestaRegla,
        actualizar: (base: BorradorRegla) => BorradorRegla,
    ) {
        limpiarAvisos(tipo);

        setBorradores((actuales) => {
            const regla = reglasPorTipo[tipo];
            const base: BorradorRegla = actuales[tipo] ?? {
                parametros: normalizarParametros(
                    tipo,
                    regla?.parametros ?? {},
                ),
                activo: regla?.activo ?? true,
            };

            return { ...actuales, [tipo]: actualizar(base) };
        });
    }

    function configurar(tipo: TipoRespuestaRegla) {
        limpiarAvisos(tipo);

        setBorradores((actuales) => ({
            ...actuales,
            [tipo]: {
                parametros: normalizarParametros(
                    tipo,
                    reglasPorTipo[tipo]?.parametros ?? {},
                ),
                activo: reglasPorTipo[tipo]?.activo ?? true,
            },
        }));
    }

    function cambiarParametros(
        tipo: TipoRespuestaRegla,
        parametros: ParametrosRegla,
    ) {
        actualizarBorrador(tipo, (base) => ({ ...base, parametros }));
    }

    function cambiarActivo(tipo: TipoRespuestaRegla, activo: boolean) {
        actualizarBorrador(tipo, (base) => ({ ...base, activo }));
    }

    function cancelar(tipo: TipoRespuestaRegla) {
        limpiarAvisos(tipo);

        setBorradores((actuales) => {
            if (!actuales[tipo]) return actuales;

            const copia = { ...actuales };
            delete copia[tipo];
            return copia;
        });
    }

    function descartarTodo() {
        setBorradores({});
        setErrores({});
        setErrorGeneral('');
        setExito('');
    }

    async function guardarCambios() {
        if (!hayCambios || guardando) return;

        setExito('');
        setErrorGeneral('');
        setErrores({});

        const { exitosos, fallidos } = await guardar(cambios);

        if (fallidos.length > 0) {
            setErrores(
                Object.fromEntries(
                    fallidos.map((fallo) => [fallo.tipo, fallo.mensaje]),
                ) as MapaErrores,
            );

            setErrorGeneral(
                fallidos.length === 1
                    ? fallidos[0].mensaje
                    : `No se pudieron guardar ${fallidos.length} reglas. Revisa el mensaje de cada tarjeta.`,
            );
        }

        if (exitosos.length > 0) {
            setExito(
                exitosos.length === 1
                    ? 'Regla guardada correctamente.'
                    : 'Reglas guardadas correctamente.',
            );
        }

        setBorradores((actuales) => {
            const copia = { ...actuales };

            for (const tipo of exitosos) {
                delete copia[tipo];
            }

            // Un 409 indica que la regla ya existe: se retira el borrador para
            // mostrar la configuración guardada junto con el conflicto.
            for (const fallo of fallidos) {
                if (fallo.estado === 409) {
                    delete copia[fallo.tipo];
                }
            }

            return copia;
        });
    }

    return (
        <div className="min-h-[calc(100vh-3.75rem)] bg-[#f8f7fc] px-4 py-4 sm:px-6 sm:py-6">
            <main className="mx-auto w-full max-w-7xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                    role="tablist"
                    aria-label="Configuración de corrección"
                    className="inline-flex rounded-lg border border-slate-200/80 bg-white p-1 shadow-sm"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected="true"
                        className="rounded-md bg-violet-100 px-3 py-1.5 text-[13px] font-semibold text-violet-700"
                    >
                        Reglas por tipo
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected="false"
                        disabled
                        title="Próximamente"
                        className="cursor-not-allowed rounded-md px-3 py-1.5 text-[13px] font-medium text-slate-400"
                    >
                        Puntajes
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {hayBorradores && (
                        <button
                            type="button"
                            onClick={descartarTodo}
                            disabled={guardando}
                            className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Descartar cambios
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={guardarCambios}
                        disabled={!hayCambios || guardando || cargando}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {guardando ? (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <Save className="size-4" aria-hidden="true" />
                        )}
                        {guardando ? 'Guardando...' : 'Guardar reglas'}
                    </button>
                </div>
            </div>

            {exito && (
                <div
                    role="status"
                    className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                >
                    <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
                        aria-hidden="true"
                    />
                    <p>{exito}</p>
                </div>
            )}

            {errorGeneral && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                    <AlertCircle
                        className="mt-0.5 size-4 shrink-0 text-red-600"
                        aria-hidden="true"
                    />
                    <p>{errorGeneral}</p>
                </div>
            )}

            {cargando && (
                <div
                    role="status"
                    aria-live="polite"
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                >
                    <span className="sr-only">
                        Cargando reglas de corrección...
                    </span>
                    {TIPOS_REGLA.map(({ tipo }) => (
                        <Card
                            key={tipo}
                            className="space-y-3 p-4 sm:p-5"
                            aria-hidden="true"
                        >
                            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                            <div className="mt-4 h-16 animate-pulse rounded-lg bg-slate-100" />
                        </Card>
                    ))}
                </div>
            )}

            {!cargando && errorCarga && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-5"
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle
                            className="mt-0.5 size-5 shrink-0 text-red-600"
                            aria-hidden="true"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-red-800">
                                No se pudieron cargar las reglas
                            </p>
                            <p className="mt-1 text-sm text-red-700">
                                {errorCarga}
                            </p>
                            <button
                                type="button"
                                onClick={cargar}
                                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                            >
                                <RefreshCw
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!cargando && !errorCarga && (
                <>
                    {reglas.length === 0 && (
                        <div
                            role="status"
                            className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-3"
                        >
                            <p className="text-[13px] font-semibold text-slate-900">
                                Aún no tienes reglas de corrección
                            </p>
                            <p className="mt-0.5 text-xs text-slate-600">
                                Ajusta cada tipo y guarda los cambios para
                                crear tu configuración.
                            </p>
                        </div>
                    )}

                    <section
                        aria-label="Reglas por tipo de pregunta"
                        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                    >
                        {TIPOS_REGLA.map(({ tipo }) => (
                            <TarjetaRegla
                                key={tipo}
                                tipo={tipo}
                                regla={reglasPorTipo[tipo]}
                                borrador={borradores[tipo]}
                                guardando={guardando}
                                error={errores[tipo]}
                                onCambiarParametros={cambiarParametros}
                                onCambiarActivo={cambiarActivo}
                                onConfigurar={configurar}
                                onCancelar={cancelar}
                            />
                        ))}
                    </section>

                    <p className="text-[11px] leading-relaxed text-slate-500">
                        La configuración se guarda por tipo de pregunta. Las
                        respuestas correctas, tolerancias y rúbricas se definen
                        en cada pregunta y no se almacenan aquí.
                    </p>
                </>
            )}
            </main>
        </div>
    );
}
