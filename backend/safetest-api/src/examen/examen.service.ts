import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { Examen } from './entity/examen.entity';
import { Estudiante } from '../estudiante/entity/estudiante.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Semestre } from '../semestre/entity/semestre.entity';
import { Paralelo } from '../paralelo/entity/paralelo.entity';
import { ParaleloExamen } from '../paraleloexamen/entity/paraleloexamen.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';
import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { ExamenTema } from '../examentema/entity/examentema.entity';
import { ExamenEstudiante } from '../examenestudiante/entity/examenestudiante.entity';
import { Pregunta } from '../pregunta/entity/pregunta.entity';
import { Tema } from '../tema/entity/tema.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { ExamenPoolSnapshot } from '../examenpoolsnapshot/entity/examen-pool-snapshot.entity';
import { ExamenPoolSnapshotTema } from '../examenpoolsnapshot/entity/examen-pool-snapshot-tema.entity';
import { ExamenPoolSnapshotPregunta } from '../examenpoolsnapshot/entity/examen-pool-snapshot-pregunta.entity';
import { ExamenPoolSnapshotInciso } from '../examenpoolsnapshot/entity/examen-pool-snapshot-inciso.entity';

import { CreateExamenDto } from './dto/create-examen.dto';
import { GuardarAsignacionDto } from './dto/guardar-asignacion.dto';
import { GuardarConfiguracionDto } from './dto/guardar-configuracion.dto';
import { GuardarPuntajesDto } from './dto/guardar-puntajes.dto';
import { GuardarSeleccionDto } from './dto/guardar-seleccion.dto';
import { UpdateExamenDto } from './dto/update-examen.dto';
import { calcularDistribucionPuntajes } from './puntajes-resumen';
import {
    calcularPuntajesAleatorioBorrador,
    calcularPuntajesInstantanea,
    calcularPuntajesManual,
} from './puntajes-resumen';
import type {
    CriterioPuntajeResumen,
    DatosInstantaneaResumen,
    MotivoPreguntaSinPuntaje,
    PreguntaPuntajeCalculo,
    ResumenPuntajes,
} from './puntajes-resumen';
import {
    multiplicarPuntajeDecimal,
    parsearPuntajeDecimal,
    puntajeDecimalANumero,
    puntajeDecimalATexto,
    puntajesDecimalesIguales,
    sumarPuntajesDecimales,
} from './puntajes-decimales';
import type { PuntajeDecimal } from './puntajes-decimales';

const MOTIVO_PUNTAJE_INVALIDO: Record<MotivoPreguntaSinPuntaje, string> = {
    sin_incisos: 'no tiene incisos',
    inciso_sin_puntaje:
        'tiene incisos con un puntaje que no es numérico, finito y mayor que cero',
    puntaje_no_finito: 'tiene un puntaje no numérico o no finito',
};

@Injectable()
export class ExamenService {
    constructor(
        private readonly dataSource: DataSource,

        @InjectRepository(Examen)
        private readonly examenRepository: Repository<Examen>,

        @InjectRepository(Materia)
        private readonly materiaRepository: Repository<Materia>,

        @InjectRepository(Semestre)
        private readonly semestreRepository: Repository<Semestre>,

        @InjectRepository(Paralelo)
        private readonly paraleloRepository: Repository<Paralelo>,

        @InjectRepository(Inscripcion)
        private readonly inscripcionRepository: Repository<Inscripcion>,

        @InjectRepository(Pregunta)
        private readonly preguntaRepository: Repository<Pregunta>,

        @InjectRepository(Tema)
        private readonly temaRepository: Repository<Tema>,
    ) { }

    private logEtapaInicio(etapa: string, contexto: Record<string, unknown> = {}) {
        if (process.env.NODE_ENV === 'production') {
            return;
        }

        console.debug('[examen.consultar] inicio', {
            etapa,
            ...contexto,
        });
    }

    private logEtapaFin(etapa: string, contexto: Record<string, unknown> = {}) {
        if (process.env.NODE_ENV === 'production') {
            return;
        }

        console.debug('[examen.consultar] fin', {
            etapa,
            ...contexto,
        });
    }

    private logEtapaError(
        etapa: string,
        error: unknown,
        contexto: Record<string, unknown> = {},
    ) {
        if (process.env.NODE_ENV === 'production') {
            return;
        }

        const errorType = error instanceof Error ? error.name : typeof error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error('[examen.consultar] error', {
            etapa,
            errorType,
            errorMessage,
            stack: errorStack,
            ...contexto,
        });
    }

    private async ejecutarEtapa<T>(
        etapa: string,
        accion: () => Promise<T>,
        contexto: Record<string, unknown> = {},
    ): Promise<T> {
        this.logEtapaInicio(etapa, contexto);

        try {
            const resultado = await accion();
            const count = Array.isArray(resultado)
                ? resultado.length
                : typeof resultado === 'object' && resultado !== null
                    ? Object.keys(resultado as object).length
                    : undefined;

            this.logEtapaFin(etapa, {
                ...contexto,
                count,
            });

            return resultado;
        } catch (error) {
            this.logEtapaError(etapa, error, contexto);
            throw error;
        }
    }

    // La materia, el periodo y el paralelo deben ser del docente,
    // la materia debe estar asociada al periodo y el paralelo
    // debe corresponder a esa materia y a ese periodo.
    private async validarRelaciones(
        dto: Pick<CreateExamenDto, 'materia_id' | 'semestre_id' | 'paralelo_id'>,
        docenteId: number,
    ) {
        if (!dto.materia_id || !dto.semestre_id || !dto.paralelo_id) {
            throw new BadRequestException(
                'Faltan datos obligatorios para crear o editar la evaluación.',
            );
        }

        const materia = await this.materiaRepository.findOne({
            where: { materia_id: dto.materia_id, docente_id: docenteId },
        });

        if (!materia) {
            throw new BadRequestException(
                'La materia no existe o no pertenece al docente.',
            );
        }

        const semestre = await this.semestreRepository.findOne({
            where: { semestre_id: dto.semestre_id, docente_id: docenteId },
            relations: { materias: true },
        });

        if (!semestre) {
            throw new BadRequestException(
                'El periodo académico no existe o no pertenece al docente.',
            );
        }

        const materiaAsociada = semestre.materias?.some(
            (item) => item.materia_id === dto.materia_id,
        );

        if (!materiaAsociada) {
            throw new BadRequestException(
                'La materia no está asociada al periodo académico seleccionado.',
            );
        }

        const paralelo = await this.paraleloRepository.findOne({
            where: { paralelo_id: dto.paralelo_id, docente_id: docenteId },
        });

        if (!paralelo) {
            throw new BadRequestException(
                'El paralelo no existe o no pertenece al docente.',
            );
        }

        if (
            paralelo.materia_id !== dto.materia_id ||
            paralelo.semestre_id !== dto.semestre_id
        ) {
            throw new BadRequestException(
                'El paralelo no corresponde a la materia y al periodo seleccionados.',
            );
        }
    }

    // CREAR EVALUACIÓN EN BORRADOR

    async create(dto: CreateExamenDto, docenteId: number) {
        const titulo = dto.titulo.trim();

        if (!titulo) {
            throw new BadRequestException(
                'El nombre de la evaluación es obligatorio.',
            );
        }

        await this.validarRelaciones(dto, docenteId);

        // Examen y vínculo con el paralelo se guardan juntos o no se guarda nada.
        return this.dataSource.transaction(async (manager) => {
            const examen = await manager.save(
                Examen,
                manager.create(Examen, {
                    titulo,
                    instrucciones: dto.instrucciones?.trim() || null,
                    materia_id: dto.materia_id,
                    semestre_id: dto.semestre_id,
                    docente_id: docenteId,
                    estado: 'borrador',
                }),
            );

            await manager.save(
                ParaleloExamen,
                manager.create(ParaleloExamen, {
                    paralelo_id: dto.paralelo_id,
                    examen_id: examen.examen_id,
                }),
            );

            return examen;
        });
    }

    // EDITAR LA INFORMACIÓN GENERAL (paso 1)

    async update(examenId: number, dto: UpdateExamenDto, docenteId: number) {
        const criteriosReiniciados = await this.dataSource.transaction(
            async (manager) => {
                // Se bloquea la fila del examen para serializar la edición con
                // `guardarAsignacion` y `publicar`, y se revalida el estado
                // dentro de la transacción.
                const examenBloqueado = await manager
                    .getRepository(Examen)
                    .createQueryBuilder('examen')
                    .where('examen.examen_id = :examenId', { examenId })
                    .andWhere('examen.docente_id = :docenteId', { docenteId })
                    .setLock('pessimistic_write')
                    .getOne();

                if (!examenBloqueado) {
                    throw new NotFoundException(
                        'La evaluación no existe.',
                    );
                }

                if (examenBloqueado.estado !== 'borrador') {
                    throw new BadRequestException(
                        'Solo se puede editar la información de una evaluación en borrador.',
                    );
                }

                // Las relaciones se cargan sin join de bloqueo para evitar el
                // error de PostgreSQL al bloquear el lado nullable de un outer
                // join.
                const examen = await manager
                    .getRepository(Examen)
                    .findOne({
                        where: { examen_id: examenId },
                        relations: { paralelos: true },
                    });

                if (!examen) {
                    throw new NotFoundException('La evaluación no existe.');
                }

                const titulo =
                    dto.titulo !== undefined
                        ? dto.titulo.trim()
                        : (examen.titulo ?? '');

                if (!titulo) {
                    throw new BadRequestException(
                        'El nombre de la evaluación es obligatorio.',
                    );
                }

                const instrucciones =
                    dto.instrucciones !== undefined
                        ? dto.instrucciones.trim() || null
                        : examen.instrucciones;

                // Lo que no se envía se conserva.
                const materiaId = dto.materia_id ?? examen.materia_id;
                const semestreId = dto.semestre_id ?? examen.semestre_id;
                const paralelosActuales = (examen.paralelos ?? []).map(
                    (item) => item.paralelo_id,
                );
                const paraleloId = dto.paralelo_id ?? paralelosActuales[0];

                if (materiaId === null || paraleloId === undefined) {
                    throw new BadRequestException(
                        'La evaluación no tiene materia o paralelo asociado.',
                    );
                }

                // Se valida el conjunto final: materia, periodo y paralelo coherentes.
                await this.validarRelaciones(
                    {
                        materia_id: materiaId,
                        semestre_id: semestreId,
                        paralelo_id: paraleloId,
                    },
                    docenteId,
                );

                const cambiaMateria = materiaId !== examen.materia_id;
                const cambiaContexto =
                    cambiaMateria || semestreId !== examen.semestre_id;
                const cambiaParalelo =
                    !paralelosActuales.includes(paraleloId);

                await manager.update(
                    Examen,
                    { examen_id: examenId },
                    {
                        titulo,
                        instrucciones,
                        materia_id: materiaId,
                        semestre_id: semestreId,
                    },
                );

                // Si no cambia el contexto ni el paralelo, no se toca la
                // asignación (paso 4). Si cambia, vuelve al paralelo elegido.
                if (cambiaContexto || cambiaParalelo) {
                    await manager.delete(ParaleloExamen, {
                        examen_id: examenId,
                    });
                    await manager.insert(ParaleloExamen, {
                        paralelo_id: paraleloId,
                        examen_id: examenId,
                    });
                    await manager.delete(ExamenEstudiante, {
                        examen_id: examenId,
                    });
                    await manager.update(
                        Examen,
                        { examen_id: examenId },
                        { modo_asignacion: 'paralelos' },
                    );
                }

                // Los criterios por tema pertenecen a la materia anterior.
                if (cambiaMateria) {
                    const borrados = await manager.delete(ExamenTema, {
                        examen_id: examenId,
                    });

                    return (borrados.affected ?? 0) > 0;
                }

                return false;
            },
        );

        return {
            ...(await this.findOne(examenId, docenteId)),
            criterios_reiniciados: criteriosReiniciados,
        };
    }

