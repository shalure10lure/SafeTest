'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

import Alerta from '@/components/ui/Alerta';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/ToastProvider';
import { ROUTES } from '@/constants/routes';
import { useMaterias } from '@/features/materias/hooks/useMaterias';
import { usePeriodos } from '@/features/periodos/hooks/usePeriodos';
import { cn } from '@/lib/utils';

import { filaNueva, useAsistentePeriodo } from '../hooks/useAsistentePeriodo';
import type { ErroresFilas } from '../types';
import {
    claveExistente,
    claveNueva,
    filaVacia,
    pluralizar,
    validarMaterias,
    validarPeriodo,
} from '../utils';
import PasoMaterias from './PasoMaterias';
import PasoParalelos, { type MateriaDelAsistente } from './PasoParalelos';
import PasoPeriodo from './PasoPeriodo';
import ResumenAsistente from './ResumenAsistente';

type Paso = 1 | 2 | 3;

const PASOS: { numero: Paso; titulo: string; descripcion: string }[] = [
    { numero: 1, titulo: 'Periodo', descripcion: 'Nombre y fechas' },
    { numero: 2, titulo: 'Materias', descripcion: 'Existentes o nuevas' },
    { numero: 3, titulo: 'Paralelos', descripcion: 'Varios a la vez' },
];

const BOTON_PRIMARIO =
    'inline-flex h-10 items-center justify-center rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60';
const BOTON_SECUNDARIO =
    'inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-60';

/**
 * Asistente de 3 pasos: crea un periodo con sus materias y paralelos
 * sin pasar por tres pantallas distintas. Las pantallas de siempre
 * (Mis materias / Mis periodos / Mis paralelos) siguen funcionando igual.
 */
