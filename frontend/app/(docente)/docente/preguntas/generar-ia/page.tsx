'use client';

import { Sparkles } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import GeneracionIaForm from '@/features/iageneracion/components/GeneracionIaForm';

export default function GenerarPreguntasIaPage() {
    return (
        <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
            <Card className="flex items-start gap-4 p-5">
                <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600"
                    aria-hidden="true"
                >
                    <Sparkles className="size-5" />
                </span>

                <div className="min-w-0">
                    <h1 className="text-base font-semibold text-slate-900">
                        Generar preguntas con IA
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Configura la materia, el tema, el tipo y la dificultad.
                        La generación se procesa en segundo plano y podrás
                        seguir su estado desde esta página.
                    </p>
                </div>
            </Card>

            <GeneracionIaForm />
        </main>
    );
}