    // GUARDAR LA CONFIGURACIÓN (paso 3)

    async guardarConfiguracion(
        examenId: number,
        dto: GuardarConfiguracionDto,
        docenteId: number,
    ) {
        const examen = await this.examenRepository.findOne({
            where: { examen_id: examenId, docente_id: docenteId },
        });

        if (!examen) {
            throw new NotFoundException('La evaluación no existe.');
        }

        if (examen.estado !== 'borrador') {
            throw new BadRequestException(
                'Solo se puede configurar una evaluación en borrador.',
            );
        }

        const desde = new Date(dto.disponible_desde);
        const hasta = new Date(dto.disponible_hasta);

        if (hasta.getTime() <= desde.getTime()) {
            throw new BadRequestException(
                'La fecha de finalización debe ser posterior a la de inicio.',
            );
        }

        if (hasta.getTime() <= Date.now()) {
            throw new BadRequestException(
                'La fecha de finalización debe ser futura.',
            );
        }

        const ventanaMin = (hasta.getTime() - desde.getTime()) / 60000;

        if (ventanaMin < dto.duracion_min) {
            throw new BadRequestException(
                'La ventana de disponibilidad no puede ser menor que la duración de la evaluación.',
            );
        }

        await this.examenRepository.update(
            { examen_id: examenId },
            {
                orden_preguntas: dto.orden_preguntas,
                duracion_min: dto.duracion_min,
                disponible_desde: desde,
                disponible_hasta: hasta,
                modo_entrega_nota: dto.modo_entrega_nota,
                // La columna `numeric` se persiste como texto, igual que otros
                // puntajes del modelo.
                puntaje_total: String(dto.puntaje_total),
            },
        );

        return this.findOne(examenId, docenteId);
    }

    // PARALELOS Y ESTUDIANTES DISPONIBLES PARA ASIGNAR (paso 4)

    async obtenerAsignacion(examenId: number, docenteId: number) {
        const examen = await this.examenRepository.findOne({
            where: { examen_id: examenId, docente_id: docenteId },
            relations: {
                materia: true,
                semestre: true,
                paralelos: true,
                estudiantes: true,
            },
        });

        if (!examen) {
            throw new NotFoundException('La evaluación no existe.');
        }

        const materiaId = examen.materia_id;

        if (materiaId === null) {
            throw new BadRequestException(
                'La evaluación no tiene una materia asociada.',
            );
        }

        // Solo los paralelos del docente de la misma materia y periodo.
        const paralelos = await this.paraleloRepository.find({
            where: {
                docente_id: docenteId,
                materia_id: materiaId,
                semestre_id: examen.semestre_id,
            },
            order: { nombre_paralelo: 'ASC' },
        });

        const inscripciones =
            paralelos.length === 0
                ? []
                : await this.inscripcionRepository
                    .createQueryBuilder('inscripcion')
                    .innerJoinAndSelect('inscripcion.estudiante', 'estudiante')
                    .where('inscripcion.paralelo_id IN (:...paraleloIds)', {
                        paraleloIds: paralelos.map(
                            (item) => item.paralelo_id,
                        ),
                    })
                    .andWhere('estudiante.activo = :activo', { activo: true })
                    .getMany();

        const paralelosAsignados = new Set(
            (examen.paralelos ?? []).map((item) => item.paralelo_id),
        );
        const estudiantesAsignados = new Set(
            (examen.estudiantes ?? []).map((item) => item.estudiante_id),
        );

        return {
            examen_id: examen.examen_id,
            estado: examen.estado,
            modo_asignacion:
                examen.modo_asignacion === 'estudiantes' ? 'estudiantes' : 'paralelos',
            materia: examen.materia
                ? {
                    materia_id: examen.materia.materia_id,
                    nombre: examen.materia.nombre,
                }
                : null,
            semestre: {
                semestre_id: examen.semestre.semestre_id,
                gestion: examen.semestre.gestion,
            },
            paralelos: paralelos.map((paralelo) => {
                const estudiantes = inscripciones
                    .filter((item) => item.paralelo_id === paralelo.paralelo_id)
                    .map((item) => ({
                        estudiante_id: item.estudiante.estudiante_id,
                        nombre_completo: item.estudiante.nombre_completo,
                        correo_institucional: item.estudiante.correo_institucional,
                        seleccionado: estudiantesAsignados.has(
                            item.estudiante.estudiante_id,
                        ),
                    }))
                    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

                return {
                    paralelo_id: paralelo.paralelo_id,
                    nombre_paralelo: paralelo.nombre_paralelo,
                    total_estudiantes: estudiantes.length,
                    seleccionado: paralelosAsignados.has(paralelo.paralelo_id),
                    estudiantes,
                };
            }),
        };
    }

    // GUARDAR LA ASIGNACIÓN (paso 4)

    async guardarAsignacion(
        examenId: number,
        dto: GuardarAsignacionDto,
        docenteId: number,
    ) {
        if (
            dto.modo_asignacion !== 'paralelos' &&
            dto.modo_asignacion !== 'estudiantes'
        ) {
            throw new BadRequestException(
                'El modo de asignación debe ser paralelos o estudiantes.',
            );
        }

        // La validación y la escritura comparten transacción y bloquean la fila
        // del examen para serializarse con otra asignación o publicación.
        return this.dataSource.transaction(async (manager) => {
            const examen = await manager
                .getRepository(Examen)
                .createQueryBuilder('examen')
                .where('examen.examen_id = :examenId', { examenId })
                .andWhere('examen.docente_id = :docenteId', { docenteId })
                .setLock('pessimistic_write')
                .getOne();

            if (!examen) {
                throw new NotFoundException('La evaluación no existe.');
            }

            if (examen.estado !== 'borrador') {
                throw new BadRequestException(
                    'Solo se puede cambiar la asignación de una evaluación en borrador.',
                );
            }

            const materiaId = examen.materia_id;

            if (materiaId === null) {
                throw new BadRequestException(
                    'La evaluación no tiene una materia asociada.',
                );
            }

            // Paralelos del docente de la misma materia y periodo de la evaluación.
            const validos = await manager.getRepository(Paralelo).find({
                where: {
                    docente_id: docenteId,
                    materia_id: materiaId,
                    semestre_id: examen.semestre_id,
                },
            });
            const idsValidos = validos.map((item) => item.paralelo_id);

            if (dto.modo_asignacion === 'paralelos') {
                const paraleloIds = [...new Set(dto.paralelo_ids ?? [])];

                if (paraleloIds.length === 0) {
                    throw new BadRequestException(
                        'Selecciona al menos un paralelo.',
                    );
                }

                if (!paraleloIds.every((id) => idsValidos.includes(id))) {
                    throw new BadRequestException(
                        'Algún paralelo no existe o no corresponde a la materia y al periodo de la evaluación.',
                    );
                }

                const conteo = await manager
                    .getRepository(Inscripcion)
                    .createQueryBuilder('inscripcion')
                    .innerJoin('inscripcion.estudiante', 'estudiante')
                    .select('COUNT(DISTINCT inscripcion.estudiante_id)', 'total')
                    .where('inscripcion.paralelo_id IN (:...ids)', {
                        ids: paraleloIds,
                    })
                    .andWhere('estudiante.activo = :activo', { activo: true })
                    .getRawOne<{ total: string }>();

                const totalEstudiantes = Number(conteo?.total ?? 0);

                if (totalEstudiantes === 0) {
                    throw new BadRequestException(
                        'Los paralelos seleccionados no tienen estudiantes activos inscritos.',
                    );
                }

                await manager.update(
                    Examen,
                    { examen_id: examenId },
                    { modo_asignacion: 'paralelos' },
                );

                await manager.delete(ParaleloExamen, { examen_id: examenId });
                await manager.insert(
                    ParaleloExamen,
                    paraleloIds.map((paralelo_id) => ({
                        paralelo_id,
                        examen_id: examenId,
                    })),
                );

                await manager.delete(ExamenEstudiante, { examen_id: examenId });

                return {
                    modo_asignacion: 'paralelos',
                    total_estudiantes: totalEstudiantes,
                };
            }

            const estudianteIds = [...new Set(dto.estudiante_ids ?? [])];

            if (estudianteIds.length === 0) {
                throw new BadRequestException(
                    'Selecciona al menos un estudiante.',
                );
            }

            const inscripciones =
                idsValidos.length === 0
                    ? []
                    : await manager
                        .getRepository(Inscripcion)
                        .createQueryBuilder('inscripcion')
                        .innerJoin('inscripcion.estudiante', 'estudiante')
                        .select('inscripcion.estudiante_id', 'estudiante_id')
                        .addSelect('inscripcion.paralelo_id', 'paralelo_id')
                        .where('inscripcion.paralelo_id IN (:...idsValidos)', {
                            idsValidos,
                        })
                        .andWhere(
                            'inscripcion.estudiante_id IN (:...estudianteIds)',
                            { estudianteIds },
                        )
                        .andWhere('estudiante.activo = :activo', {
                            activo: true,
                        })
                        .getRawMany<{
                            estudiante_id: number;
                            paralelo_id: number;
                        }>();

            const encontrados = new Set(
                inscripciones.map((item) => Number(item.estudiante_id)),
            );

            if (!estudianteIds.every((id) => encontrados.has(id))) {
                throw new BadRequestException(
                    'Algún estudiante no está inscrito o está inactivo en tus paralelos de esta materia y periodo.',
                );
            }

            // La evaluación queda vinculada a los paralelos de esos estudiantes
            // como contexto. En este modo el acceso se decide solo por
            // examen_estudiante.
            const paraleloIds = [
                ...new Set(
                    inscripciones.map((item) => Number(item.paralelo_id)),
                ),
            ];

            await manager.update(
                Examen,
                { examen_id: examenId },
                { modo_asignacion: 'estudiantes' },
            );

            await manager.delete(ParaleloExamen, { examen_id: examenId });
            await manager.insert(
                ParaleloExamen,
                paraleloIds.map((paralelo_id) => ({
                    paralelo_id,
                    examen_id: examenId,
                })),
            );

            await manager.delete(ExamenEstudiante, { examen_id: examenId });
            await manager.insert(
                ExamenEstudiante,
                estudianteIds.map((estudiante_id) => ({
                    examen_id: examenId,
                    estudiante_id,
                })),
            );

            return {
                modo_asignacion: 'estudiantes',
                total_estudiantes: estudianteIds.length,
            };
        });
    }

