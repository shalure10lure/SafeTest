import { pluralizar } from '../utils';

interface ResumenAsistenteProps {
    gestion: string;
    totalMaterias: number;
    materiasNuevas: number;
    totalParalelos: number;
}

/** Tarjeta con lo que se va a crear al pulsar "Crear periodo". */
export default function ResumenAsistente({
    gestion,
    totalMaterias,
    materiasNuevas,
    totalParalelos,
}: ResumenAsistenteProps) {
    return (
        <section
            aria-label="Resumen de lo que se va a crear"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm"
        >
            <p className="font-semibold text-emerald-900">Listo para crear</p>
            <ul className="mt-2 space-y-1 text-slate-700">
                <li>
                    • El periodo <strong>{gestion.trim() || '—'}</strong>
                </li>
                <li>
                    • {pluralizar(totalMaterias, 'materia', 'materias')} asociadas
                    {materiasNuevas > 0 && (
                        <span className="text-slate-500">
                            {' '}
                            ({materiasNuevas} {materiasNuevas === 1 ? 'se creará' : 'se crearán'} ahora)
                        </span>
                    )}
                </li>
                <li>• {pluralizar(totalParalelos, 'paralelo', 'paralelos')}</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
                Todo se guarda junto: si algo falla, no se crea nada a medias.
            </p>
        </section>
    );
}
