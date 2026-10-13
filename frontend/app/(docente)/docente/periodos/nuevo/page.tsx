'use client';

import { useRouter } from 'next/navigation';

import RoleGuard from '@/features/auth/components/RoleGuard';
import { PeriodoForm } from '@/features/periodos/components/PeriodoForm';

export default function NuevoPeriodoPage() {
    const router = useRouter();

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto max-w-5xl p-8">
                <h1 className="mb-4 text-xl font-semibold">Nuevo periodo</h1>
                <PeriodoForm
                    onGuardado={() => router.push('/docente/periodos')}
                    onCancelar={() => router.push('/docente/periodos')}
                />
            </main>
        </RoleGuard>
    );
}