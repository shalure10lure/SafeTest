import {
    FileText,
    Image as ImageIcon,
    Sigma,
    Table2,
    type LucideIcon,
} from 'lucide-react';

interface RecursoOpcional {
    label: string;
    icono: LucideIcon;
}

const RECURSOS: RecursoOpcional[] = [
    { label: 'Imagen', icono: ImageIcon },
    { label: 'Tabla', icono: Table2 },
    { label: 'Fórmulas', icono: Sigma },
    { label: 'Contenido especializado', icono: FileText },
];

/**
 * Recursos opcionales de la pregunta.
 *
 * En esta iteración solo se muestran como referencia: la subida de archivos y
 * los editores de contenido no están implementados.
 */
export default function RecursosOpcionales() {
    return (
        <div>
            <p className="mb-2 text-sm text-slate-500">Recursos opcionales:</p>

            <div className="flex flex-wrap gap-2">
                {RECURSOS.map(({ label, icono: Icono }) => (
                    <button
                        key={label}
                        type="button"
                        disabled
                        title="Disponible en una próxima iteración"
                        className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 opacity-70"
                    >
                        <Icono className="size-3.5" aria-hidden="true" />
                        {label}
                    </button>
                ))}
            </div>

            <p className="mt-2 text-xs text-slate-500">
                La carga de imágenes, tablas, fórmulas y contenido especializado
                estará disponible en una próxima iteración.
            </p>
        </div>
    );
}
