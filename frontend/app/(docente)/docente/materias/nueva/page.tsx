'use client';

import { useRouter } from 'next/navigation';

import RoleGuard from '@/features/auth/components/RoleGuard';
import { MateriaForm } from '@/features/materias/components/MateriaForm';

export default function NuevaMateriaPage() {
    const router = useRouter();

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto max-w-4xl p-8">
                <h1 className="mb-4 text-xl font-semibold">Nueva materia</h1>
                <MateriaForm
                    onGuardado={() => router.push('/docente/materias')}
                    onCancelar={() => router.push('/docente/materias')}
                />
            </main>
        </RoleGuard>
    );
}