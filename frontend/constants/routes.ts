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

/* ------------------------------------------------------------------ */
/* Rutas                                                               */
/* ------------------------------------------------------------------ */

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
        evaluacionPreguntas: (id: number) =>
            `/docente/evaluaciones/${id}/preguntas`,
        evaluacionEditar: (id: number) =>
            `/docente/evaluaciones/${id}/editar`,
        evaluacionConfiguracion: (id: number) =>
            `/docente/evaluaciones/${id}/configuracion`,
        evaluacionAsignacion: (id: number) =>
            `/docente/evaluaciones/${id}/asignacion`,
    },
    estudiante: {
        inicio: '/estudiante',
    },
} as const;

/* ------------------------------------------------------------------ */
/* Tipos de navegación (los reutiliza cualquier rol)                   */
/* ------------------------------------------------------------------ */

/** Claves de contadores que el Sidebar sabe mostrar como badge. */
export type BadgeKey = 'evaluaciones' | 'correccion';

export interface AccionTopbar {
    label: string;
    href: string;
    variante: 'primaria' | 'secundaria';
    icono?: LucideIcon;
    disponible: boolean;
}

export interface TopbarItem {
    titulo?: string;
    subtitulo?: string;
    /** Texto intermedio del breadcrumb: SafeTest > Docente > {seccion} > {label} */
    seccion?: string;
    /** Reemplaza el último texto del breadcrumb (por defecto, el label del ítem). */
    migaFinal?: string;
    acciones?: AccionTopbar[];
}

export interface RutaExtra {
    /** Rutas con parámetros que también activan el ítem (ej. /docente/evaluaciones/5/preguntas). */
    patron: RegExp;
    /** Topbar propio de esa ruta (otro paso del asistente, otro subtítulo). */
    topbar: TopbarItem;
}

export interface NavItem {
    label: string;
    href: string;
    icono: LucideIcon;
    /**
     * `false` = la pantalla todavía no existe. El ítem se muestra
     * deshabilitado en vez de llevar a un 404. Al crear la página,
     * solo hay que cambiar esto a `true`.
     */
    disponible: boolean;
    badgeKey?: BadgeKey;
    /** Qué muestra el Topbar cuando este ítem está activo. */
    topbar?: TopbarItem;
    /** Rutas dinámicas que también activan este ítem. */
    rutasExtra?: RutaExtra[];
}

export interface NavSection {
    titulo?: string;
    items: NavItem[];
}

/* ------------------------------------------------------------------ */
/* Navegación del docente                                              */
/* ------------------------------------------------------------------ */

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
            {
                label: 'Resumen',
                href: ROUTES.docente.resumen,
                icono: LayoutGrid,
                disponible: false,
            },
            {
                label: 'Mis materias',
                href: ROUTES.docente.materias,
                icono: AlignLeft,
                disponible: true,
            },
            {
                label: 'Mis periodos',
                href: ROUTES.docente.periodos,
                icono: CalendarDays,
                disponible: true,
            },
            {
                label: 'Mis paralelos',
                href: ROUTES.docente.paralelos,
                icono: LayoutGrid,
                disponible: true,
            },
            {
                label: 'Mis estudiantes',
                href: ROUTES.docente.estudiantes,
                icono: User,
                disponible: false,
            },
        ],
    },
    {
        items: [
            {
                label: 'Materiales académicos',
                href: ROUTES.docente.materiales,
                icono: FileText,
                disponible: false,
            },
        ],
    },
    {
        titulo: 'Banco de preguntas',
        items: [
            {
                label: 'Todas las preguntas',
                href: ROUTES.docente.preguntas,
                icono: AlignLeft,
                disponible: false,
            },
            {
                label: 'Crear pregunta',
                href: ROUTES.docente.preguntaNueva,
                icono: Plus,
                disponible: false,
            },
            {
                label: 'Generar con IA',
                href: ROUTES.docente.preguntaIA,
                icono: Sparkles,
                disponible: false,
            },
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
                rutasExtra: [
                    {
                        patron: /^\/docente\/evaluaciones\/\d+\/editar\/?$/,
                        topbar: {
                            seccion: 'Evaluaciones',
                            migaFinal: 'Información',
                            titulo: 'Crear evaluación',
                            subtitulo: 'Paso 1 de 5 — Información general',
                        },
                    },
                    {
                        patron: /^\/docente\/evaluaciones\/\d+\/preguntas\/?$/,
                        topbar: {
                            seccion: 'Evaluaciones',
                            migaFinal: 'Preguntas',
                            titulo: 'Crear evaluación',
                            subtitulo: 'Paso 2 de 5 — Selección de preguntas',
                        },
                    },
                    {
                        patron: /^\/docente\/evaluaciones\/\d+\/configuracion\/?$/,
                        topbar: {
                            seccion: 'Evaluaciones',
                            migaFinal: 'Configuración',
                            titulo: 'Crear evaluación',
                            subtitulo: 'Paso 3 de 5 — Configuración',
                        },
                    },
                    {
                        patron: /^\/docente\/evaluaciones\/\d+\/asignacion\/?$/,
                        topbar: {
                            seccion: 'Evaluaciones',
                            migaFinal: 'Asignación',
                            titulo: 'Crear evaluación',
                            subtitulo: 'Paso 4 de 5 — Asignación',
                        },
                    },
                ],
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
            {
                label: 'Reglas y puntajes',
                href: ROUTES.docente.reglas,
                icono: ListChecks,
                disponible: false,
            },
        ],
    },
    {
        titulo: 'Resultados',
        items: [
            {
                label: 'Resultados',
                href: ROUTES.docente.resultados,
                icono: TrendingUp,
                disponible: false,
            },
            {
                label: 'Estadísticas',
                href: ROUTES.docente.estadisticas,
                icono: ChartColumn,
                disponible: false,
            },
        ],
    },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Devuelve el ítem de menú que corresponde a la URL actual.
 * 1. Primero revisa las rutas con parámetros (`rutasExtra`).
 * 2. Después gana el href más largo, así `/docente/preguntas/nueva`
 *    activa "Crear pregunta" y no "Todas las preguntas".
 * Inicio solo coincide con la ruta exacta.
 */
export function buscarItemActivo(
    pathname: string,
    navegacion: NavSection[],
    inicioHref: string,
): NavItem | undefined {
    const items = navegacion.flatMap((seccion) => seccion.items);

    const porPatron = items.find((item) =>
        item.rutasExtra?.some((ruta) => ruta.patron.test(pathname)),
    );

    if (porPatron) return porPatron;

    const coincidencias = items.filter((item) =>
        item.href === inicioHref
            ? pathname === inicioHref
            : pathname === item.href || pathname.startsWith(`${item.href}/`),
    );

    return coincidencias.sort((a, b) => b.href.length - a.href.length)[0];
}

/** Topbar que corresponde a la URL: el de la ruta extra, o el del ítem. */
export function obtenerTopbar(
    item: NavItem | undefined,
    pathname: string,
): TopbarItem | undefined {
    const extra = item?.rutasExtra?.find((ruta) => ruta.patron.test(pathname));

    return extra?.topbar ?? item?.topbar;
}