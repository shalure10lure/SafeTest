import type { ContenidoTabla } from '../types';

interface TablaRecursoProps {
    tabla: ContenidoTabla;
}

/** Dibuja una tabla de contenido de pregunta (solo lectura). */
export default function TablaRecurso({ tabla }: TablaRecursoProps) {
    const cabecera = tabla.encabezado ? tabla.filas[0] : null;
    const cuerpo = tabla.encabezado ? tabla.filas.slice(1) : tabla.filas;

    return (
        <div className="max-w-full overflow-x-auto">
            <table className="min-w-full border-collapse text-sm text-slate-800">
                {cabecera && (
                    <thead>
                        <tr>
                            {cabecera.map((celda, columna) => (
                                <th
                                    key={columna}
                                    scope="col"
                                    className="border border-slate-300 bg-slate-100 px-3 py-1.5 text-left font-semibold"
                                >
                                    {celda}
                                </th>
                            ))}
                        </tr>
                    </thead>
                )}

                <tbody>
                    {cuerpo.map((fila, indiceFila) => (
                        <tr key={indiceFila}>
                            {fila.map((celda, columna) => (
                                <td
                                    key={columna}
                                    className="border border-slate-300 px-3 py-1.5"
                                >
                                    {celda}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
