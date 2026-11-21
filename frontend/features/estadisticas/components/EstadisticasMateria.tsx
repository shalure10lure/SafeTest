
'use client';

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from 'recharts';

import type {
    EstadisticasMateria as EstadisticasMateriaType,
    MateriaEstadistica,
} from '../types';
import type { Periodo } from '@/features/periodos/types';

interface EstadisticasMateriaProps {
    materias: MateriaEstadistica[];
    materiaSeleccionada: number | null;
    onSeleccionarMateria: (id: number) => void;
    estadisticas: EstadisticasMateriaType | null;
    isLoading: boolean;
    error: string | null;
    periodosDisponibles: Periodo[];
}

function TarjetaEstadistica({
    titulo,
    valor,
}: {
    titulo: string;
    valor: string | number;
}) {
    return (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{titulo}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
                {valor}
            </p>
        </article>
    );
}

function SeccionGrafico({
    titulo,
    descripcion,
    children,
}: {
    titulo: string;
    descripcion: string;
    children: React.ReactNode;
}) {
    return (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">{titulo}</h3>
            <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
            <div className="mt-5 h-80 w-full">
                {children}
            </div>
        </article>
    );
}

function SinDatos() {
    return (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No hay datos suficientes para mostrar este gráfico.
        </div>
    );
}

export function EstadisticasMateria({
    materias,
    materiaSeleccionada,
    onSeleccionarMateria,
    estadisticas,
    isLoading,
    error,
    periodosDisponibles,
}: EstadisticasMateriaProps) {

    const periodosFiltrados = estadisticas?.por_periodo.filter(
        (dato) =>
            periodosDisponibles.some(
                (periodo) => periodo.semestre_id === dato.semestre_id,
            ),
    ) ?? [];

    return (
        <section className="space-y-6">
            <div className="max-w-md space-y-2">
                <label
                    htmlFor="materia-estadisticas"
                    className="text-sm font-medium text-slate-700"
                >
                    Seleccionar materia
                </label>

                <select
                    id="materia-estadisticas"
                    value={materiaSeleccionada ?? ''}
                    onChange={(event) =>
                        onSeleccionarMateria(Number(event.target.value))
                    }
                    disabled={materias.length === 0 || isLoading}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                    {materias.length === 0 && (
                        <option value="">No hay materias disponibles</option>
                    )}

                    {materias.map((materia) => (
                        <option
                            key={materia.materia_id}
                            value={materia.materia_id}
                        >
                            {materia.codigo} - {materia.nombre}
                        </option>
                    ))}
                </select>
            </div>

            {isLoading && (
                <p className="text-sm text-slate-500">
                    Cargando estadísticas...
                </p>
            )}

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            {!isLoading && !error && materias.length === 0 && (
                <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
                    No tienes materias registradas para consultar estadísticas.
                </p>
            )}

            {!isLoading && !error && estadisticas && (
                <>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            {estadisticas.materia.nombre}
                        </h2>
                        <p className="text-sm text-slate-500">
                            Código: {estadisticas.materia.codigo}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <TarjetaEstadistica
                            titulo="Estudiantes"
                            valor={estadisticas.total_estudiantes}
                        />

                        <TarjetaEstadistica
                            titulo="Evaluaciones"
                            valor={estadisticas.total_evaluaciones}
                        />

                        <TarjetaEstadistica
                            titulo="Promedio general"
                            valor={estadisticas.promedio?.toFixed(2) ?? 'Sin datos'}
                        />

                        <TarjetaEstadistica
                            titulo="Nota máxima"
                            valor={estadisticas.nota_maxima?.toFixed(2) ?? 'Sin datos'}
                        />

                        <TarjetaEstadistica
                            titulo="Nota mínima"
                            valor={estadisticas.nota_minima?.toFixed(2) ?? 'Sin datos'}
                        />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <SeccionGrafico
                            titulo="Promedio por evaluación"
                            descripcion="Compara las calificaciones promedio de cada evaluación."
                        >
                            {estadisticas.por_evaluacion.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={estadisticas.por_evaluacion}
                                        margin={{ top: 10, right: 15, left: 0, bottom: 45 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="titulo"
                                            angle={-25}
                                            textAnchor="end"
                                            interval={0}
                                            height={65}
                                            fontSize={11}
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar
                                            dataKey="promedio"
                                            name="Promedio"
                                            fill="#2563eb"
                                            radius={[5, 5, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <SinDatos />
                            )}
                        </SeccionGrafico>

                        <SeccionGrafico
                            titulo="Promedio por periodo"
                            descripcion="Observa cómo varía el rendimiento entre periodos académicos."
                        >
                            {periodosFiltrados.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={periodosFiltrados}
                                        margin={{ top: 10, right: 15, left: 0, bottom: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="periodo" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="promedio"
                                            name="Promedio"
                                            stroke="#2563eb"
                                            strokeWidth={3}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <SinDatos />
                            )}
                        </SeccionGrafico>

                        <SeccionGrafico
                            titulo="Promedio por paralelo"
                            descripcion="Compara los promedios obtenidos en cada paralelo."
                        >
                            {estadisticas.por_paralelo.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={estadisticas.por_paralelo}
                                        margin={{ top: 15, right: 20, left: 0, bottom: 55 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="nombre"
                                            interval={0}
                                            angle={-25}
                                            textAnchor="end"
                                            height={70}
                                            fontSize={11}
                                            tickMargin={12}
                                        />
                                        <YAxis />
                                        <Tooltip
                                            formatter={(valor) => [
                                                `${Number(valor).toFixed(2)}`,
                                                'Promedio',
                                            ]}
                                            labelFormatter={(nombre) => `Paralelo: ${nombre}`}
                                        />
                                        <Bar
                                            dataKey="promedio"
                                            name="Promedio"
                                            fill="#0f766e"
                                            radius={[5, 5, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <SinDatos />
                            )}
                        </SeccionGrafico>
                    </div>

                    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 p-5">
                            <h3 className="font-semibold text-slate-900">
                                Detalle de evaluaciones
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Resultados de las evaluaciones de esta materia.
                            </p>
                        </div>

                        {estadisticas.por_evaluacion.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="px-5 py-3">Evaluación</th>
                                            <th className="px-5 py-3">Periodo</th>
                                            <th className="px-5 py-3">Rendiciones</th>
                                            <th className="px-5 py-3">Promedio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {estadisticas.por_evaluacion.map((evaluacion) => (
                                            <tr key={evaluacion.examen_id}>
                                                <td className="px-5 py-3 font-medium text-slate-800">
                                                    {evaluacion.titulo}
                                                </td>
                                                <td className="px-5 py-3 text-slate-600">
                                                    {evaluacion.periodo}
                                                </td>
                                                <td className="px-5 py-3 text-slate-600">
                                                    {evaluacion.total_rendiciones}
                                                </td>
                                                <td className="px-5 py-3 font-medium text-slate-800">
                                                    {evaluacion.promedio?.toFixed(2) ?? 'Sin datos'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="p-5 text-sm text-slate-500">
                                No hay evaluaciones corregidas disponibles.
                            </p>
                        )}
                    </article>
                </>
            )}
        </section>
    );
}
