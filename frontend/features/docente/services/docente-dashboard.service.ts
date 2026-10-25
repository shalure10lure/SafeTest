import type { ResumenDocente } from '../types';

/**
 * TODO(backend): el API todavía no expone preguntas ni evaluaciones.
 * Mientras tanto devolvemos datos de ejemplo con la misma forma que
 * tendrá la respuesta real. Cuando exista el endpoint, solo hay que
 * cambiar el cuerpo de `getResumen`, por ejemplo:
 *
 *   const { data } = await apiClient.get<ResumenDocente>('/docente/resumen');
 *   return data;
 */
const RESUMEN_EJEMPLO: ResumenDocente = {
    preguntasEnBanco: 8,
    examenesActivos: 3,
    porCorregir: 12,
    estudiantesTotales: 125,
    evaluacionesPorCorregir: 3,
    notificaciones: 1,
    evaluaciones: [
        {
            id: 1,
            titulo: 'Parcial 1 — Cálculo I',
            fecha: '2026-09-20',
            estudiantes: 48,
            estado: 'disponible',
        },
        {
            id: 2,
            titulo: 'Álgebra Lineal — Final',
            fecha: '2026-10-01',
            estudiantes: 35,
            estado: 'borrador',
        },
        {
            id: 3,
            titulo: 'Estadística — Quiz 2',
            fecha: '2026-09-22',
            estudiantes: 42,
            estado: 'pendiente',
        },
    ],
    preguntasPorTipo: {
        seleccion_multiple: 3,
        verdadero_falso: 2,
        respuesta_abierta: 2,
        respuesta_numerica: 1,
    },
    examenBorrador: {
        id: 2,
        titulo: 'Álgebra Lineal — Final',
        pasoActual: 2,
        descripcionPaso: 'agregar preguntas al banco',
    },
};

export const docenteDashboardService = {
    async getResumen(): Promise<ResumenDocente> {
        return RESUMEN_EJEMPLO;
    },
};