    // RESUMEN Y PUBLICACIÓN (paso 5)

    async obtenerResumen(examenId: number, docenteId: number) {
        const examen = await this.findOne(examenId, docenteId);

        const [estudiantes, criteriosActuales] = await Promise.all([
            this.estudiantesAsignados(examen),
            this.dataSource
                .getRepository(ExamenTema)
                .createQueryBuilder('examenTema')
                .innerJoinAndSelect('examenTema.tema', 'tema')
                .where('examenTema.examen_id = :examenId', { examenId })
                .orderBy('tema.nombre_tema', 'ASC')
                .getMany(),
        ]);

        const criteriosBase: CriterioPuntajeResumen[] = criteriosActuales.map(
            (fila) => ({
                tema_id: fila.tema_id,
                nombre_tema: fila.tema.nombre_tema,
                cantidad: Number(fila.cantidad),
            }),
        );
        const nombresPorTema = new Map(
            criteriosBase.map((criterio) => [
                criterio.tema_id,
                criterio.nombre_tema,
            ]),
        );

        let puntajes: ResumenPuntajes;
        let criterios: { tema_id: number; nombre_tema: string; cantidad: number }[];

        if (
            examen.estado === 'publicado' &&
            examen.modo_seleccion === 'aleatorio'
        ) {
            // Publicado: los valores definitivos salen de la instantánea.
            // No se recalculan con Pregunta, Inciso ni el pool activo.
            const instantanea = await this.obtenerDatosInstantanea(examenId);

            puntajes = calcularPuntajesInstantanea(
                instantanea
                    ? {
                        ...instantanea,
                        temas: instantanea.temas.map((tema) => ({
                            ...tema,
                            nombre_tema:
                                nombresPorTema.get(tema.tema_id) ??
                                `Tema ${tema.tema_id}`,
                        })),
                    }
                    : null,
            );

            criterios = puntajes.temas.map((tema) => ({
                tema_id: tema.tema_id,
                nombre_tema: tema.nombre_tema,
                cantidad: tema.cantidad_seleccionada,
            }));
        } else if (examen.modo_seleccion === 'aleatorio') {
            // Borrador: cálculo previo aplicando las reglas de T3.2.
            puntajes = await this.calcularPuntajesBorradorAleatorio(
                criteriosBase,
            );
            criterios = criteriosBase.map((criterio) => ({
                tema_id: criterio.tema_id,
                nombre_tema: criterio.nombre_tema,
                cantidad: criterio.cantidad,
            }));
        } else {
            // Manual: se conserva el cálculo derivado de la selección actual.
            puntajes = calcularPuntajesManual(examen.preguntas);
            criterios = criteriosBase.map((criterio) => ({
                tema_id: criterio.tema_id,
                nombre_tema: criterio.nombre_tema,
                cantidad: criterio.cantidad,
            }));
        }

        return {
            ...examen,
            // En una evaluación publicada la cantidad definitiva es la de la
            // instantánea; el cálculo previo no debe reemplazarla.
            total_preguntas:
                examen.estado === 'publicado' &&
                examen.modo_seleccion === 'aleatorio'
                    ? puntajes.temas.reduce(
                        (total, tema) => total + tema.cantidad_seleccionada,
                        0,
                    )
                    : examen.total_preguntas,
            puntajes,
            criterios,
            estudiantes_asignados: estudiantes,
            total_estudiantes: estudiantes.length,
        };
    }

    /**
     * Preguntas candidatas de un borrador aleatorio con su puntaje máximo.
     * Solo lee preguntas activas y sus incisos; no selecciona ni escribe.
     */
    private async calcularPuntajesBorradorAleatorio(
        criterios: CriterioPuntajeResumen[],
    ): Promise<ResumenPuntajes> {
        if (criterios.length === 0) {
            return calcularPuntajesAleatorioBorrador([], []);
        }

        const temaIds = [
            ...new Set(criterios.map((criterio) => criterio.tema_id)),
        ];
        const preguntas = await this.preguntaRepository
            .createQueryBuilder('pregunta')
            .where('pregunta.tema_id IN (:...temaIds)', { temaIds })
            .andWhere('pregunta.activo = true')
            .orderBy('pregunta.tema_id', 'ASC')
            .addOrderBy('pregunta.pregunta_id', 'ASC')
            .getMany();

        const preguntaIds = preguntas.map(
            (pregunta) => pregunta.pregunta_id,
        );
        const incisos =
            preguntaIds.length === 0
                ? []
                : await this.dataSource
                    .getRepository(Inciso)
                    .createQueryBuilder('inciso')
                    .where('inciso.pregunta_id IN (:...preguntaIds)', {
                        preguntaIds,
                    })
                    .orderBy('inciso.pregunta_id', 'ASC')
                    .addOrderBy('inciso.letra', 'ASC')
                    .getMany();

        const incisosPorPregunta = new Map<
            number,
            { letra: string; puntaje_max: string }[]
        >();

        for (const inciso of incisos) {
            const lista =
                incisosPorPregunta.get(inciso.pregunta_id) ?? [];
            lista.push({
                letra: inciso.letra,
                puntaje_max: inciso.puntaje_max,
            });
            incisosPorPregunta.set(inciso.pregunta_id, lista);
        }

        const calculadas: PreguntaPuntajeCalculo[] = preguntas.map(
            (pregunta) => {
                const incisosPregunta =
                    incisosPorPregunta.get(pregunta.pregunta_id) ?? [];
                const parseados = incisosPregunta.map((inciso) =>
                    parsearPuntajeDecimal(inciso.puntaje_max),
                );
                const incisosValidos: {
                    letra: string;
                    puntaje: PuntajeDecimal;
                }[] = [];
                let motivo: MotivoPreguntaSinPuntaje | null = null;

                if (incisosPregunta.length === 0) {
                    motivo = 'sin_incisos';
                } else if (parseados.some((puntaje) => puntaje === null)) {
                    motivo = 'inciso_sin_puntaje';
                } else {
                    for (const [indice, puntaje] of parseados.entries()) {
                        if (puntaje) {
                            incisosValidos.push({
                                letra: incisosPregunta[indice].letra,
                                puntaje,
                            });
                        }
                    }
                }

                if (motivo !== null) {
                    return {
                        pregunta_id: pregunta.pregunta_id,
                        tema_id: pregunta.tema_id,
                        enunciado: pregunta.enunciado,
                        puntaje: null,
                        motivo,
                        incisos: incisosValidos,
                    };
                }

                const suma = sumarPuntajesDecimales(
                    incisosValidos.map((inciso) => inciso.puntaje),
                );

                if (
                    !Number.isFinite(puntajeDecimalANumero(suma)) ||
                    suma.coeficiente <= 0n
                ) {
                    return {
                        pregunta_id: pregunta.pregunta_id,
                        tema_id: pregunta.tema_id,
                        enunciado: pregunta.enunciado,
                        puntaje: null,
                        motivo: 'puntaje_no_finito',
                        incisos: incisosValidos,
                    };
                }

                return {
                    pregunta_id: pregunta.pregunta_id,
                    tema_id: pregunta.tema_id,
                    enunciado: pregunta.enunciado,
                    puntaje: suma,
                    motivo: null,
                    incisos: incisosValidos,
                };
            },
        );

        return calcularPuntajesAleatorioBorrador(criterios, calculadas);
    }

