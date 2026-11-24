'use client';

import { useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/ToastProvider';
import RoleGuard from '@/features/auth/components/RoleGuard';
import { MateriasLoteForm } from '@/features/materias/components/MateriasLoteForm';

export default function NuevaMateriaPage() {
    const router = useRouter();
    const toast = useToast();

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto max-w-4xl p-4 sm:p-8">
                <h1 className="mb-4 text-xl font-semibold">Nuevas materias</h1>
                <MateriasLoteForm
                    onGuardado={(cantidad) => {
                        toast.exito(
                            cantidad === 1
                                ? 'Materia creada'
                                : `${cantidad} materias creadas`,
                            'Ya puedes asociarlas a un periodo.',
                        );
                        router.push('/docente/materias');
                    }}
                    onCancelar={() => router.push('/docente/materias')}
                />
            </main>
        </RoleGuard>
    );
}
