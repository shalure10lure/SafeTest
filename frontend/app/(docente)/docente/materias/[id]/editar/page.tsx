'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import RoleGuard from '@/features/auth/components/RoleGuard';
import { MateriaForm } from '@/features/materias/components/MateriaForm';
import { materiasService } from '@/features/materias/services/materias.service';
import type { Materia } from '@/features/materias/types';

export default function EditarMateriaPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();

    const [materia, setMateria] = useState<Materia | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        materiasService
            .getById(Number(id))
            .then(setMateria)
            .catch(() => setError('Materia no encontrada'));
    }, [id]);

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto max-w-4xl p-8">
                <h1 className="mb-4 text-xl font-semibold">Editar materia</h1>

                {error && <p className="text-sm text-red-600">{error}</p>}
                {!materia && !error && <p className="text-sm">Cargando...</p>}

                {materia && (
                    <MateriaForm
                        materiaEditar={materia}
                        onGuardado={() => router.push('/docente/materias')}
                        onCancelar={() => router.push('/docente/materias')}
                    />
                )}
            </main>
        </RoleGuard>
    );
}