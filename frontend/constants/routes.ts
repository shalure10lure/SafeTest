import {
    AlignLeft,
    CalendarDays,
    ChartColumn,
    ClipboardCheck,
    ClipboardList,
    FileText,
    House,
    LayoutGrid,
    ListChecks,
    Plus,
    Sparkles,
    TrendingUp,
    User,
    type LucideIcon,
} from 'lucide-react';

export const ROUTES = {
    login: '/login',
    docente: {
        inicio: '/docente',
        resumen: '/docente/resumen',
        materias: '/docente/materias',
        periodos: '/docente/periodos',
        paralelos: '/docente/paralelos',
        estudiantes: '/docente/estudiantes',
        materiales: '/docente/materiales',
        preguntas: '/docente/preguntas',
        preguntaNueva: '/docente/preguntas/nueva',
        preguntaIA: '/docente/preguntas/generar-ia',
        evaluaciones: '/docente/evaluaciones',
        evaluacionNueva: '/docente/evaluaciones/nueva',
        correccion: '/docente/correccion',
        reglas: '/docente/reglas',
        resultados: '/docente/resultados',
        estadisticas: '/docente/estadisticas',
    },
    estudiante: {
        inicio: '/estudiante',
    },
} as const;

/** Claves de contadores que el Sidebar sabe mostrar como badge. */
export type BadgeKey = 'evaluaciones' | 'correccion';

export interface NavItem {
    label: string;
    href: string;
    icono: LucideIcon;
    /** `false` = la pantalla todavía no existe (se muestra deshabilitado). */
    disponible: boolean;
    badgeKey?: BadgeKey;
}

export interface NavSection {
    titulo?: string;
    items: NavItem[];
}

export interface AccionTopbar {
    label: string;
    href: string;
    variante: 'primaria' | 'secundaria';
    icono?: LucideIcon;
    disponible: boolean;
}

export const NAV_DOCENTE: NavSection[] = [
    {
        titulo: 'Docente',
        items: [
            {
                label: 'Inicio',
                href: ROUTES.docente.inicio,
                icono: House,
                disponible: true,
                topbar: {
                    acciones: [
                        {
                            label: 'Gestión académica',
                            href: ROUTES.docente.materias,
                            variante: 'secundaria',
                            disponible: true,
                        },
                        {
                            label: 'Nueva pregunta',
                            href: ROUTES.docente.preguntaNueva,
                            variante: 'primaria',
                            icono: Plus,
                            disponible: false,
                        },
                    ],
                },
            },
        ],
    },
    {
        titulo: 'Gestión académica',
        items: [
            { label: 'Resumen', href: ROUTES.docente.resumen, icono: LayoutGrid, disponible: false },
            { label: 'Mis materias', href: ROUTES.docente.materias, icono: AlignLeft, disponible: true },
            { label: 'Mis periodos', href: ROUTES.docente.periodos, icono: CalendarDays, disponible: true },
            { label: 'Mis paralelos', href: ROUTES.docente.paralelos, icono: LayoutGrid, disponible: true },
            { label: 'Mis estudiantes', href: ROUTES.docente.estudiantes, icono: User, disponible: false },
        ],
    },
    {
        items: [
            { label: 'Materiales académicos', href: ROUTES.docente.materiales, icono: FileText, disponible: false },
        ],
    },
    {
        titulo: 'Banco de preguntas',
        items: [
            { label: 'Todas las preguntas', href: ROUTES.docente.preguntas, icono: AlignLeft, disponible: false },
            { label: 'Crear pregunta', href: ROUTES.docente.preguntaNueva, icono: Plus, disponible: false },
            { label: 'Generar con IA', href: ROUTES.docente.preguntaIA, icono: Sparkles, disponible: false },
        ],
    },
    {
        titulo: 'Evaluaciones',
        items: [
            {
                label: 'Mis evaluaciones',
                href: ROUTES.docente.evaluaciones,
                icono: ClipboardList,
                disponible: true,
                badgeKey: 'evaluaciones',
                topbar: {
                    seccion: 'Evaluaciones',
                    titulo: 'Mis evaluaciones',
                    subtitulo: 'Gestión de todas tus evaluaciones',
                    acciones: [
                        {
                            label: 'Crear evaluación',
                            href: ROUTES.docente.evaluacionNueva,
                            variante: 'primaria',
                            icono: Plus,
                            disponible: true,
                        },
                    ],
                },
            },
            {
                label: 'Crear evaluación',
                href: ROUTES.docente.evaluacionNueva,
                icono: Plus,
                disponible: true,
                topbar: {
                    seccion: 'Evaluaciones',
                    migaFinal: 'Información',
                    titulo: 'Crear evaluación',
                    subtitulo: 'Paso 1 de 5 — Información general',
                },
            },
        ],
    },
    {
        titulo: 'Corrección',
        items: [
            {
                label: 'Evaluaciones entregadas',
                href: ROUTES.docente.correccion,
                icono: ClipboardCheck,
                disponible: false,
                badgeKey: 'correccion',
            },
            { label: 'Reglas y puntajes', href: ROUTES.docente.reglas, icono: ListChecks, disponible: false },
        ],
    },
    {
        titulo: 'Resultados',
        items: [
            { label: 'Resultados', href: ROUTES.docente.resultados, icono: TrendingUp, disponible: false },
            { label: 'Estadísticas', href: ROUTES.docente.estadisticas, icono: ChartColumn, disponible: false },
        ],
    },
];


/**
 * Devuelve el ítem de menú que corresponde a la URL actual.
 * Gana el href más largo, así `/docente/preguntas/nueva` activa
 * "Crear pregunta" y no "Todas las preguntas".
 * Inicio solo coincide con la ruta exacta.
 */
export function buscarItemActivo(
    pathname: string,
    navegacion: NavSection[],
    inicioHref: string,
): NavItem | undefined {
    const coincidencias = navegacion
        .flatMap((seccion) => seccion.items)
        .filter((item) =>
            item.href === inicioHref
                ? pathname === inicioHref
                : pathname === item.href || pathname.startsWith(`${item.href}/`),
        );

    return coincidencias.sort((a, b) => b.href.length - a.href.length)[0];
}

export interface TopbarItem {
    titulo?: string;
    subtitulo?: string;
    /** Texto intermedio del breadcrumb: SafeTest > Docente > {seccion} > {label} */
    seccion?: string;
    acciones?: AccionTopbar[];
    migaFinal?: string;
}

export interface NavItem {
    label: string;
    href: string;
    icono: LucideIcon;
    /** `false` = la pantalla todavía no existe (se muestra deshabilitado). */
    disponible: boolean;
    badgeKey?: BadgeKey;
    /** Qué muestra el Topbar cuando este ítem está activo. */
    topbar?: TopbarItem;
}