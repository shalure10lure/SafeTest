'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';
import Topbar, { type Migaja } from '@/components/layout/Topbar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
    ROUTES,
    buscarItemActivo,
    obtenerTopbar,
    type BadgeKey,
    type NavSection,
} from '@/constants/routes';

interface AppShellProps {
    children: ReactNode;
    navegacion: NavSection[];
    /** Chip junto al logo: "DOC", "EST"... */
    etiquetaRol: string;
    /** Nombre del rol en el breadcrumb: "Docente", "Estudiante"... */
    nombreRol: string;
    inicioHref: string;
    badges?: Partial<Record<BadgeKey, number>>;
    notificaciones?: number;
    subtituloInicio?: string;
}

export default function AppShell({
    children,
    navegacion,
    etiquetaRol,
    nombreRol,
    inicioHref,
    subtituloInicio = 'Panel de gestión · SafeTest',
    badges,
    notificaciones,
}: AppShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { usuario, logout } = useAuth();

    const [menuAbierto, setMenuAbierto] = useState(false);

    // Cerrar el menú móvil con Escape.
    useEffect(() => {
        if (!menuAbierto) return;

        function alPresionar(evento: KeyboardEvent) {
            if (evento.key === 'Escape') setMenuAbierto(false);
        }

        window.addEventListener('keydown', alPresionar);
        return () => window.removeEventListener('keydown', alPresionar);
    }, [menuAbierto]);

    const itemActivo = buscarItemActivo(pathname, navegacion, inicioHref);
    const esInicio = pathname === inicioHref;
    const topbar = obtenerTopbar(itemActivo, pathname);

    const migas: Migaja[] = [
        { label: 'SafeTest' },
        { label: nombreRol, href: inicioHref },
        ...(topbar?.seccion ? [{ label: topbar.seccion }] : []),
        {
            label: esInicio
                ? 'Inicio'
                : (topbar?.migaFinal ?? itemActivo?.label ?? ''),
        },
    ].filter((miga) => miga.label !== '');

    const primerNombre = usuario?.nombre.split(' ')[0] ?? nombreRol;

    async function cerrarSesion() {
        try {
            await logout();
        } catch {
            // useAuth ya limpia la sesión local aunque el servidor falle.
        } finally {
            router.replace(ROUTES.login);
        }
    }

    const sidebar = (
        <Sidebar
            secciones={navegacion}
            hrefActivo={itemActivo?.href}
            etiquetaRol={etiquetaRol}
            inicioHref={inicioHref}
            badges={badges}
            usuario={
                usuario ? { nombre: usuario.nombre, correo: usuario.correo } : null
            }
            onLogout={cerrarSesion}
            onNavigate={() => setMenuAbierto(false)}
        />
    );

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Sidebar fijo en escritorio */}
            <div className="hidden w-60 shrink-0 lg:block">{sidebar}</div>

            {/* Sidebar tipo cajón en móvil */}
            {menuAbierto && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <button
                        type="button"
                        aria-label="Cerrar menú"
                        onClick={() => setMenuAbierto(false)}
                        className="absolute inset-0 bg-slate-900/40"
                    />
                    <div className="relative h-full w-64 max-w-[85vw] shadow-xl">
                        {sidebar}
                    </div>
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar
                    migas={migas}
                    titulo={esInicio ? `Bienvenido, ${primerNombre}` : topbar?.titulo}
                    subtitulo={
                        esInicio ? subtituloInicio : topbar?.subtitulo
                    }
                    acciones={topbar?.acciones}
                    notificaciones={notificaciones}
                    onAbrirMenu={() => setMenuAbierto(true)}
                />

                {/* Las páginas aportan su propio <main>. */}
                <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}