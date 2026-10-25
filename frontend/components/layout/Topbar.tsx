'use client';

import Link from 'next/link';
import { Bell, ChevronRight, Menu } from 'lucide-react';

import LinkButton from '@/components/ui/LinkButton';
import type { AccionTopbar } from '@/constants/routes';

export interface Migaja {
    label: string;
    href?: string;
}

interface TopbarProps {
    migas: Migaja[];
    /** Solo se muestra en pantallas que lo pidan (ej. Inicio). */
    titulo?: string;
    subtitulo?: string;
    acciones?: AccionTopbar[];
    notificaciones?: number;
    onAbrirMenu: () => void;
}

export default function Topbar({
    migas,
    titulo,
    subtitulo,
    acciones = [],
    notificaciones = 0,
    onAbrirMenu,
}: TopbarProps) {
    return (
        <header className="flex min-h-15 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
            {/* Botón de menú (solo móvil / tablet) */}
            <button
                type="button"
                onClick={onAbrirMenu}
                aria-label="Abrir menú"
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 lg:hidden"
            >
                <Menu className="size-5" aria-hidden="true" />
            </button>

            {/* Breadcrumb + título */}
            <div className="min-w-0 flex-1">
                <nav aria-label="Ruta de navegación">
                    <ol className="flex items-center gap-1 text-xs text-slate-500">
                        {migas.map((miga, indice) => {
                            const esUltima = indice === migas.length - 1;

                            return (
                                <li
                                    key={`${miga.label}-${indice}`}
                                    className="flex items-center gap-1"
                                >
                                    {miga.href && !esUltima ? (
                                        <Link href={miga.href} className="hover:text-slate-700">
                                            {miga.label}
                                        </Link>
                                    ) : (
                                        <span
                                            aria-current={esUltima ? 'page' : undefined}
                                            className={
                                                esUltima ? 'font-medium text-slate-700' : undefined
                                            }
                                        >
                                            {miga.label}
                                        </span>
                                    )}

                                    {!esUltima && (
                                        <ChevronRight
                                            className="size-3 text-slate-300"
                                            aria-hidden="true"
                                        />
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </nav>

                {titulo && (
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                        <h1 className="text-base font-semibold text-slate-900">
                            {titulo}
                        </h1>
                        {subtitulo && (
                            <span className="text-xs text-blue-700">{subtitulo}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Notificaciones + acciones */}
            <div className="flex shrink-0 items-center gap-2">
                <button
                    type="button"
                    aria-label={
                        notificaciones > 0
                            ? `Notificaciones (${notificaciones} sin leer)`
                            : 'Notificaciones'
                    }
                    className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                    <Bell className="size-5" aria-hidden="true" />
                    {notificaciones > 0 && (
                        <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white">
                            {notificaciones > 9 ? '9+' : notificaciones}
                        </span>
                    )}
                </button>

                {acciones.map((accion) => (
                    <LinkButton
                        key={accion.label}
                        href={accion.href}
                        variante={accion.variante}
                        icono={accion.icono}
                        disponible={accion.disponible}
                        className="hidden sm:inline-flex"
                    >
                        {accion.label}
                    </LinkButton>
                ))}
            </div>
        </header>
    );
}