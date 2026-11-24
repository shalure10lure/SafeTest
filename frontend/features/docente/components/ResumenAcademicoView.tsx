'use client';

import Link from 'next/link';
import {
    AlignLeft,
    ArrowRight,
    CalendarDays,
    LayoutGrid,
    RefreshCw,
    User,
    type LucideIcon,
} from 'lucide-react';

import Alerta from '@/components/ui/Alerta';
import { Card, CardHeader } from '@/components/ui/Card';
import { ROUTES } from '@/constants/routes';
import { useResumenAcademico } from '../hooks/useResumenAcademico';

/** "2026-II" -> "2026 – II" */
function formatoPeriodo(gestion: string): string {
    return gestion.replace(/\s*[-–]\s*/, ' – ');
}

function pluralizar(cantidad: number, singular: string, plural: string) {
    return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

function TarjetaGestion({
    href,
    icono: Icono,
    valor,
    titulo,
    detalle,
}: {
    href: string;
    icono: LucideIcon;
    valor: number;
    titulo: string;
    detalle: string;
}) {
    return (
        <Link
            href={href}
            className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-violet-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
            <div className="flex items-start justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                    <Icono className="size-4" aria-hidden="true" />
                </span>
                <ArrowRight
                    className="size-4 text-slate-300 transition-colors group-hover:text-violet-600"
                    aria-hidden="true"
                />
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900 tabular-nums">
                {valor}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">{titulo}</p>
            <p className="text-xs text-slate-500">{detalle}</p>
        </Link>
    );
}

function Esqueleto() {
    return (
        <div className="space-y-5" role="status" aria-label="Cargando gestión académica">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <Card key={i} className="h-36 animate-pulse bg-slate-100" />
                ))}
            </div>
            <Card className="h-56 animate-pulse bg-slate-100" />
        </div>
    );
}

/** Pantalla "Gestión académica": un vistazo a tus materias, periodos, paralelos y estudiantes. */
export default function ResumenAcademicoView() {
    const { datos, cargando, error, recargar } = useResumenAcademico();

    if (cargando && !datos) return <Esqueleto />;

    if (error || !datos) {
        return (
            <Alerta
                tono="error"
                titulo={error?.titulo ?? 'No se pudo cargar la gestión académica'}
                accion={
                    <button
                        type="button"
                        onClick={() => void recargar()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        Reintentar
                    </button>
                }
            >
                {error?.detalle}
            </Alerta>
        );
    }

    const { materias, periodos, paralelos, estudiantes, paralelosActivos } = datos;

    return (
        <div className="space-y-5">
            <Alerta tono="info">
                Solo se muestra información perteneciente a tu cuenta docente.
            </Alerta>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TarjetaGestion
                    href={ROUTES.docente.materias}
                    icono={AlignLeft}
                    valor={materias.total}
                    titulo="Mis materias"
                    detalle={pluralizar(materias.activas, 'activa', 'activas')}
                />
                <TarjetaGestion
                    href={ROUTES.docente.periodos}
                    icono={CalendarDays}
                    valor={periodos.total}
                    titulo="Mis periodos"
                    detalle={`${periodos.enCurso} en curso`}
                />
                <TarjetaGestion
                    href={ROUTES.docente.paralelos}
                    icono={LayoutGrid}
                    valor={paralelos.total}
                    titulo="Mis paralelos"
                    detalle="Asignados a ti"
                />
                <TarjetaGestion
                    href={ROUTES.docente.estudiantes}
                    icono={User}
                    valor={estudiantes.total}
                    titulo="Mis estudiantes"
                    detalle={pluralizar(
                        estudiantes.invitacionesPendientes,
                        'invitación pendiente',
                        'invitaciones pendientes',
                    )}
                />
            </div>

            <Card className="p-5">
                <CardHeader
                    titulo="Mis paralelos activos"
                    descripcion="Paralelos de los periodos que tienes activos"
                    accion={
                        <Link
                            href={ROUTES.docente.paralelos}
                            className="shrink-0 text-xs font-medium text-violet-600 hover:underline"
                        >
                            Ver todos
                        </Link>
                    }
                />

                {paralelosActivos.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                        No tienes paralelos en periodos activos. Crea un periodo y
                        un paralelo desde <strong>Mis periodos</strong> y{' '}
                        <strong>Mis paralelos</strong>.
                    </p>
                ) : (
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {paralelosActivos.map((paralelo) => (
                            <li key={paralelo.paraleloId}>
                                <Link
                                    href={`${ROUTES.docente.paralelos}/${paralelo.paraleloId}`}
                                    className="block rounded-lg border border-slate-200 p-3 transition-colors hover:border-violet-300 hover:bg-violet-50/40 focus-visible:outline-2 focus-visible:outline-violet-600"
                                >
                                    <p className="text-[11px] font-medium text-violet-600">
                                        {formatoPeriodo(paralelo.periodo)}
                                    </p>
                                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                                        {paralelo.materia}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {paralelo.nombreParalelo} ·{' '}
                                        {pluralizar(
                                            paralelo.estudiantes,
                                            'estudiante',
                                            'estudiantes',
                                        )}
                                    </p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
