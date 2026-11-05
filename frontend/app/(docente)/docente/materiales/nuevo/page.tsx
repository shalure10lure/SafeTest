'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import RoleGuard from '@/features/auth/components/RoleGuard';
import MaterialUploadForm from '@/features/materiales/components/MaterialUploadForm';

export default function NuevoMaterialPage() {
    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
                <Link
                    href={ROUTES.docente.materiales}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-violet-700"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Volver a materiales
                </Link>

                <div>
                    <h1 className="text-xl font-semibold text-slate-900">
                        Subir material académico
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Carga un documento para que puedas consultarlo y, si lo
                        autorizas, usarlo en la generación de preguntas con IA.
                    </p>
                </div>

                <MaterialUploadForm />
            </main>
        </RoleGuard>
    );
}
