'use client';

import { RefreshCw } from 'lucide-react';

import Alerta from '@/components/ui/Alerta';
import AccesoNoAutorizado from '@/components/ui/AccesoNoAutorizado';
import { Card } from '@/components/ui/Card';
import { formatoPeriodo } from '../formato';
import { usePanelEstadisticas } from '../hooks/usePanelEstadisticas';
import BarrasComparacion from './BarrasComparacion';
import ComparacionPeriodosAvanzada from './ComparacionPeriodosAvanzada';
import DistribucionCalificaciones from './DistribucionCalificaciones';
import FiltrosEstadisticas from './FiltrosEstadisticas';
import PercentilesCard from './PercentilesCard';
import RendimientoPorMateria from './RendimientoPorMateria';
import TarjetasResumen from './TarjetasResumen';

/** Esqueleto gris mientras llegan los datos (evita saltos de diseño). */
function Cargando() {
    return (
        <div className="space-y-4" role="status" aria-label="Cargando estadísticas">
            <Card className="h-28 animate-pulse bg-slate-100" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <Card key={i} className="h-24 animate-pulse bg-slate-100" />
                ))}
            </div>
            <Card className="h-36 animate-pulse bg-slate-100" />
            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="h-56 animate-pulse bg-slate-100" />
                <Card className="h-56 animate-pulse bg-slate-100" />
            </div>
        </div>
    );
}

export default function PanelEstadisticasView() {
    const { datos, cargando, error, accesoDenegado, cambiarFiltro, reintentar } =
        usePanelEstadisticas();

    // Pantalla 403: el backend dijo que ese recurso es de otro docente.
    if (accesoDenegado) return <AccesoNoAutorizado />;

    // Primera carga: todavía no hay nada que mostrar.
    if (!datos && cargando) return <Cargando />;

    // Falló y no tenemos datos previos.
    if (!datos) {
        return (
            <Alerta
                tono="error"
                titulo={error?.titulo ?? 'No se pudieron cargar las estadísticas'}
                accion={
                    <button
                        type="button"
                        onClick={reintentar}
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

    // Textos de contexto para los subtítulos de las tarjetas.
    const { seleccion, filtros } = datos;
    const materia = filtros.materias.find((m) => m.materia_id === seleccion.materia_id);
    const periodo = filtros.periodos.find((p) => p.semestre_id === seleccion.semestre_id);
    const evaluacion = filtros.evaluaciones.find((e) => e.examen_id === seleccion.examen_id);
    const paralelo = filtros.paralelos.find((p) => p.paralelo_id === seleccion.paralelo_id);

    const nombreMateria = materia?.nombre ?? 'Sin materia';
    const nombrePeriodo = periodo ? formatoPeriodo(periodo.gestion) : 'Sin periodo';
    const contexto = [
        nombreMateria,
        evaluacion?.titulo ?? 'Todas las evaluaciones',
        paralelo?.nombre ?? 'Todos los paralelos',
        nombrePeriodo,
    ].join(' · ');

    const sinNotas = datos.resumen.total_rendiciones === 0;

    return (
        <div className="space-y-4">
            <FiltrosEstadisticas
                datos={datos}
                cargando={cargando}
                onCambiar={cambiarFiltro}
            />

            {/* Error al refrescar: se conservan los datos anteriores */}
            {error && (
                <Alerta
                    tono="error"
                    titulo={error.titulo}
                    accion={
                        <button
                            type="button"
                            onClick={reintentar}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                            <RefreshCw className="size-3.5" aria-hidden="true" />
                            Reintentar
                        </button>
                    }
                >
                    {error.detalle} Mientras tanto ves los últimos datos cargados.
                </Alerta>
            )}

            {sinNotas && (
                <Alerta tono="info" titulo="Todavía no hay calificaciones para estos filtros">
                    Las estadísticas se calculan solo con evaluaciones ya
                    corregidas. Prueba con otro periodo, evaluación o paralelo, o
                    revisa si tienes entregas pendientes de corrección.
                </Alerta>
            )}

            {/* Mientras recalcula, atenuamos el contenido sin ocultarlo */}
            <div
                className={`space-y-4 transition-opacity ${cargando ? 'opacity-60' : ''}`}
                aria-busy={cargando}
            >
                <TarjetasResumen resumen={datos.resumen} />

                <PercentilesCard percentiles={datos.percentiles} contexto={contexto} />

                <div className="grid gap-4 lg:grid-cols-2">
                    <RendimientoPorMateria
                        materias={datos.por_materia}
                        materiaSeleccionada={seleccion.materia_id}
                        periodo={nombrePeriodo}
                    />
                    <DistribucionCalificaciones rangos={datos.distribucion} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <BarrasComparacion
                        titulo="Comparación entre paralelos"
                        subtitulo={`${nombreMateria} · ${evaluacion?.titulo ?? 'todas las evaluaciones'} · ${nombrePeriodo}`}
                        barras={datos.por_paralelo.map((g) => ({
                            id: g.paralelo_id,
                            etiqueta: g.nombre,
                            valor: g.promedio,
                            n: g.n,
                            destacada: g.paralelo_id === seleccion.paralelo_id,
                        }))}
                    />
                    <BarrasComparacion
                        titulo="Comparación entre periodos"
                        subtitulo={`${nombreMateria} · ${paralelo?.nombre ?? 'todos los paralelos'}`}
                        barras={datos.por_periodo.map((g) => ({
                            id: g.semestre_id,
                            etiqueta: formatoPeriodo(g.periodo),
                            valor: g.promedio,
                            n: g.n,
                            destacada: g.semestre_id === seleccion.semestre_id,
                        }))}
                    />
                </div>

                <BarrasComparacion
                    titulo="Comparación entre evaluaciones"
                    subtitulo={`Promedio por evaluación en el periodo ${nombrePeriodo}`}
                    barras={datos.por_evaluacion.map((g) => ({
                        id: g.examen_id,
                        etiqueta: g.titulo,
                        valor: g.promedio,
                        n: g.n,
                        destacada: g.examen_id === seleccion.examen_id,
                    }))}
                />
            </div>

            <ComparacionPeriodosAvanzada materiaId={seleccion.materia_id} />
        </div>
    );
}