    /**
     * Lee las cuatro tablas de la instantánea sin tocar Pregunta, Inciso ni
     * el conjunto activo. Devuelve `null` si la evaluación no tiene instantánea.
     */
    private async obtenerDatosInstantanea(
        examenId: number,
    ): Promise<DatosInstantaneaResumen | null> {
        const manager = this.dataSource.manager;
        const [cabecera, temas, preguntas, incisos] = await Promise.all([
            manager
                .getRepository(ExamenPoolSnapshot)
                .findOne({ where: { examen_id: examenId } }),
            manager.getRepository(ExamenPoolSnapshotTema).find({
                where: { examen_id: examenId },
                order: { tema_id: 'ASC' },
            }),
            manager.getRepository(ExamenPoolSnapshotPregunta).find({
                where: { examen_id: examenId },
                order: { tema_id: 'ASC', pregunta_id: 'ASC' },
            }),
            manager.getRepository(ExamenPoolSnapshotInciso).find({
                where: { examen_id: examenId },
                order: {
                    tema_id: 'ASC',
                    pregunta_id: 'ASC',
                    letra: 'ASC',
                },
            }),
        ]);

        if (!cabecera) {
            return null;
        }

        const incisosPorPregunta = new Map<
            number,
            { letra: string; puntaje_max: string }[]
        >();

        for (const inciso of incisos) {
            const lista =
                incisosPorPregunta.get(inciso.pregunta_id) ?? [];
            lista.push({
                letra: inciso.letra,
                puntaje_max: inciso.puntaje_max,
            });
            incisosPorPregunta.set(inciso.pregunta_id, lista);
        }

        return {
            puntaje_maximo_garantizado:
                cabecera.puntaje_maximo_garantizado,
            temas: temas.map((tema) => ({
                tema_id: tema.tema_id,
                nombre_tema: '',
                cantidad_seleccionada: tema.cantidad_seleccionada,
                cantidad_candidatas: tema.cantidad_candidatas,
                puntaje_maximo_tema: tema.puntaje_maximo_tema,
            })),
            preguntas: preguntas.map((pregunta) => ({
                pregunta_id: pregunta.pregunta_id,
                tema_id: pregunta.tema_id,
                puntaje_maximo_pregunta:
                    pregunta.puntaje_maximo_pregunta,
                incisos: incisosPorPregunta.get(pregunta.pregunta_id) ?? [],
            })),
        };
    }

    async publicar(examenId: number, docenteId: number) {
        return this.dataSource.transaction(async (manager) => {
            // Serializa la publicación con cualquier cambio de asignación.
            const examenBloqueado = await manager
                .getRepository(Examen)
                .createQueryBuilder('examen')
                .where('examen.examen_id = :examenId', { examenId })
                .andWhere('examen.docente_id = :docenteId', { docenteId })
                .setLock('pessimistic_write')
                .getOne();

            if (!examenBloqueado) {
                throw new NotFoundException('La evaluación no existe.');
            }

            if (examenBloqueado.estado !== 'borrador') {
                throw new BadRequestException(
                    'Solo se puede publicar una evaluación en borrador.',
                );
            }

            // Las relaciones se cargan dentro de la misma transacción. No se
            // usa un LEFT JOIN con FOR UPDATE porque PostgreSQL no permite
            // bloquear el lado nullable de un outer join.
            const examen = await manager.getRepository(Examen).findOne({
                where: { examen_id: examenId },
                relations: { paralelos: true },
            });

            if (!examen) {
                throw new NotFoundException('La evaluación no existe.');
            }

            const problemas = await this.problemasParaPublicar(
                examen,
                manager,
            );

            if (problemas.length > 0) {
                throw new BadRequestException({
                    message: 'La evaluación aún no se puede publicar.',
                    problemas,
                });
            }

            if (examen.modo_seleccion === 'aleatorio') {
                try {
                    await this.crearInstantaneaPoolAleatorio(examen, manager);
                } catch (error) {
                    if (!(error instanceof BadRequestException)) {
                        throw error;
                    }

                    throw new BadRequestException({
                        message: 'La evaluación aún no se puede publicar.',
                        problemas: [{ paso: 2, mensaje: error.message }],
                    });
                }
            }

            // Las preguntas por estudiante (asignacion_pregunta) aún no se generan
            // aquí: todavía no existe el módulo de rendición que las consume.
            const resultado = await manager.update(
                Examen,
                { examen_id: examenId, estado: 'borrador' },
                { estado: 'publicado' },
            );

            if (resultado.affected === 0) {
                throw new BadRequestException(
                    'La evaluación ya no está en borrador.',
                );
            }

            return { examen_id: examenId, estado: 'publicado' };
        });
    }

    // Estudiantes que quedarían asignados según el modo de asignación.
    private async estudiantesAsignados(
        examen: {
            examen_id: number;
            modo_asignacion: string;
            paralelos: { paralelo_id: number }[];
        },
        manager: EntityManager = this.dataSource.manager,
    ) {
        if (examen.modo_asignacion === 'estudiantes') {
            const filas = await manager
                .getRepository(ExamenEstudiante)
                .createQueryBuilder('examenEstudiante')
                .innerJoinAndSelect('examenEstudiante.estudiante', 'estudiante')
                .where('examenEstudiante.examen_id = :examenId', {
                    examenId: examen.examen_id,
                })
                .andWhere('estudiante.activo = :activo', { activo: true })
                .orderBy('estudiante.nombre_completo', 'ASC')
                .getMany();

            return filas.map((fila) => ({
                estudiante_id: fila.estudiante.estudiante_id,
                nombre_completo: fila.estudiante.nombre_completo,
            }));
        }

        // Un modo desconocido no asigna estudiantes y, por tanto, tampoco
        // permite publicar.
        if (examen.modo_asignacion !== 'paralelos') {
            return [];
        }

        const paraleloIds = (examen.paralelos ?? []).map(
            (item) => item.paralelo_id,
        );

        if (paraleloIds.length === 0) return [];

        const filas = await manager
            .getRepository(Inscripcion)
            .createQueryBuilder('inscripcion')
            .innerJoinAndSelect('inscripcion.estudiante', 'estudiante')
            .where('inscripcion.paralelo_id IN (:...paraleloIds)', {
                paraleloIds,
            })
            .andWhere('estudiante.activo = :activo', { activo: true })
            .orderBy('estudiante.nombre_completo', 'ASC')
            .getMany();

        // Un estudiante puede estar en más de un paralelo de la evaluación.
        const unicos = new Map<
            number,
            { estudiante_id: number; nombre_completo: string }
        >();

        for (const fila of filas) {
            unicos.set(fila.estudiante.estudiante_id, {
                estudiante_id: fila.estudiante.estudiante_id,
                nombre_completo: fila.estudiante.nombre_completo,
            });
        }

        return [...unicos.values()];
    }

    // Problemas que impiden publicar, con el paso del asistente que los corrige.
    /**
     * Valida los puntajes de las preguntas seleccionadas en modo manual.
     * Reutiliza el cálculo derivado de HU-30/T1 para no duplicar la regla:
     * una pregunta es inválida si no tiene incisos o si alguno de sus incisos
     * no tiene un puntaje numérico, finito y mayor que cero.
     */
    private async problemasDePuntaje(
        examen: Examen,
        manager: EntityManager,
    ): Promise<{ paso: number; mensaje: string }[]> {
        const filas = await manager.getRepository(ExamenPregunta).find({
            where: { examen_id: examen.examen_id },
            order: { orden: 'ASC' },
        });

        if (filas.length === 0) {
            return [];
        }

        const preguntas = await this.obtenerPreguntasPorIds(
            filas.map((fila) => fila.pregunta_id),
            examen.examen_id,
            manager,
        );
        const distribucion = calcularDistribucionPuntajes(preguntas, 'manual');
        const problemas: { paso: number; mensaje: string }[] = [];

        for (const pregunta of distribucion.preguntas_sin_puntaje) {
            problemas.push({
                paso: 2,
                mensaje: `La pregunta #${pregunta.pregunta_id} ${MOTIVO_PUNTAJE_INVALIDO[pregunta.motivo]}.`,
            });
        }

        // La suma solo se compara cuando todas las preguntas tienen un puntaje
        // válido; de lo contrario el mensaje de la pregunta inválida ya indica
        // qué corregir.
        if (problemas.length === 0) {
            const problemaSuma = this.problemaDeSumaPuntajes(
                distribucion.puntaje_total === null
                    ? null
                    : parsearPuntajeDecimal(
                        distribucion.puntaje_total.toFixed(2),
                    ),
                examen.puntaje_total,
                2,
                'las preguntas',
            );

            if (problemaSuma) {
                problemas.push(problemaSuma);
            }
        }

        return problemas;
    }

    /**
     * Compara la suma de los puntajes con el total configurado. La ausencia de
     * total se informa aparte, en el paso 3.
     */
    private problemaDeSumaPuntajes(
        suma: PuntajeDecimal | null,
        totalConfigurado: string | null,
        paso: number,
        descripcion: string,
    ): { paso: number; mensaje: string } | null {
        const total = parsearPuntajeDecimal(totalConfigurado);

        if (!total) {
            return null;
        }

        if (!suma) {
            return {
                paso,
                mensaje: `No se pudo calcular la suma de los puntajes de ${descripcion}.`,
            };
        }

        if (!puntajesDecimalesIguales(suma, total)) {
            return {
                paso,
                mensaje: `La suma de los puntajes de ${descripcion} (${puntajeDecimalATexto(suma)}) no coincide con el puntaje total configurado (${puntajeDecimalATexto(total)}).`,
            };
        }

        return null;
    }

