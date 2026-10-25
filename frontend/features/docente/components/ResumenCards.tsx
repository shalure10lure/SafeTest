import { AlignLeft, ClipboardList, StickyNote, User } from 'lucide-react';

import { StatCard } from '@/components/ui/Card';
import type { ResumenDocente } from '../types';

export default function ResumenCards({
    resumen,
}: {
    resumen: ResumenDocente;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
                etiqueta="Preguntas en banco"
                valor={resumen.preguntasEnBanco}
                icono={AlignLeft}
                tono="violet"
            />
            <StatCard
                etiqueta="Exámenes activos"
                valor={resumen.examenesActivos}
                icono={ClipboardList}
                tono="blue"
            />
            <StatCard
                etiqueta="Por corregir"
                valor={resumen.porCorregir}
                icono={StickyNote}
                tono="amber"
            />
            <StatCard
                etiqueta="Estudiantes totales"
                valor={resumen.estudiantesTotales}
                icono={User}
                tono="emerald"
            />
        </div>
    );
}