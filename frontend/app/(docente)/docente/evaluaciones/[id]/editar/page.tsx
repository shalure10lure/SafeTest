'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import EvaluacionInfoForm from '@/features/evaluaciones/components/EvaluacionInfoForm';
import PasosEvaluacion from '@/features/evaluaciones/components/PasosEvaluacion';
import { mensajeDeError } from '@/features/evaluaciones/mensaje-error';
import { evaluacionesService } from '@/features/evaluaciones/services/evaluaciones.service';
import type { EvaluacionDetalle } from '@/features/evaluaciones/types';

export default function EditarEvaluacionPage() {
    const params = useParams<{ id: string }>();
    const examenId = Number(params.id);
    const valido = Number.isInteger(examenId) && examenId > 0;

    const [evaluacion, setEvaluacion] = useState<EvaluacionDetalle | null>(null);
    const [cargando, setCargando] = useState(valido);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!valido) return;

        let vigente = true;

        evaluacionesService
            .getById(examenId)
            .then((datos) => {
                if (vigente) setEvaluacion(datos);
            })
            .catch((e) => {
                if (vigente) {
                    setError(mensajeDeError(e, 'No se pudo cargar la evaluación.'));
                }
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });

        return () => {
            vigente = false;
        };
    }, [examenId, valido]);

    return (
        <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
            <PasosEvaluacion pasoActual={1} />

            <section className="max-w-xl">
                <h2 className="text-base font-semibold text-slate-900">
                    Información general
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Edita los datos básicos de la evaluación. Solo se muestran tus
                    materias y paralelos.
                </p>

                <div className="mt-5">
                    {!valido ? (
                        <p className="text-sm text-red-600" role="alert">
                            La evaluación no es válida.
                        </p>
                    ) : cargando ? (
                        <p className="text-sm text-slate-500" aria-live="polite">
                            Cargando evaluación...
                        </p>
                    ) : error || !evaluacion ? (
                        <p className="text-sm text-red-600" role="alert">
                            {error || 'No se pudo cargar la evaluación.'}
                        </p>
                    ) : evaluacion.estado !== 'borrador' ? (
                        <p className="text-sm text-slate-600">
                            Solo puedes editar una evaluación en borrador.{' '}
                            <Link
                                href={ROUTES.docente.evaluaciones}
                                className="font-medium text-violet-700 underline"
                            >
                                Volver a Mis evaluaciones
                            </Link>
                        </p>
                    ) : (
                        <EvaluacionInfoForm evaluacion={evaluacion} />
                    )}
                </div>
            </section>
        </main>
    );
}