    private async crearInstantaneaPoolAleatorio(
        examen: Examen,
        manager: EntityManager,
    ): Promise<void> {
        const snapshotExistente = await manager
            .getRepository(ExamenPoolSnapshot)
            .findOne({ where: { examen_id: examen.examen_id } });

        if (snapshotExistente) {
            throw new BadRequestException(
                'La evaluación ya tiene una instantánea del pool aleatorio.',
            );
        }

        const criterios = await manager
            .getRepository(ExamenTema)
            .createQueryBuilder('examenTema')
            .where('examenTema.examen_id = :examenId', {
                examenId: examen.examen_id,
            })
            .orderBy('examenTema.tema_id', 'ASC')
            .setLock('pessimistic_write')
            .getMany();

        if (criterios.length === 0) {
            throw new BadRequestException(
                'Define al menos un criterio de preguntas aleatorias.',
            );
        }

        const temaIds = criterios.map((criterio) => Number(criterio.tema_id));
        const temas = await manager
            .getRepository(Tema)
            .createQueryBuilder('tema')
            .where('tema.tema_id IN (:...temaIds)', { temaIds })
            .orderBy('tema.tema_id', 'ASC')
            .setLock('pessimistic_write')
            .getMany();

        if (
            examen.materia_id === null ||
            temas.length !== temaIds.length ||
            temas.some((tema) => tema.materia_id !== examen.materia_id)
        ) {
            throw new BadRequestException(
                'Algún tema ya no pertenece a la materia de la evaluación.',
            );
        }

        const temaPorId = new Map(
            temas.map((tema) => [tema.tema_id, tema]),
        );
        const preguntas = await manager
            .getRepository(Pregunta)
            .createQueryBuilder('pregunta')
            .where('pregunta.tema_id IN (:...temaIds)', { temaIds })
            .orderBy('pregunta.tema_id', 'ASC')
            .addOrderBy('pregunta.pregunta_id', 'ASC')
            .setLock('pessimistic_write')
            .getMany();
        const preguntasActivas = preguntas.filter(
            (pregunta) => pregunta.activo,
        );

        const preguntasPorTema = new Map<number, Pregunta[]>(
            temaIds.map((temaId) => [temaId, []]),
        );

        for (const pregunta of preguntasActivas) {
            preguntasPorTema.get(pregunta.tema_id)?.push(pregunta);
        }

        for (const criterio of criterios) {
            const cantidad = Number(criterio.cantidad);
            const candidatas =
                preguntasPorTema.get(criterio.tema_id) ?? [];
            const tema = temaPorId.get(criterio.tema_id);

            if (!Number.isInteger(cantidad) || cantidad <= 0) {
                throw new BadRequestException(
                    `La cantidad de preguntas del tema "${tema?.nombre_tema}" debe ser mayor que cero.`,
                );
            }

            if (cantidad > candidatas.length) {
                throw new BadRequestException(
                    `El tema "${tema?.nombre_tema}" solo tiene ${candidatas.length} preguntas activas disponibles.`,
                );
            }
        }

        const preguntaIds = preguntasActivas.map(
            (pregunta) => pregunta.pregunta_id,
        );
        const incisos = await manager
            .getRepository(Inciso)
            .createQueryBuilder('inciso')
            .where('inciso.pregunta_id IN (:...preguntaIds)', {
                preguntaIds,
            })
            .orderBy('inciso.pregunta_id', 'ASC')
            .addOrderBy('inciso.letra', 'ASC')
            .setLock('pessimistic_write')
            .getMany();
        const incisosPorPregunta = new Map<number, Inciso[]>(
            preguntaIds.map((preguntaId) => [preguntaId, []]),
        );

        for (const inciso of incisos) {
            incisosPorPregunta.get(inciso.pregunta_id)?.push(inciso);
        }

        const puntajesPorPregunta = new Map<
            number,
            PuntajeDecimal
        >();
        const incisosSnapshot: {
            examen_id: number;
            tema_id: number;
            pregunta_id: number;
            letra: string;
            puntaje_max: string;
        }[] = [];

        for (const pregunta of preguntasActivas) {
            const incisosPregunta =
                incisosPorPregunta.get(pregunta.pregunta_id) ?? [];

            if (incisosPregunta.length === 0) {
                throw new BadRequestException(
                    `La pregunta #${pregunta.pregunta_id} no tiene incisos.`,
                );
            }

            const puntajesIncisos = incisosPregunta.map((inciso) => {
                const puntaje = parsearPuntajeDecimal(inciso.puntaje_max);

                if (!puntaje) {
                    throw new BadRequestException(
                        `La pregunta #${pregunta.pregunta_id} tiene incisos con un puntaje que no es numérico, finito y mayor que cero.`,
                    );
                }

                incisosSnapshot.push({
                    examen_id: examen.examen_id,
                    tema_id: pregunta.tema_id,
                    pregunta_id: pregunta.pregunta_id,
                    letra: inciso.letra,
                    puntaje_max: puntajeDecimalATexto(puntaje),
                });

                return puntaje;
            });

            puntajesPorPregunta.set(
                pregunta.pregunta_id,
                sumarPuntajesDecimales(puntajesIncisos),
            );
        }

        const obtenerPuntajePregunta = (preguntaId: number) => {
            const puntaje = puntajesPorPregunta.get(preguntaId);

            if (!puntaje) {
                throw new Error(
                    `No se calculó el puntaje de la pregunta #${preguntaId}.`,
                );
            }

            return puntaje;
        };

        const resumenPuntajes = calcularDistribucionPuntajes(
            preguntasActivas.map((pregunta) => ({
                pregunta_id: pregunta.pregunta_id,
                enunciado: pregunta.enunciado,
                puntos: puntajeDecimalANumero(
                    obtenerPuntajePregunta(pregunta.pregunta_id),
                ),
                total_incisos:
                    incisosPorPregunta.get(pregunta.pregunta_id)?.length ?? 0,
                incisos_sin_puntaje: 0,
                tema: {
                    tema_id: pregunta.tema_id,
                    nombre_tema:
                        temaPorId.get(pregunta.tema_id)?.nombre_tema ?? '',
                },
            })),
            'manual',
        );

        if (resumenPuntajes.preguntas_sin_puntaje.length > 0) {
            const invalida = resumenPuntajes.preguntas_sin_puntaje[0];
            throw new BadRequestException(
                `La pregunta #${invalida.pregunta_id} ${MOTIVO_PUNTAJE_INVALIDO[invalida.motivo]}.`,
            );
        }

        const temasSnapshot: {
            examen_id: number;
            tema_id: number;
            cantidad_seleccionada: number;
            cantidad_candidatas: number;
            puntaje_maximo_tema: string;
        }[] = [];
        const puntajesTemas: PuntajeDecimal[] = [];
        const preguntasSnapshot = preguntasActivas.map((pregunta) => ({
            examen_id: examen.examen_id,
            tema_id: pregunta.tema_id,
            pregunta_id: pregunta.pregunta_id,
            puntaje_maximo_pregunta: puntajeDecimalATexto(
                obtenerPuntajePregunta(pregunta.pregunta_id),
            ),
        }));

        for (const criterio of criterios) {
            const candidatas =
                preguntasPorTema.get(criterio.tema_id) ?? [];
            const puntajes = candidatas.map((pregunta) =>
                obtenerPuntajePregunta(pregunta.pregunta_id),
            );
            const cantidad = Number(criterio.cantidad);
            let puntajeTema: PuntajeDecimal;

            if (cantidad === candidatas.length) {
                puntajeTema = sumarPuntajesDecimales(puntajes);
            } else {
                const puntajeComun = puntajes[0];
                const uniforme = puntajes.every((puntaje) =>
                    puntajesDecimalesIguales(puntaje, puntajeComun),
                );

                if (!uniforme) {
                    const tema = temaPorId.get(criterio.tema_id);
                    throw new BadRequestException(
                        `El tema "${tema?.nombre_tema}" contiene preguntas con puntajes máximos diferentes; solo se puede seleccionar una parte de un pool con puntajes uniformes.`,
                    );
                }

                puntajeTema = multiplicarPuntajeDecimal(
                    puntajeComun,
                    cantidad,
                );
            }

            puntajesTemas.push(puntajeTema);
            temasSnapshot.push({
                examen_id: examen.examen_id,
                tema_id: criterio.tema_id,
                cantidad_seleccionada: cantidad,
                cantidad_candidatas: candidatas.length,
                puntaje_maximo_tema: puntajeDecimalATexto(puntajeTema),
            });
        }

        const puntajeTotal = sumarPuntajesDecimales(puntajesTemas);

        if (
            !Number.isFinite(puntajeDecimalANumero(puntajeTotal)) ||
            puntajeTotal.coeficiente <= 0n
        ) {
            throw new BadRequestException(
                'El puntaje máximo garantizado de la evaluación debe ser finito y mayor que cero.',
            );
        }

        const problemaSuma = this.problemaDeSumaPuntajes(
            puntajeTotal,
            examen.puntaje_total,
            2,
            'las preguntas aleatorias',
        );

        if (problemaSuma) {
            throw new BadRequestException(problemaSuma.mensaje);
        }

        await manager.insert(ExamenPoolSnapshot, {
            examen_id: examen.examen_id,
            version: 1,
            puntaje_maximo_garantizado: puntajeDecimalATexto(puntajeTotal),
        });
        await manager.insert(ExamenPoolSnapshotTema, temasSnapshot);
        await manager.insert(ExamenPoolSnapshotPregunta, preguntasSnapshot);
        await manager.insert(ExamenPoolSnapshotInciso, incisosSnapshot);
    }

    private async problemasParaPublicar(
        examen: Examen & { paralelos: ParaleloExamen[] },
        manager: EntityManager = this.dataSource.manager,
    ): Promise<{ paso: number; mensaje: string }[]> {
        const problemas: { paso: number; mensaje: string }[] = [];

        // Paso 2: preguntas.
        if (examen.modo_seleccion === 'manual') {
            const total = await manager
                .getRepository(ExamenPregunta)
                .count({ where: { examen_id: examen.examen_id } });

            if (total === 0) {
                problemas.push({
                    paso: 2,
                    mensaje: 'Agrega al menos una pregunta a la evaluación.',
                });
            } else {
                problemas.push(
                    ...(await this.problemasDePuntaje(
                        examen,
                        manager,
                    )),
                );
            }
        } else if (examen.modo_seleccion === 'aleatorio') {
            const criterios = await manager
                .getRepository(ExamenTema)
                .find({ where: { examen_id: examen.examen_id } });

            if (criterios.length === 0) {
                problemas.push({
                    paso: 2,
                    mensaje: 'Define al menos un criterio de preguntas aleatorias.',
                });
            } else {
                try {
                    await this.validarCriterios(criterios, examen, manager);
                } catch (error) {
                    if (error instanceof BadRequestException) {
                        problemas.push({ paso: 2, mensaje: error.message });
                    } else {
                        throw error;
                    }
                }
            }
        } else {
            problemas.push({
                paso: 2,
                mensaje: 'El modo de selección de preguntas no es válido.',
            });
        }

        // Paso 3: configuración y disponibilidad.
        if (!parsearPuntajeDecimal(examen.puntaje_total)) {
            problemas.push({
                paso: 3,
                mensaje:
                    'Define el puntaje total de la evaluación antes de publicarla.',
            });
        }

        if (
            examen.duracion_min === null ||
            examen.duracion_min < 5 ||
            examen.duracion_min > 720
        ) {
            problemas.push({
                paso: 3,
                mensaje: 'Define una duración entre 5 minutos y 12 horas.',
            });
        }

        if (!examen.disponible_desde || !examen.disponible_hasta) {
            problemas.push({
                paso: 3,
                mensaje: 'Define la fecha y hora de inicio y de finalización.',
            });
        } else {
            const desde = new Date(examen.disponible_desde).getTime();
            const hasta = new Date(examen.disponible_hasta).getTime();

            if (hasta <= desde) {
                problemas.push({
                    paso: 3,
                    mensaje:
                        'La fecha de finalización debe ser posterior a la de inicio.',
                });
            } else if (hasta <= Date.now()) {
                problemas.push({
                    paso: 3,
                    mensaje: 'La fecha de finalización debe ser futura.',
                });
            } else if (
                examen.duracion_min !== null &&
                (hasta - desde) / 60000 < examen.duracion_min
            ) {
                problemas.push({
                    paso: 3,
                    mensaje:
                        'La ventana de disponibilidad no puede ser menor que la duración de la evaluación.',
                });
            }
        }

        // Paso 4: al menos un estudiante activo asignado.
        const estudiantes = await this.estudiantesAsignados(examen, manager);

        if (estudiantes.length === 0) {
            problemas.push({
                paso: 4,
                mensaje:
                    examen.modo_asignacion === 'estudiantes'
                        ? 'Selecciona al menos un estudiante.'
                        : 'Selecciona al menos un paralelo con estudiantes activos inscritos.',
            });
        }

        return problemas;
    }

