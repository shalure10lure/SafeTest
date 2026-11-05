'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';
import RoleGuard from '@/features/auth/components/RoleGuard';
import FiltrosMateriales from '@/features/materiales/components/FiltrosMateriales';
import MaterialList from '@/features/materiales/components/MaterialList';
import { useMateriales } from '@/features/materiales/hooks/useMateriales';
import { useMaterias } from '@/features/materias/hooks/useMaterias';

export default function MaterialesPage() {
    const [buscar, setBuscar] = useState('');
    const [materiaId, setMateriaId] = useState('');
    const [estado, setEstado] = useState('');
    const [autorizado, setAutorizado] = useState('');

    const {
        materias,
        isLoading: cargandoMaterias,
        error: errorMaterias,
    } = useMaterias();

    const materiasActivas = useMemo(
        () => materias.filter((materia) => materia.activo),
        [materias],
    );

    const filtros = useMemo(
        () => ({
            materia_id: materiaId ? Number(materiaId) : undefined,
        }),
        [materiaId],
    );

    const { materiales, isLoading, error, cargar } = useMateriales(filtros);

    // Búsqueda y filtros de estado se aplican sobre la lista ya cargada.
    const materialesFiltrados = useMemo(() => {
        const texto = buscar.trim().toLowerCase();

        return materiales.filter((material) => {
            if (
                estado &&
                material.estado_extraccion.estado !== estado
            ) {
                return false;
            }

            if (
                autorizado &&
                String(material.autorizado_ia) !== autorizado
            ) {
                return false;
            }

            if (!texto) return true;

            return [
                material.titulo,
                material.nombre_archivo,
                material.materia ?? '',
                material.tema ?? '',
            ].some((valor) => valor.toLowerCase().includes(texto));
        });
    }, [materiales, buscar, estado, autorizado]);

    const hayFiltros = Boolean(
        buscar.trim() || materiaId || estado || autorizado,
    );

    function limpiarFiltros() {
        setBuscar('');
        setMateriaId('');
        setEstado('');
        setAutorizado('');
    }

    return (
        <RoleGuard rolPermitido="docente">
            <main className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-600" aria-live="polite">
                        <span className="font-semibold text-slate-900">
                            {materialesFiltrados.length}
                        </span>{' '}
                        {materialesFiltrados.length === 1
                            ? 'material encontrado'
                            : 'materiales encontrados'}
                    </p>

                    <div className="flex items-center gap-2">
                        {isLoading && materiales.length > 0 && (
                            <span className="text-xs text-slate-400">
                                Actualizando...
                            </span>
                        )}

                        <LinkButton
                            href={ROUTES.docente.materialNuevo}
                            variante="primaria"
                            icono={Plus}
                            className="sm:hidden"
                        >
                            Subir material
                        </LinkButton>
                    </div>
                </div>

                {errorMaterias && (
                    <p
                        role="alert"
                        className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                    >
                        {errorMaterias} Los filtros por materia no estarán
                        disponibles.
                    </p>
                )}

                <FiltrosMateriales
                    buscar={buscar}
                    onBuscar={setBuscar}
                    materiaId={materiaId}
                    onMateria={setMateriaId}
                    materias={materiasActivas}
                    estado={estado}
                    onEstado={setEstado}
                    autorizado={autorizado}
                    onAutorizado={setAutorizado}
                    hayFiltros={hayFiltros}
                    onLimpiar={limpiarFiltros}
                    cargandoDatos={cargandoMaterias}
                />

                <MaterialList
                    materiales={materialesFiltrados}
                    isLoading={isLoading}
                    error={error}
                    hayFiltros={hayFiltros}
                    onLimpiarFiltros={limpiarFiltros}
                    onReintentar={() => void cargar()}
                />
            </main>
        </RoleGuard>
    );
}