export default function AsistentePeriodo() {
    const router = useRouter();
    const toast = useToast();

    const asistente = useAsistentePeriodo();
    const { estado } = asistente;

    const materias = useMaterias();
    const periodos = usePeriodos();

    const [paso, setPaso] = useState<Paso>(1);
    const [erroresPeriodo, setErroresPeriodo] = useState<Record<string, string>>({});
    const [erroresLocalesMaterias, setErroresLocalesMaterias] = useState<ErroresFilas>({});
    const [errorGeneralMaterias, setErrorGeneralMaterias] = useState<string | null>(null);

    // Solo se pueden elegir materias activas
    const materiasActivas = useMemo(
        () => materias.materias.filter((m) => m.activo),
        [materias.materias],
    );

    // Periodo más reciente (por fecha de inicio): sirve para "Copiar materias"
    const periodoAnterior = useMemo(() => {
        const ordenados = [...periodos.periodos].sort(
            (a, b) =>
                (b.fecha_inicio ?? '').localeCompare(a.fecha_inicio ?? '') ||
                b.semestre_id - a.semestre_id,
        );
        return ordenados.find((p) => p.materias.length > 0) ?? null;
    }, [periodos.periodos]);

    // Materias que participan en el periodo (para el paso 3 y el resumen)
    const materiasDelPeriodo: MateriaDelAsistente[] = useMemo(() => {
        const existentes = estado.materiaIds
            .map((id) => materias.materias.find((m) => m.materia_id === id))
            .filter((m): m is NonNullable<typeof m> => !!m)
            .map((m) => ({
                clave: claveExistente(m.materia_id),
                nombre: m.nombre,
                codigo: m.codigo,
                esNueva: false,
            }));

        const nuevas = estado.materiasNuevas
            .filter((fila) => !filaVacia(fila))
            .map((fila) => ({
                clave: claveNueva(fila.clave),
                nombre: fila.nombre.trim() || 'Materia sin nombre',
                codigo: fila.codigo.trim().toUpperCase() || '—',
                esNueva: true,
            }));

        return [...existentes, ...nuevas];
    }, [estado.materiaIds, estado.materiasNuevas, materias.materias]);

    const totalParalelos = materiasDelPeriodo.reduce(
        (suma, materia) => suma + (estado.paralelos[materia.clave]?.length ?? 0),
        0,
    );

    /** Valida el paso actual y, si todo está bien, avanza. */
    function continuar() {
        if (paso === 1) {
            const errores = validarPeriodo(estado.periodo);
            setErroresPeriodo(errores);
            if (Object.keys(errores).length > 0) return;
            setPaso(2);
            return;
        }

        if (paso === 2) {
            const { general, filas } = validarMaterias(
                estado.materiaIds,
                estado.materiasNuevas,
                materias.materias.map((m) => m.codigo),
            );
            setErroresLocalesMaterias(filas);
            setErrorGeneralMaterias(general);
            if (general) return;
            setPaso(3);
        }
    }

    /** Mueve a un paso y limpia el aviso de error del envío anterior. */
    function irAPaso(destino: Paso) {
        asistente.limpiarErrorEnvio();
        setPaso(destino);
    }

    async function crear() {
        const resultado = await asistente.enviar();

        if (!resultado) return; // el error se muestra arriba; el hook ya sabe a qué paso volver

        const partes = [
            pluralizar(resultado.paralelos_creados, 'paralelo', 'paralelos'),
            resultado.materias_creadas > 0
                ? pluralizar(resultado.materias_creadas, 'materia nueva', 'materias nuevas')
                : null,
        ].filter(Boolean);

        toast.exito(
            `Periodo ${resultado.periodo.gestion} creado`,
            `Se crearon ${partes.join(' y ')}. Ya puedes invitar estudiantes y crear evaluaciones.`,
        );
        router.push(ROUTES.docente.resumen);
    }

    // Si el servidor rechazó algo, volvemos al paso donde se corrige
    const errorEnvio = asistente.errorEnvio;
    const pasoAMostrar: Paso = paso;

    return (
        <div className="mx-auto w-full max-w-3xl space-y-5">
            {/* ---------- Indicador de pasos ---------- */}
            <ol className="grid grid-cols-3 gap-2" aria-label="Pasos del asistente">
                {PASOS.map((item) => {
                    const completado = item.numero < paso;
                    const actual = item.numero === paso;

                    return (
                        <li
                            key={item.numero}
                            aria-current={actual ? 'step' : undefined}
                            className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-3 sm:text-left"
                        >
                            <span
                                className={cn(
                                    'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                                    completado && 'border-violet-600 bg-violet-600 text-white',
                                    actual && 'border-violet-600 bg-white text-violet-700',
                                    !completado && !actual && 'border-slate-300 bg-white text-slate-400',
                                )}
                            >
                                {completado ? <Check className="size-4" aria-hidden="true" /> : item.numero}
                            </span>
                            <span className="min-w-0">
                                <span
                                    className={cn(
                                        'block text-sm font-medium',
                                        actual ? 'text-slate-900' : 'text-slate-500',
                                    )}
                                >
                                    {item.titulo}
                                </span>
                                <span className="hidden text-xs text-slate-400 sm:block">
                                    {item.descripcion}
                                </span>
                            </span>
                        </li>
                    );
                })}
            </ol>

            {/* ---------- Error del envío (qué pasó + qué hacer) ---------- */}
            {errorEnvio && (
                <Alerta
                    tono="error"
                    titulo={errorEnvio.titulo}
                    onCerrar={asistente.limpiarErrorEnvio}
                    accion={
                        errorEnvio.pasoDelError !== paso ? (
                            <button
                                type="button"
                                onClick={() => irAPaso(errorEnvio.pasoDelError)}
                                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                                Ir al paso {errorEnvio.pasoDelError} para corregir
                            </button>
                        ) : undefined
                    }
                >
                    {errorEnvio.detalle}
                </Alerta>
            )}

            {/* ---------- Contenido del paso ---------- */}
            <Card className="p-4 sm:p-6">
                {pasoAMostrar === 1 && (
                    <PasoPeriodo
                        datos={estado.periodo}
                        errores={erroresPeriodo}
                        onCambiar={asistente.cambiarPeriodo}
                    />
                )}

                {pasoAMostrar === 2 && (
                    <PasoMaterias
                        materiasExistentes={materiasActivas}
                        cargando={materias.isLoading}
                        errorCarga={materias.error}
                        materiasPeriodoAnterior={periodoAnterior?.materias ?? []}
                        nombrePeriodoAnterior={periodoAnterior?.gestion ?? null}
                        materiaIds={estado.materiaIds}
                        onCambiarIds={asistente.cambiarMateriaIds}
                        nuevas={estado.materiasNuevas}
                        onCambiarNuevas={(filas) => {
                            asistente.cambiarMateriasNuevas(filas);
                            setErroresLocalesMaterias({});
                            setErrorGeneralMaterias(null);
                        }}
                        errores={{ ...erroresLocalesMaterias, ...asistente.erroresServidor }}
                        errorGeneral={errorGeneralMaterias}
                    />
                )}

                {pasoAMostrar === 3 && (
                    <div className="space-y-5">
                        <PasoParalelos
                            materias={materiasDelPeriodo}
                            paralelos={estado.paralelos}
                            onCambiar={asistente.cambiarParalelos}
                        />
                        <ResumenAsistente
                            gestion={estado.periodo.gestion}
                            totalMaterias={materiasDelPeriodo.length}
                            materiasNuevas={materiasDelPeriodo.filter((m) => m.esNueva).length}
                            totalParalelos={totalParalelos}
                        />
                    </div>
                )}
            </Card>

            {/* ---------- Botones de navegación ---------- */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button
                        type="button"
                        onClick={() => router.push(ROUTES.docente.resumen)}
                        disabled={asistente.enviando}
                        className={BOTON_SECUNDARIO}
                    >
                        Cancelar
                    </button>
                    {paso > 1 && (
                        <button
                            type="button"
                            onClick={() => irAPaso((paso - 1) as Paso)}
                            disabled={asistente.enviando}
                            className={BOTON_SECUNDARIO}
                        >
                            ← Atrás
                        </button>
                    )}
                </div>

                {paso < 3 ? (
                    <button type="button" onClick={continuar} className={BOTON_PRIMARIO}>
                        Continuar →
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => void crear()}
                        disabled={asistente.enviando}
                        className={BOTON_PRIMARIO}
                    >
                        {asistente.enviando ? 'Creando…' : 'Crear periodo'}
                    </button>
                )}
            </div>

            {/* Atajo: agregar una fila vacía al entrar al paso 2 sin materias nuevas */}
            {paso === 2 && estado.materiasNuevas.length === 0 && materiasActivas.length === 0 && !materias.isLoading && (
                <button
                    type="button"
                    onClick={() => asistente.cambiarMateriasNuevas([filaNueva()])}
                    className="text-sm font-medium text-violet-700 hover:underline"
                >
                    Empezar agregando mi primera materia
                </button>
            )}
        </div>
    );
}