    // CONSULTAR EVALUACIONES (una o todas las del docente)

    private async consultar(docenteId: number, examenId?: number) {
        const examenes = await this.ejecutarEtapa(
            'consulta_principal',
            async () => {
                const consulta = this.examenRepository
                    .createQueryBuilder('examen')
                    .leftJoinAndSelect('examen.materia', 'materia')
                    .leftJoinAndSelect('examen.semestre', 'semestre')
                    .leftJoinAndSelect('examen.paralelos', 'paraleloExamen')
                    .leftJoinAndSelect('paraleloExamen.paralelo', 'paralelo')
                    .where(
                        '(examen.docente_id = :docenteId OR materia.docente_id = :docenteId OR semestre.docente_id = :docenteId)',
                        { docenteId },
                    )
                    .orderBy('examen.examen_id', 'DESC');

                if (examenId !== undefined) {
                    consulta.andWhere('examen.examen_id = :examenId', { examenId });
                }

                return consulta.getMany();
            },
            { docenteId, examenId },
        );

        if (examenes.length === 0) {
            return [];
        }

        const ids = examenes.map((examen) => examen.examen_id);

        // Preguntas = filas de examen_pregunta de cada evaluación.
        const filasPreguntas = await this.ejecutarEtapa(
            'preguntas',
            async () =>
                this.dataSource
                    .getRepository(ExamenPregunta)
                    .createQueryBuilder('ep')
                    .select('ep.examen_id', 'examen_id')
                    .addSelect('COUNT(*)', 'total')
                    .where('ep.examen_id IN (:...ids)', { ids })
                    .groupBy('ep.examen_id')
                    .getRawMany<{ examen_id: number; total: string }>(),
            { docenteId, examenId, countIds: ids.length },
        );

        // Inscritos activos = estudiantes activos de todos los paralelos.
        const filasInscritos = await this.ejecutarEtapa(
            'inscripciones',
            async () =>
                this.inscripcionRepository
                    .createQueryBuilder('inscripcion')
                    .innerJoin(
                        ParaleloExamen,
                        'pe',
                        'pe.paralelo_id = inscripcion.paralelo_id',
                    )
                    .innerJoin(
                        Estudiante,
                        'estudiante',
                        'estudiante.estudiante_id = inscripcion.estudiante_id',
                    )
                    .select('pe.examen_id', 'examen_id')
                    .addSelect('COUNT(DISTINCT inscripcion.estudiante_id)', 'total')
                    .where('pe.examen_id IN (:...ids)', { ids })
                    .andWhere('estudiante.activo = true')
                    .groupBy('pe.examen_id')
                    .getRawMany<{ examen_id: number; total: string }>(),
            { docenteId, examenId, countIds: ids.length },
        );

        // Estudiantes activos elegidos uno por uno.
        const filasEspecificos = await this.ejecutarEtapa(
            'estudiantes',
            async () =>
                this.dataSource
                    .getRepository(ExamenEstudiante)
                    .createQueryBuilder('ee')
                    .innerJoin(
                        Estudiante,
                        'estudiante',
                        'estudiante.estudiante_id = ee.estudiante_id',
                    )
                    .select('ee.examen_id', 'examen_id')
                    .addSelect('COUNT(*)', 'total')
                    .where('ee.examen_id IN (:...ids)', { ids })
                    .andWhere('estudiante.activo = true')
                    .groupBy('ee.examen_id')
                    .getRawMany<{ examen_id: number; total: string }>(),
            { docenteId, examenId, countIds: ids.length },
        );

        const preguntasPorExamen = new Map(
            filasPreguntas.map((fila) => [Number(fila.examen_id), Number(fila.total)]),
        );

        const inscritosPorExamen = new Map(
            filasInscritos.map((fila) => [Number(fila.examen_id), Number(fila.total)]),
        );

        const especificosPorExamen = new Map(
            filasEspecificos.map((fila) => [Number(fila.examen_id), Number(fila.total)]),
        );

        // En modo aleatorio las preguntas aún no están elegidas:
        // se muestran las cantidades pedidas en los criterios.
        const filasCriterios = await this.ejecutarEtapa(
            'temas',
            async () =>
                this.dataSource
                    .getRepository(ExamenTema)
                    .createQueryBuilder('et')
                    .select('et.examen_id', 'examen_id')
                    .addSelect('SUM(et.cantidad)', 'total')
                    .where('et.examen_id IN (:...ids)', { ids })
                    .groupBy('et.examen_id')
                    .getRawMany<{ examen_id: number; total: string }>(),
            { docenteId, examenId, countIds: ids.length },
        );

        const criteriosPorExamen = new Map(
            filasCriterios.map((fila) => [Number(fila.examen_id), Number(fila.total)]),
        );

        const resultado = await this.ejecutarEtapa(
            'transformacion_final',
            async () => examenes.map((examen) => {
                const materia = examen.materia ?? null;
                const semestre = examen.semestre ?? null;
                const paralelos = (examen.paralelos ?? []).flatMap((item) => {
                    if (!item?.paralelo) {
                        return [];
                    }

                    return [{
                        paralelo_id: item.paralelo.paralelo_id,
                        nombre_paralelo: item.paralelo.nombre_paralelo,
                    }];
                });

                return {
                    examen_id: examen.examen_id,
                    titulo: examen.titulo,
                    instrucciones: examen.instrucciones,
                    estado: examen.estado,
                    fecha: examen.disponible_desde,
                    modo_seleccion: examen.modo_seleccion,
                    orden_preguntas: examen.orden_preguntas,
                    duracion_min: examen.duracion_min,
                    // numeric llega como texto desde PostgreSQL; el contrato es numérico.
                    puntaje_total:
                        examen.puntaje_total === null
                            ? null
                            : Number(examen.puntaje_total),
                    disponible_desde: examen.disponible_desde,
                    disponible_hasta: examen.disponible_hasta,
                    modo_entrega_nota: examen.modo_entrega_nota,
                    modo_asignacion: examen.modo_asignacion,
                    // NULL = las respuestas correctas aún no se publicaron.
                    resultados_publicados_en: examen.resultados_publicados_en,
                    materia: materia
                        ? {
                            materia_id: materia.materia_id,
                            nombre: materia.nombre,
                        }
                        : null,
                    semestre: semestre
                        ? {
                            semestre_id: semestre.semestre_id,
                            gestion: semestre.gestion,
                        }
                        : null,
                    paralelos,
                    total_preguntas:
                        examen.modo_seleccion === 'aleatorio'
                            ? (criteriosPorExamen.get(examen.examen_id) ?? 0)
                            : (preguntasPorExamen.get(examen.examen_id) ?? 0),
                    total_inscritos:
                        examen.modo_asignacion === 'estudiantes'
                            ? (especificosPorExamen.get(examen.examen_id) ?? 0)
                            : (inscritosPorExamen.get(examen.examen_id) ?? 0),
                };
            }),
            { docenteId, examenId, countExamenes: examenes.length },
        );

        return resultado;
    }

    async findAll(docenteId: number) {
        return this.consultar(docenteId);
    }

    // Detalle de una evaluación, incluida la selección de preguntas guardada.
    async findOne(examenId: number, docenteId: number) {
        const [examen] = await this.consultar(docenteId, examenId);

        if (!examen) {
            throw new NotFoundException('La evaluación no existe.');
        }

        const esAleatorioPublicado =
            examen.estado === 'publicado' &&
            examen.modo_seleccion === 'aleatorio';
        const [preguntas, temas] = await Promise.all([
            esAleatorioPublicado
                ? Promise.resolve([])
                : this.dataSource
                    .getRepository(ExamenPregunta)
                    .find({
                        where: { examen_id: examenId },
                        order: { orden: 'ASC' },
                    }),
            this.dataSource
                .getRepository(ExamenTema)
                .find({ where: { examen_id: examenId } }),
        ]);

        const ids = preguntas.map((fila) => fila.pregunta_id);

        return {
            ...examen,
            pregunta_ids: ids,
            // Detalle de lo ya guardado. Incluye preguntas inactivas o de otra
            // materia para que el panel pueda mostrarlas al volver a la evaluación.
            preguntas: await this.obtenerPreguntasPorIds(ids, examenId),
            criterios: temas.map((fila) => ({
                tema_id: fila.tema_id,
                cantidad: fila.cantidad,
            })),
        };
    }

