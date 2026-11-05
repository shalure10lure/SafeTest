import { Sparkles } from 'lucide-react';

interface MaterialResumen {
    material_id: number;
    titulo: string;
}

interface ResumenConfiguracionIaProps {
    materia: string;
    tema: string;
    tipo: string;
    cantidad: string;
    dificultad: string;
    materiales: MaterialResumen[];
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
    return (
        <div className="flex items-start justify-between gap-3 py-2">
            <dt className="shrink-0 text-xs text-slate-500">{etiqueta}</dt>
            <dd className="min-w-0 text-right text-xs font-medium text-slate-800">
                {valor}
            </dd>
        </div>
    );
}

export default function ResumenConfiguracionIa({
    materia,
    tema,
    tipo,
    cantidad,
    dificultad,
    materiales,
}: ResumenConfiguracionIaProps) {
    return (
        <section
            aria-labelledby="resumen-configuracion"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
            <div className="flex items-center gap-2">
                <span
                    className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600"
                    aria-hidden="true"
                >
                    <Sparkles className="size-4" />
                </span>
                <h2
                    id="resumen-configuracion"
                    className="text-sm font-semibold text-slate-900"
                >
                    Resumen de la configuración
                </h2>
            </div>

            <dl className="mt-3 divide-y divide-slate-100">
                <Fila etiqueta="Materia" valor={materia} />
                <Fila etiqueta="Tema" valor={tema} />
                <Fila etiqueta="Tipo" valor={tipo} />
                <Fila etiqueta="Cantidad" valor={cantidad} />
                <Fila etiqueta="Dificultad" valor={dificultad} />
            </dl>

            <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">
                    Documentos fuente
                </p>

                {materiales.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                        {materiales.map((material) => (
                            <li
                                key={material.material_id}
                                className="flex items-start gap-1.5 text-xs font-medium text-slate-700"
                            >
                                <span
                                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-500"
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 break-words">
                                    {material.titulo}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                        Selecciona al menos un documento autorizado con texto
                        extraído para generar preguntas basadas en su
                        contenido.
                    </p>
                )}
            </div>
        </section>
    );
}
