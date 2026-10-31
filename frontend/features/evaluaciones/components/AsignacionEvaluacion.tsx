'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Users } from 'lucide-react';

import LinkButton from '@/components/ui/LinkButton';
import { ROUTES } from '@/constants/routes';

import { mensajeDeError } from '../mensaje-error';
import { evaluacionesService } from '../services/evaluaciones.service';
import type {
    AsignacionDisponible,
    AsignacionParalelo,
    ModoAsignacion,
} from '../types';
import AsignacionEstudiantes from './AsignacionEstudiantes';
import AsignacionParalelos from './AsignacionParalelos';
import OpcionesRadio, { type OpcionRadio } from './OpcionesRadio';

const OPCIONES_MODO: readonly OpcionRadio<ModoAsignacion>[] = [
    {
        valor: 'paralelos',
        titulo: 'Paralelos completos',
        descripcion: 'Todos los estudiantes activos del paralelo.',
        icono: Users,
    },
    {
        valor: 'estudiantes',
        titulo: 'Estudiantes específicos',
        descripcion: 'Elige estudiantes individuales de tus paralelos.',
        icono: User,
    },
];

function FormularioAsignacion({ datos }: { datos: AsignacionDisponible }) {
    const router = useRouter();

    const materiaNombre = datos.materia?.nombre ?? 'la materia';
    const gestion = datos.semestre.gestion;

    const [modo, setModo] = useState<ModoAsignacion>(datos.modo_asignacion);
    // En modo "estudiantes" la evaluación también queda vinculada a paralelos,
    // pero la selección guardada son los estudiantes, no los paralelos.
    const [paralelosSel, setParalelosSel] = useState<number[]>(
        datos.modo_asignacion === 'paralelos'
            ? datos.paralelos
                .filter((paralelo) => paralelo.seleccionado)
                .map((paralelo) => paralelo.paralelo_id)
            : [],
    );
    const [estudiantesSel, setEstudiantesSel] = useState<number[]>(
        datos.paralelos
            .flatMap((paralelo) => paralelo.estudiantes)
            .filter((estudiante) => estudiante.seleccionado)
            .map((estudiante) => estudiante.estudiante_id),
    );

    const [intento, setIntento] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [errorGuardar, setErrorGuardar] = useState('');

    // Estudiantes que quedarían asignados con la selección actual.
    const idsAsignados =
        modo === 'paralelos'
            ? new Set(
                datos.paralelos
                    .filter((paralelo) => paralelosSel.includes(paralelo.paralelo_id))
                    .flatMap((paralelo) =>
                        paralelo.estudiantes.map((estudiante) => estudiante.estudiante_id),
                    ),
            )
            : new Set(estudiantesSel);

    const totalAsignados = idsAsignados.size;

    let mensajeFaltante = '';

    if (totalAsignados === 0) {
        if (modo === 'estudiantes') {
            mensajeFaltante = 'Selecciona al menos un estudiante.';
        } else if (paralelosSel.length === 0) {
            mensajeFaltante = 'Selecciona al menos un paralelo.';
        } else {
            mensajeFaltante =
                'Los paralelos seleccionados no tienen estudiantes inscritos.';
        }
    }

    function cambiarModo(nuevo: ModoAsignacion) {
        setModo(nuevo);

        // Al pasar a "específicos" por primera vez, se parte de los estudiantes
        // de los paralelos ya elegidos.
        if (nuevo === 'estudiantes' && estudiantesSel.length === 0) {
            setEstudiantesSel(
                datos.paralelos
                    .filter((paralelo) => paralelosSel.includes(paralelo.paralelo_id))
                    .flatMap((paralelo) =>
                        paralelo.estudiantes.map((estudiante) => estudiante.estudiante_id),
                    ),
            );
        }
    }

    function alternarParalelo(paraleloId: number) {
        setParalelosSel((actual) =>
            actual.includes(paraleloId)
                ? actual.filter((id) => id !== paraleloId)
                : [...actual, paraleloId],
        );
    }

    function alternarEstudiante(estudianteId: number) {
        setEstudiantesSel((actual) =>
            actual.includes(estudianteId)
                ? actual.filter((id) => id !== estudianteId)
                : [...actual, estudianteId],
        );
    }

    function alternarTodosDelParalelo(paralelo: AsignacionParalelo) {
        const ids = paralelo.estudiantes.map((estudiante) => estudiante.estudiante_id);
        const todos = ids.every((id) => estudiantesSel.includes(id));

        setEstudiantesSel((actual) =>
            todos
                ? actual.filter((id) => !ids.includes(id))
                : [...actual, ...ids.filter((id) => !actual.includes(id))],
        );
    }

    async function siguiente() {
        setIntento(true);
        setErrorGuardar('');

        if (mensajeFaltante) return;

        setGuardando(true);

        try {
            await evaluacionesService.guardarAsignacion(
                datos.examen_id,
                modo === 'paralelos'
                    ? { modo_asignacion: 'paralelos', paralelo_ids: paralelosSel }
                    : { modo_asignacion: 'estudiantes', estudiante_ids: estudiantesSel },
            );

            router.push(ROUTES.docente.evaluacionResumen(datos.examen_id));
        } catch (e) {
            setErrorGuardar(
                mensajeDeError(
                    e,
                    'No se pudo guardar la asignación. Inténtalo de nuevo.',
                ),
            );
            setGuardando(false);
        }
    }

    return (
        <section className="max-w-2xl space-y-5">
            <header>
                <h2 className="text-base font-semibold text-slate-900">Asignación</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Solo aparecen tus paralelos de{' '}
                    <strong className="font-semibold text-slate-900">
                        {materiaNombre} · {gestion}
                    </strong>{' '}
                    y sus estudiantes activos.
                </p>
            </header>

            {datos.paralelos.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                    No tienes paralelos de {materiaNombre} en {gestion}. Crea uno en{' '}
                    <Link
                        href={ROUTES.docente.paralelos}
                        className="font-medium text-violet-700 underline"
                    >
                        Mis paralelos
                    </Link>{' '}
                    para poder asignar la evaluación.
                </p>
            ) : (
                <>
                    <OpcionesRadio
                        nombre="modo-asignacion"
                        etiqueta="Modo de asignación"
                        valor={modo}
                        opciones={OPCIONES_MODO}
                        onCambiar={cambiarModo}
                    />

                    {modo === 'paralelos' ? (
                        <AsignacionParalelos
                            paralelos={datos.paralelos}
                            seleccionados={paralelosSel}
                            materiaNombre={materiaNombre}
                            gestion={gestion}
                            onAlternar={alternarParalelo}
                        />
                    ) : (
                        <AsignacionEstudiantes
                            paralelos={datos.paralelos}
                            seleccionados={estudiantesSel}
                            onAlternar={alternarEstudiante}
                            onAlternarParalelo={alternarTodosDelParalelo}
                        />
                    )}

                    <p className="text-sm text-slate-600" aria-live="polite">
                        <strong className="text-slate-900 tabular-nums">
                            {totalAsignados}
                        </strong>{' '}
                        {totalAsignados === 1
                            ? 'estudiante asignado'
                            : 'estudiantes asignados'}
                    </p>

                    {intento && mensajeFaltante && (
                        <p className="text-sm text-red-600" role="alert">
                            {mensajeFaltante}
                        </p>
                    )}
                </>
            )}

            {errorGuardar && (
                <p className="text-sm text-red-600" role="alert">
                    {errorGuardar}
                </p>
            )}

            <div className="flex items-center justify-between pt-1">
                <LinkButton href={ROUTES.docente.evaluacionConfiguracion(datos.examen_id)}>
                    ← Anterior
                </LinkButton>

                <button
                    type="button"
                    onClick={siguiente}
                    disabled={guardando || datos.paralelos.length === 0}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {guardando ? 'Guardando...' : 'Siguiente →'}
                </button>
            </div>
        </section>
    );
}

export default function AsignacionEvaluacion({ examenId }: { examenId: number }) {
    const [datos, setDatos] = useState<AsignacionDisponible | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let vigente = true;

        evaluacionesService
            .getAsignacion(examenId)
            .then((respuesta) => {
                if (vigente) setDatos(respuesta);
            })
            .catch((e) => {
                if (vigente) {
                    setError(
                        mensajeDeError(e, 'No se pudo cargar la asignación de la evaluación.'),
                    );
                }
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });

        return () => {
            vigente = false;
        };
    }, [examenId]);

    if (cargando) {
        return (
            <p className="text-sm text-slate-500" aria-live="polite">
                Cargando paralelos...
            </p>
        );
    }

    if (error || !datos) {
        return (
            <p className="text-sm text-red-600" role="alert">
                {error || 'No se pudo cargar la asignación de la evaluación.'}
            </p>
        );
    }

    if (datos.estado !== 'borrador') {
        return (
            <p className="text-sm text-slate-600">
                Solo puedes cambiar la asignación de una evaluación en borrador.
            </p>
        );
    }

    return <FormularioAsignacion datos={datos} />;
}