    /**
     * Detalle de preguntas concretas sin filtrar por estado ni por materia.
     * Se usa para reconstruir la selección guardada de una evaluación.
     */
    private async obtenerPreguntasPorIds(
        ids: number[],
        examenId: number,
        manager: EntityManager = this.dataSource.manager,
    ) {
        if (ids.length === 0) {
            return [];
        }

        const filas = await manager
            .getRepository(Pregunta)
            .createQueryBuilder('pregunta')
            .innerJoin('pregunta.tema', 'tema')
            .innerJoin('tema.materia', 'materia')
            .leftJoin('pregunta.incisos', 'inciso')
            .leftJoin(
                ExamenPregunta,
                'examenPregunta',
                'examenPregunta.pregunta_id = pregunta.pregunta_id AND examenPregunta.examen_id = :examenId',
                { examenId },
            )
            .select('pregunta.pregunta_id', 'pregunta_id')
            .addSelect('pregunta.enunciado', 'enunciado')
            .addSelect('pregunta.dificultad', 'dificultad')
            .addSelect('pregunta.activo', 'activo')
            .addSelect('tema.tema_id', 'tema_id')
            .addSelect('tema.nombre_tema', 'nombre_tema')
            .addSelect('materia.materia_id', 'materia_id')
            .addSelect('materia.nombre', 'materia_nombre')
            .addSelect('COALESCE(SUM(inciso.puntaje_max), 0)', 'puntos')
            .addSelect('MAX(examenPregunta.puntaje)', 'puntaje')
            .addSelect('COUNT(inciso.letra)', 'total_incisos')
            .addSelect(
                `COUNT(inciso.letra) FILTER (WHERE inciso.puntaje_max <= 0)`,
                'incisos_sin_puntaje',
            )
            .addSelect(
                `CASE
           WHEN COUNT(DISTINCT inciso.tipo_respuesta) = 1 THEN MIN(inciso.tipo_respuesta)
           WHEN COUNT(DISTINCT inciso.tipo_respuesta) > 1 THEN 'mixto'
           ELSE NULL
         END`,
                'tipo_respuesta',
            )
            .where('pregunta.pregunta_id IN (:...ids)', { ids })
            .groupBy('pregunta.pregunta_id')
            .addGroupBy('pregunta.activo')
            .addGroupBy('tema.tema_id')
            .addGroupBy('materia.materia_id')
            .getRawMany<{
                pregunta_id: number;
                enunciado: string;
                dificultad: string | null;
                activo: boolean;
                tema_id: number;
                nombre_tema: string;
                materia_id: number;
                materia_nombre: string;
                puntos: string;
                puntaje: string | null;
                total_incisos: string;
                incisos_sin_puntaje: string;
                tipo_respuesta: string | null;
            }>();

        // "Usada en N evaluaciones" (sin contar esta evaluación).
        const filasUsos = await manager
            .getRepository(ExamenPregunta)
            .createQueryBuilder('ep')
            .select('ep.pregunta_id', 'pregunta_id')
            .addSelect('COUNT(*)', 'total')
            .where('ep.pregunta_id IN (:...ids)', { ids })
            .andWhere('ep.examen_id <> :examenId', { examenId })
            .groupBy('ep.pregunta_id')
            .getRawMany<{ pregunta_id: number; total: string }>();

        const usosPorPregunta = new Map(
            filasUsos.map((fila) => [Number(fila.pregunta_id), Number(fila.total)]),
        );

        const porId = new Map(
            filas.map((fila) => [
                Number(fila.pregunta_id),
                {
                    pregunta_id: Number(fila.pregunta_id),
                    enunciado: fila.enunciado,
                    dificultad: fila.dificultad,
                    tipo_respuesta: fila.tipo_respuesta,
                    puntos: Number(fila.puntos),
                    // Puntaje propio de esta evaluación; `null` = aún no se ha
                    // inicializado (evaluaciones anteriores a esta columna).
                    puntaje:
                        fila.puntaje === null || fila.puntaje === undefined
                            ? null
                            : Number(fila.puntaje),
                    total_incisos: Number(fila.total_incisos),
                    incisos_sin_puntaje: Number(fila.incisos_sin_puntaje),
                    usada_en: usosPorPregunta.get(Number(fila.pregunta_id)) ?? 0,
                    activo: fila.activo,
                    tema: {
                        tema_id: Number(fila.tema_id),
                        nombre_tema: fila.nombre_tema,
                    },
                    materia: {
                        materia_id: Number(fila.materia_id),
                        nombre: fila.materia_nombre,
                    },
                },
            ]),
        );

        // Se conserva el orden de la selección guardada.
        return ids.flatMap((id) => {
            const pregunta = porId.get(id);
            return pregunta ? [pregunta] : [];
        });
    }

    // BANCO DE PREGUNTAS PARA ARMAR LA EVALUACIÓN

    async getBanco(
        examenId: number,
        docenteId: number,
        materiaIdSolicitada?: number,
    ) {
        const examen = await this.examenRepository.findOne({
            where: { examen_id: examenId, docente_id: docenteId },
        });

        if (!examen) {
            throw new NotFoundException('La evaluación no existe.');
        }

        const materiaId = materiaIdSolicitada ?? examen.materia_id;

        if (materiaId === null || materiaId === undefined) {
            throw new BadRequestException(
                'La evaluación no tiene una materia asociada.',
            );
        }

        const materia = await this.materiaRepository.findOne({
            where: { materia_id: materiaId, docente_id: docenteId },
        });

        if (!materia) {
            throw new BadRequestException(
                'La materia no existe o no pertenece al docente.',
            );
        }

        // Todas las preguntas activas del docente (de todas sus materias).
        // El tipo y los puntos se calculan a partir de los incisos.
        const filas = await this.preguntaRepository
            .createQueryBuilder('pregunta')
            .innerJoin('pregunta.tema', 'tema')
            .innerJoin('tema.materia', 'materia')
            .leftJoin('pregunta.incisos', 'inciso')
            .select('pregunta.pregunta_id', 'pregunta_id')
            .addSelect('pregunta.enunciado', 'enunciado')
            .addSelect('pregunta.dificultad', 'dificultad')
            .addSelect('tema.tema_id', 'tema_id')
            .addSelect('tema.nombre_tema', 'nombre_tema')
            .addSelect('materia.materia_id', 'materia_id')
            .addSelect('materia.nombre', 'materia_nombre')
            .addSelect('COALESCE(SUM(inciso.puntaje_max), 0)', 'puntos')
            .addSelect(
                `CASE
           WHEN COUNT(DISTINCT inciso.tipo_respuesta) = 1 THEN MIN(inciso.tipo_respuesta)
           WHEN COUNT(DISTINCT inciso.tipo_respuesta) > 1 THEN 'mixto'
           ELSE NULL
         END`,
                'tipo_respuesta',
            )
            .where('materia.docente_id = :docenteId', { docenteId })
            .andWhere('pregunta.activo = true')
            .groupBy('pregunta.pregunta_id')
            .addGroupBy('tema.tema_id')
            .addGroupBy('materia.materia_id')
            .orderBy('pregunta.pregunta_id', 'ASC')
            .getRawMany<{
                pregunta_id: number;
                enunciado: string;
                dificultad: string | null;
                tema_id: number;
                nombre_tema: string;
                materia_id: number;
                materia_nombre: string;
                puntos: string;
                tipo_respuesta: string | null;
            }>();

        // "Usada en N evaluaciones" (sin contar esta evaluación).
        const idsPreguntas = filas.map((fila) => Number(fila.pregunta_id));

        const filasUsos =
            idsPreguntas.length === 0
                ? []
                : await this.dataSource
                    .getRepository(ExamenPregunta)
                    .createQueryBuilder('ep')
                    .select('ep.pregunta_id', 'pregunta_id')
                    .addSelect('COUNT(*)', 'total')
                    .where('ep.pregunta_id IN (:...ids)', { ids: idsPreguntas })
                    .andWhere('ep.examen_id <> :examenId', { examenId })
                    .groupBy('ep.pregunta_id')
                    .getRawMany<{ pregunta_id: number; total: string }>();

        const usosPorPregunta = new Map(
            filasUsos.map((fila) => [Number(fila.pregunta_id), Number(fila.total)]),
        );

        const preguntasMateria = filas.filter(
            (fila) => Number(fila.materia_id) === materiaId,
        );

        const temas = await this.temaRepository.find({
            where: { materia_id: materiaId },
            order: { nombre_tema: 'ASC' },
        });

        return {
            materia_id: materiaId,
            // Total de preguntas del docente, de todas sus materias.
            total_banco: filas.length,
            preguntas: preguntasMateria.map((fila) => ({
                pregunta_id: Number(fila.pregunta_id),
                enunciado: fila.enunciado,
                dificultad: fila.dificultad,
                tipo_respuesta: fila.tipo_respuesta,
                puntos: Number(fila.puntos),
                usada_en: usosPorPregunta.get(Number(fila.pregunta_id)) ?? 0,
                tema: {
                    tema_id: Number(fila.tema_id),
                    nombre_tema: fila.nombre_tema,
                },
                materia: {
                    materia_id: Number(fila.materia_id),
                    nombre: fila.materia_nombre,
                },
            })),
            temas: temas.map((tema) => ({
                tema_id: tema.tema_id,
                nombre_tema: tema.nombre_tema,
                disponibles: preguntasMateria.filter(
                    (fila) => Number(fila.tema_id) === tema.tema_id,
                ).length,
            })),
        };
    }

    // GUARDAR LA SELECCIÓN DE PREGUNTAS (manual o aleatoria)

