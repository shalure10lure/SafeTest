'use client';

import { Plus } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import PreguntaForm from '@/features/preguntas/components/PreguntaForm';

export default function NuevaPreguntaPage() {
    return (
        <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
            <Card className="flex items-start gap-4 p-5">
                <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600"
                    aria-hidden="true"
                >
                    <Plus className="size-5" />
                </span>

                <div className="min-w-0">
                    <h1 className="text-base font-semibold text-slate-900">
                        Nueva pregunta
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Completa los campos para agregar la pregunta al banco.
                        Podrás usarla en cualquier evaluación posterior.
                    </p>
                </div>
            </Card>

            <PreguntaForm />
        </main>
    );
}
