import type { ReactNode } from 'react';

export default function SeccionConfiguracion({
    numero,
    titulo,
    descripcion,
    children,
}: {
    numero: number;
    titulo: string;
    descripcion?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
                {numero} · {titulo}
            </h3>

            {descripcion && (
                <p className="mt-0.5 text-xs text-slate-500">{descripcion}</p>
            )}

            <div className="mt-4">{children}</div>
        </section>
    );
}