    async guardarSeleccion(
        examenId: number,
        dto: GuardarSeleccionDto,
        docenteId: number,
    ) {
        if (
            dto.modo_seleccion !== 'manual' &&
            dto.modo_seleccion !== 'aleatorio'
        ) {
            throw new BadRequestException(
                'El modo de selección de preguntas no es válido.',
            );
        }

        return this.dataSource.transaction(async (manager) => {
            const examen = await manager
                .getRepository(Examen)
                .createQueryBuilder('examen')
                .where('examen.examen_id = :examenId', { examenId })
                .andWhere('examen.docente_id = :docenteId', { docenteId })
                .setLock('pessimistic_write')
                .getOne();

            if (!examen) {
                throw new NotFoundException('La evaluación no existe.');
            }

            if (examen.estado !== 'borrador') {
                throw new BadRequestException(
                    'Solo se puede cambiar la selección de una evaluación en borrador.',
                );
            }

            if (dto.modo_seleccion === 'manual') {
                const ids = dto.pregunta_ids ?? [];
                const puntajesSolicitados = new Map(
                    (dto.puntajes ?? []).map((fila) => [
                        fila.pregunta_id,
                        fila.puntaje,
                    ]),
                );
                const fueraDeSeleccion = [...puntajesSolicitados.keys()].filter(
                    (preguntaId) => !ids.includes(preguntaId),
                );

                if (fueraDeSeleccion.length > 0) {
                    throw new BadRequestException(
                        'Solo se puede indicar el puntaje de las preguntas seleccionadas.',
                    );
                }

                await this.validarPreguntasManual(ids, docenteId, manager);
                const puntajesBanco = await this.obtenerPuntajesBanco(
                    ids,
                    manager,
                );

                await manager.delete(ExamenPregunta, { examen_id: examenId });
                await manager.delete(ExamenTema, { examen_id: examenId });

                if (ids.length > 0) {
                    await manager.insert(
                        ExamenPregunta,
                        ids.map((pregunta_id, indice) => ({
                            examen_id: examenId,
                            pregunta_id,
                            orden: indice + 1,
                            // Sin un puntaje explícito, se conserva el valor
                            // inicial del banco.
                            puntaje:
                                puntajesSolicitados.get(pregunta_id) !==
                                undefined
                                    ? String(
                                        puntajesSolicitados.get(pregunta_id),
                                    )
                                    : (puntajesBanco.get(pregunta_id) ?? null),
                        })),
                    );
                }

                const actualizacion = await manager.update(
                    Examen,
                    {
                        examen_id: examenId,
                        docente_id: docenteId,
                        estado: 'borrador',
                    },
                    { modo_seleccion: 'manual' },
                );

                if (actualizacion.affected === 0) {
                    throw new BadRequestException(
                        'Solo se puede cambiar la selección de una evaluación en borrador.',
                    );
                }

                return {
                    modo_seleccion: 'manual',
                    pregunta_ids: ids,
                    criterios: [],
                    total_preguntas: ids.length,
                };
            }

            const criterios = dto.criterios ?? [];

            await this.validarCriterios(criterios, examen, manager);
            await manager.delete(ExamenPregunta, { examen_id: examenId });
            await manager.delete(ExamenTema, { examen_id: examenId });

            if (criterios.length > 0) {
                await manager.insert(
                    ExamenTema,
                    criterios.map((criterio) => ({
                        examen_id: examenId,
                        tema_id: criterio.tema_id,
                        cantidad: criterio.cantidad,
                    })),
                );
            }

            const actualizacion = await manager.update(
                Examen,
                {
                    examen_id: examenId,
                    docente_id: docenteId,
                    estado: 'borrador',
                },
                { modo_seleccion: 'aleatorio' },
            );

            if (actualizacion.affected === 0) {
                throw new BadRequestException(
                    'Solo se puede cambiar la selección de una evaluación en borrador.',
                );
            }

            return {
                modo_seleccion: 'aleatorio',
                pregunta_ids: [],
                criterios: criterios.map((criterio) => ({
                    tema_id: criterio.tema_id,
                    cantidad: criterio.cantidad,
                })),
                total_preguntas: criterios.reduce(
                    (suma, criterio) => suma + criterio.cantidad,
                    0,
                ),
            };
        });
    }

    // GUARDAR LOS PUNTAJES DE LAS PREGUNTAS YA SELECCIONADAS (paso 2)

    async guardarPuntajes(
        examenId: number,
        dto: GuardarPuntajesDto,
        docenteId: number,
    ) {
        await this.dataSource.transaction(async (manager) => {
            const examen = await manager
                .getRepository(Examen)
                .createQueryBuilder('examen')
                .where('examen.examen_id = :examenId', { examenId })
                .andWhere('examen.docente_id = :docenteId', { docenteId })
                .setLock('pessimistic_write')
                .getOne();

            if (!examen) {
                throw new NotFoundException('La evaluación no existe.');
            }

            if (examen.estado !== 'borrador') {
                throw new BadRequestException(
                    'Solo se pueden modificar los puntajes de una evaluación en borrador.',
                );
            }

            const filas = await manager.getRepository(ExamenPregunta).find({
                where: { examen_id: examenId },
                order: { orden: 'ASC' },
            });
            const preguntasPorId = new Map(
                filas.map((fila) => [fila.pregunta_id, fila]),
            );

            for (const item of dto.puntajes) {
                if (!preguntasPorId.has(item.pregunta_id)) {
                    throw new BadRequestException(
                        `La pregunta #${item.pregunta_id} no pertenece a la evaluación.`,
                    );
                }
            }

            const totalConfigurado = parsearPuntajeDecimal(
                examen.puntaje_total,
            );

            if (!totalConfigurado) {
                throw new BadRequestException(
                    'Configure el puntaje total de la evaluación antes de guardar los puntajes de las preguntas.',
                );
            }

            const solicitados = new Map<number, PuntajeDecimal>();

            for (const item of dto.puntajes) {
                const puntaje = parsearPuntajeDecimal(item.puntaje);

                if (!puntaje) {
                    throw new BadRequestException(
                        `El puntaje de la pregunta #${item.pregunta_id} debe ser un número mayor que cero.`,
                    );
                }

                solicitados.set(item.pregunta_id, puntaje);
            }

            // La suma se valida con el puntaje resultante de todas las
            // preguntas, no solo con las enviadas, para que una actualización
            // parcial no deje la evaluación por encima de su total.
            const puntajesBanco = await this.obtenerPuntajesBanco(
                filas.map((fila) => fila.pregunta_id),
                manager,
            );
            const efectivos = filas.map((fila) => {
                const solicitado = solicitados.get(fila.pregunta_id);

                if (solicitado) return solicitado;

                const guardado = parsearPuntajeDecimal(fila.puntaje);

                if (guardado) return guardado;

                const delBanco = parsearPuntajeDecimal(
                    puntajesBanco.get(fila.pregunta_id),
                );

                if (delBanco) return delBanco;

                throw new BadRequestException(
                    `La pregunta #${fila.pregunta_id} no tiene un puntaje válido. Asigne uno mayor que cero.`,
                );
            });
            const suma = sumarPuntajesDecimales(efectivos);

            if (
                puntajeDecimalANumero(suma) >
                puntajeDecimalANumero(totalConfigurado)
            ) {
                throw new BadRequestException(
                    `La suma de los puntajes de las preguntas (${puntajeDecimalATexto(suma)}) no puede superar el puntaje total configurado (${puntajeDecimalATexto(totalConfigurado)}).`,
                );
            }

            for (const item of dto.puntajes) {
                await manager.update(
                    ExamenPregunta,
                    {
                        examen_id: examenId,
                        pregunta_id: item.pregunta_id,
                    },
                    { puntaje: String(item.puntaje) },
                );
            }
        });

        return this.findOne(examenId, docenteId);
    }

    // Puntaje inicial de cada pregunta: suma de los `puntaje_max` de sus
    // incisos. Las preguntas sin un total positivo válido quedan fuera del
    // mapa y se guardan en `NULL`.
    private async obtenerPuntajesBanco(
        ids: number[],
        manager: EntityManager,
    ): Promise<Map<number, string>> {
        if (ids.length === 0) return new Map();

        const filas = await manager
            .getRepository(Inciso)
            .createQueryBuilder('inciso')
            .select('inciso.pregunta_id', 'pregunta_id')
            .addSelect('SUM(inciso.puntaje_max)', 'puntaje')
            .where('inciso.pregunta_id IN (:...ids)', { ids })
            .groupBy('inciso.pregunta_id')
            .getRawMany<{ pregunta_id: number; puntaje: string }>();

        const puntajes = new Map<number, string>();

        for (const fila of filas) {
            const puntaje = parsearPuntajeDecimal(fila.puntaje);

            if (puntaje) {
                puntajes.set(
                    Number(fila.pregunta_id),
                    puntajeDecimalATexto(puntaje),
                );
            }
        }

        return puntajes;
    }

    // Las preguntas deben existir, estar activas y ser del docente.
    private async validarPreguntasManual(
        ids: number[],
        docenteId: number,
        manager: EntityManager = this.dataSource.manager,
    ) {
        if (ids.length === 0) return;

        const validas = await manager
            .getRepository(Pregunta)
            .createQueryBuilder('pregunta')
            .innerJoin('pregunta.tema', 'tema')
            .innerJoin('tema.materia', 'materia')
            .where('pregunta.pregunta_id IN (:...ids)', { ids })
            .andWhere('pregunta.activo = true')
            .andWhere('materia.docente_id = :docenteId', { docenteId })
            .getCount();

        if (validas !== ids.length) {
            throw new BadRequestException(
                'Alguna pregunta no existe, está inactiva o no pertenece al docente.',
            );
        }
    }

    // Los temas deben ser de la materia de la evaluación, sin repetirse,
    // y la cantidad no puede superar las preguntas disponibles.
    private async validarCriterios(
        criterios: { tema_id: number; cantidad: number }[],
        examen: Examen,
        manager: EntityManager = this.dataSource.manager,
    ) {
        if (criterios.length === 0) return;

        if (examen.materia_id === null) {
            throw new BadRequestException(
                'La evaluación no tiene una materia asociada.',
            );
        }

        const idsTemas = criterios.map((criterio) => criterio.tema_id);

        if (new Set(idsTemas).size !== idsTemas.length) {
            throw new BadRequestException(
                'No repitas el mismo tema en los criterios.',
            );
        }

        const temas = await manager.getRepository(Tema).find({
            where: { tema_id: In(idsTemas), materia_id: examen.materia_id },
        });

        if (temas.length !== idsTemas.length) {
            throw new BadRequestException(
                'Algún tema no pertenece a la materia de la evaluación.',
            );
        }

        for (const criterio of criterios) {
            if (!Number.isInteger(criterio.cantidad) || criterio.cantidad <= 0) {
                throw new BadRequestException(
                    'La cantidad de preguntas por tema debe ser un entero mayor que cero.',
                );
            }
        }

        const filas = await manager
            .getRepository(Pregunta)
            .createQueryBuilder('pregunta')
            .select('pregunta.tema_id', 'tema_id')
            .addSelect('COUNT(*)', 'total')
            .where('pregunta.tema_id IN (:...ids)', { ids: idsTemas })
            .andWhere('pregunta.activo = true')
            .groupBy('pregunta.tema_id')
            .getRawMany<{ tema_id: number; total: string }>();

        const disponibles = new Map(
            filas.map((fila) => [Number(fila.tema_id), Number(fila.total)]),
        );

        for (const criterio of criterios) {
            const hay = disponibles.get(criterio.tema_id) ?? 0;

            if (criterio.cantidad > hay) {
                const tema = temas.find((item) => item.tema_id === criterio.tema_id);

                throw new BadRequestException(
                    `El tema "${tema?.nombre_tema}" solo tiene ${hay} preguntas disponibles.`,
                );
            }
        }
    }
}