'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import RoleGuard from '@/features/auth/components/RoleGuard';
import { PeriodoForm } from '@/features/periodos/components/PeriodoForm';
import { periodosService } from '@/features/periodos/services/periodos.service';
import type { Periodo } from '@/features/periodos/types';

export default function EditarPeriodoPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();

    const [periodo, setPeriodo] = useState<Periodo | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        periodosService
            .getById(Number(id))
            .then(setPeriodo)
            .catch(() => setError('Periodo no encontrado'));
    }, [id]);

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto max-w-5xl p-8">
                <h1 className="mb-4 text-xl font-semibold">Editar periodo</h1>

                {error && <p className="text-sm text-red-600">{error}</p>}
                {!periodo && !error && <p className="text-sm">Cargando...</p>}

                {periodo && (
                    <PeriodoForm
                        periodoEditar={periodo}
                        onGuardado={() => router.push('/docente/periodos')}
                        onCancelar={() => router.push('/docente/periodos')}
                    />
                )}
            </main>
        </RoleGuard>
    );
}