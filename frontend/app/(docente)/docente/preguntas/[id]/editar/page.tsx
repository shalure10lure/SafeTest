'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Pencil } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/constants/routes';
import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';
import PreguntaForm from '@/features/preguntas/components/PreguntaForm';
import { preguntasService } from '@/features/preguntas/services/preguntas.service';
import type { PreguntaDetalle } from '@/features/preguntas/types';

export default function EditarPreguntaPage() {
    const params = useParams<{ id: string }>();
    const id = Number(params.id);

    const [pregunta, setPregunta] = useState<PreguntaDetalle | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let vigente = true;

        async function cargar() {
            if (!Number.isInteger(id) || id <= 0) {
                setError('El identificador de la pregunta no es válido.');
                setCargando(false);
                return;
            }

            try {
                const datos = await preguntasService.getById(id);

                if (vigente) setPregunta(datos);
            } catch (err) {
                if (vigente) {
                    setError(
                        mensajeDeError(
                            err,
                            'No se pudo cargar la pregunta.',
                        ),
                    );
                }
            } finally {
                if (vigente) setCargando(false);
            }
        }

        void cargar();

        return () => {
            vigente = false;
        };
    }, [id]);

    if (cargando) {
        return (
            <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
                <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    Cargando pregunta...
                </p>
            </main>
        );
    }

    if (!pregunta) {
        return (
            <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
                <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {error || 'No se encontró la pregunta.'}
                </p>

                <Link
                    href={ROUTES.docente.preguntas}
                    className="text-sm font-medium text-violet-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                >
                    ← Volver al banco de preguntas
                </Link>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
            <Card className="flex items-start gap-4 p-5">
                <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600"
                    aria-hidden="true"
                >
                    <Pencil className="size-5" />
                </span>

                <div className="min-w-0">
                    <h1 className="text-base font-semibold text-slate-900">
                        Editar pregunta
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                        Modifica el enunciado, la clasificación, el tipo, el
                        puntaje, las opciones y la respuesta. Al guardar verás
                        la versión actualizada en el banco.
                    </p>
                </div>
            </Card>

            <PreguntaForm pregunta={pregunta} />
        </main>
    );
}