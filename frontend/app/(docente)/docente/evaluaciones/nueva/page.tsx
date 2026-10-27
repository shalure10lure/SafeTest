import EvaluacionInfoForm from '@/features/evaluaciones/components/EvaluacionInfoForm';
import PasosEvaluacion from '@/features/evaluaciones/components/PasosEvaluacion';

export default function CrearEvaluacionPage() {
    return (
        <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
            <PasosEvaluacion pasoActual={1} />

            <section className="max-w-xl">
                <h2 className="text-base font-semibold text-slate-900">
                    Información general
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Define los datos básicos de la evaluación. Solo se muestran tus
                    materias y paralelos.
                </p>

                <div className="mt-5">
                    <EvaluacionInfoForm />
                </div>
            </section>
        </main>
    );
}