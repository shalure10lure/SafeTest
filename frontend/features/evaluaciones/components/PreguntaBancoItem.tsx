import { CircleCheck } from 'lucide-react';

import { Badge } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

import { formatearPuntos } from '../formato';
import { infoTipoPregunta } from '../tipos-pregunta';
import type { PreguntaBanco } from '../types';

interface PreguntaBancoItemProps {
    pregunta: PreguntaBanco;
    seleccionada: boolean;
    onAlternar: () => void;
}

export default function PreguntaBancoItem({
    pregunta,
    seleccionada,
    onAlternar,
}: PreguntaBancoItemProps) {
    const tipo = infoTipoPregunta(pregunta.tipo_respuesta);

    return (
        <label
            className={cn(
                'flex cursor-pointer gap-3 rounded-xl border bg-white p-4 shadow-sm transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet-600',
                seleccionada
                    ? 'border-violet-500 bg-violet-50/40 ring-1 ring-violet-500'
                    : 'border-slate-200 hover:border-slate-300',
            )}
        >
            <input
                type="checkbox"
                checked={seleccionada}
                onChange={onAlternar}
                className="mt-0.5 size-4 shrink-0 accent-violet-600"
            />

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge tono={tipo.tono} className="px-2 py-0 text-[10px]">
                        {tipo.label}
                    </Badge>

                    <span className="text-[11px] text-slate-500">
                        {pregunta.materia.nombre} · {pregunta.tema.nombre_tema} ·{' '}
                        {formatearPuntos(pregunta.puntos)} pts
                    </span>

                    <span className="ml-auto flex items-center gap-2">
                        {pregunta.usada_en > 0 && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                Usada en {pregunta.usada_en}{' '}
                                {pregunta.usada_en === 1 ? 'evaluación' : 'evaluaciones'}
                            </span>
                        )}

                        {seleccionada && (
                            <CircleCheck
                                className="size-5 text-violet-600"
                                aria-hidden="true"
                            />
                        )}
                    </span>
                </div>

                <p className="mt-1.5 text-sm text-slate-900">{pregunta.enunciado}</p>
            </div>
        </label>
    );
}