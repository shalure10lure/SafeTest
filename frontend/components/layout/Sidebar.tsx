'use client';

import Link from 'next/link';
import { LogOut, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { BadgeKey, NavItem, NavSection } from '@/constants/routes';
import ConectarGoogleButton from
    "@/features/auth/components/ConectarGoogleButton";

export interface UsuarioSidebar {
    nombre: string;
    correo: string;
}

interface SidebarProps {
    secciones: NavSection[];
    /** Href del ítem activo (lo calcula AppShell con `buscarItemActivo`). */
    hrefActivo?: string;
    /** Texto del chip junto al logo: "DOC", "EST", etc. */
    etiquetaRol: string;
    inicioHref: string;
    badges?: Partial<Record<BadgeKey, number>>;
    usuario: UsuarioSidebar | null;
    onLogout: () => void;
    /** Se llama al navegar (sirve para cerrar el menú en móvil). */
    onNavigate?: () => void;
}

function iniciales(nombre: string): string {
    return nombre.trim().charAt(0).toUpperCase() || '?';
}

function ItemNav({
    item,
    activo,
    badge,
    onNavigate,
}: {
    item: NavItem;
    activo: boolean;
    badge?: number;
    onNavigate?: () => void;
}) {
    const Icono = item.icono;

    const contenido = (
        <>
            <Icono className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-sidebar-primary px-1 text-[10px] font-semibold text-sidebar-primary-foreground">
                    {badge}
                </span>
            )}
        </>
    );

    if (!item.disponible) {
        return (
            <span
                aria-disabled="true"
                title="Próximamente"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground"
            >
                {contenido}
            </span>
        );
    }

    return (
        <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={activo ? 'page' : undefined}
            className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sidebar-ring',
                activo
                    ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
        >
            {contenido}
        </Link>
    );
}

export default function Sidebar({
    secciones,
    hrefActivo,
    etiquetaRol,
    inicioHref,
    badges,
    usuario,
    onLogout,
    onNavigate,
}: SidebarProps) {
    return (

        <aside className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar">
            {/* Marca */}
            <Link
                href={inicioHref}
                onClick={onNavigate}
                className="flex h-15 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5"
            >
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-dark text-white">
                    <ShieldCheck className="size-4.5" aria-hidden="true" />
                </span>
                <span className="text-base font-semibold tracking-tight text-foreground">SafeTest</span>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    {etiquetaRol}
                </span>
            </Link>

            {/* Navegación */}
            <nav
                aria-label="Navegación principal"
                className="flex-1 space-y-5 overflow-y-auto px-3 py-4"

            >
                <ConectarGoogleButton />
                {secciones.map((seccion, indice) => (
                    <div key={seccion.titulo ?? `seccion-${indice}`}>
                        {seccion.titulo && (
                            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                {seccion.titulo}
                            </p>
                        )}

                        <div className="space-y-1">
                            {seccion.items.map((item) => (
                                <ItemNav
                                    key={item.href}
                                    item={item}
                                    activo={item.href === hrefActivo}
                                    badge={item.badgeKey ? badges?.[item.badgeKey] : undefined}
                                    onNavigate={onNavigate}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Sesión: es una acción, no una ruta */}
                <div>
                    <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Sesión
                    </p>

                    <button
                        type="button"
                        onClick={onLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-slate-100 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sidebar-ring"
                    >
                        <LogOut className="size-4 shrink-0" aria-hidden="true" />
                        Cerrar sesión
                    </button>
                </div>
            </nav>

            {/* Usuario */}
            <div className="flex shrink-0 items-center gap-3 border-t border-sidebar-border p-4">
                <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
                    aria-hidden="true"
                >
                    {usuario ? iniciales(usuario.nombre) : '?'}
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                        {usuario?.nombre ?? 'Usuario'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {usuario?.correo ?? ''}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onLogout}
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-sidebar-ring"
                >
                    <LogOut className="size-4" aria-hidden="true" />
                </button>
            </div>
        </aside>
    );
}
