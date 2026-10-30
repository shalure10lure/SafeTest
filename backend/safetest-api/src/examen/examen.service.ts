import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Examen } from './entity/examen.entity';
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

import { CreateExamenDto } from './dto/create-examen.dto';
import { GuardarAsignacionDto } from './dto/guardar-asignacion.dto';
import { GuardarConfiguracionDto } from './dto/guardar-configuracion.dto';
import { GuardarSeleccionDto } from './dto/guardar-seleccion.dto';
import { UpdateExamenDto } from './dto/update-examen.dto';

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

    // La materia, el periodo y el paralelo deben ser del docente,
    // la materia debe estar asociada al periodo y el paralelo
    // debe corresponder a esa materia y a ese periodo.
    private async validarRelaciones(
        dto: Pick<CreateExamenDto, 'materia_id' | 'semestre_id' | 'paralelo_id'>,
        docenteId: number,
    ) {
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
        const examen = await this.examenRepository.findOne({
            where: { examen_id: examenId, docente_id: docenteId },
            relations: { paralelos: true },
        });

        if (!examen) {
            throw new NotFoundException('La evaluación no existe.');
        }

        if (examen.estado !== 'borrador') {
            throw new BadRequestException(
                'Solo se puede editar la información de una evaluación en borrador.',
            );
        }

        const titulo =
            dto.titulo !== undefined ? dto.titulo.trim() : (examen.titulo ?? '');

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
        const cambiaContexto = cambiaMateria || semestreId !== examen.semestre_id;
        const cambiaParalelo = !paralelosActuales.includes(paraleloId);

        const criteriosReiniciados = await this.dataSource.transaction(
            async (manager) => {
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
                    await manager.delete(ParaleloExamen, { examen_id: examenId });
                    await manager.insert(ParaleloExamen, {
                        paralelo_id: paraleloId,
                        examen_id: examenId,
                    });
                    await manager.delete(ExamenEstudiante, { examen_id: examenId });
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
                : await this.inscripcionRepository.find({
                    where: {
                        paralelo_id: In(paralelos.map((item) => item.paralelo_id)),
                    },
                    relations: { estudiante: true },
                });

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
        const examen = await this.examenRepository.findOne({
            where: { examen_id: examenId, docente_id: docenteId },
        });

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
        const validos = await this.paraleloRepository.find({
            where: {
                docente_id: docenteId,
                materia_id: materiaId,
                semestre_id: examen.semestre_id,
            },
        });
        const idsValidos = validos.map((item) => item.paralelo_id);

        if (dto.modo_asignacion === 'paralelos') {
            const paraleloIds = dto.paralelo_ids ?? [];

            if (!paraleloIds.every((id) => idsValidos.includes(id))) {
                throw new BadRequestException(
                    'Algún paralelo no existe o no corresponde a la materia y al periodo de la evaluación.',
                );
            }

            const conteo = await this.inscripcionRepository
                .createQueryBuilder('inscripcion')
                .select('COUNT(DISTINCT inscripcion.estudiante_id)', 'total')
                .where('inscripcion.paralelo_id IN (:...ids)', { ids: paraleloIds })
                .getRawOne<{ total: string }>();

            const totalEstudiantes = Number(conteo?.total ?? 0);

            if (totalEstudiantes === 0) {
                throw new BadRequestException(
                    'Los paralelos seleccionados no tienen estudiantes inscritos.',
                );
            }

            await this.dataSource.transaction(async (manager) => {
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
            });

            return {
                modo_asignacion: 'paralelos',
                total_estudiantes: totalEstudiantes,
            };
        }

        const estudianteIds = dto.estudiante_ids ?? [];

        const inscripciones =
            idsValidos.length === 0
                ? []
                : await this.inscripcionRepository.find({
                    where: {
                        paralelo_id: In(idsValidos),
                        estudiante_id: In(estudianteIds),
                    },
                });

        const encontrados = new Set(inscripciones.map((item) => item.estudiante_id));

        if (!estudianteIds.every((id) => encontrados.has(id))) {
            throw new BadRequestException(
                'Algún estudiante no está inscrito en tus paralelos de esta materia y periodo.',
            );
        }

        // La evaluación queda vinculada a los paralelos de esos estudiantes.
        const paraleloIds = [
            ...new Set(inscripciones.map((item) => item.paralelo_id)),
        ];

        await this.dataSource.transaction(async (manager) => {
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
        });

        return {
            modo_asignacion: 'estudiantes',
            total_estudiantes: estudianteIds.length,
        };
    }

    // CONSULTAR EVALUACIONES (una o todas las del docente)

    private async consultar(docenteId: number, examenId?: number) {
        const consulta = this.examenRepository
            .createQueryBuilder('examen')
            .leftJoinAndSelect('examen.materia', 'materia')
            .leftJoinAndSelect('examen.semestre', 'semestre')
            .leftJoinAndSelect('examen.paralelos', 'paraleloExamen')
            .leftJoinAndSelect('paraleloExamen.paralelo', 'paralelo')
            .where('examen.docente_id = :docenteId', { docenteId })
            .orderBy('examen.examen_id', 'DESC');

        if (examenId !== undefined) {
            consulta.andWhere('examen.examen_id = :examenId', { examenId });
        }

        const examenes = await consulta.getMany();

        if (examenes.length === 0) {
            return [];
        }

        const ids = examenes.map((examen) => examen.examen_id);

        // Preguntas = filas de examen_pregunta de cada evaluación.
        const filasPreguntas = await this.dataSource
            .getRepository(ExamenPregunta)
            .createQueryBuilder('ep')
            .select('ep.examen_id', 'examen_id')
            .addSelect('COUNT(*)', 'total')
            .where('ep.examen_id IN (:...ids)', { ids })
            .groupBy('ep.examen_id')
            .getRawMany<{ examen_id: number; total: string }>();

        // Inscritos = estudiantes de todos los paralelos de cada evaluación.
        const filasInscritos = await this.inscripcionRepository
            .createQueryBuilder('inscripcion')
            .innerJoin(
                ParaleloExamen,
                'pe',
                'pe.paralelo_id = inscripcion.paralelo_id',
            )
            .select('pe.examen_id', 'examen_id')
            .addSelect('COUNT(DISTINCT inscripcion.estudiante_id)', 'total')
            .where('pe.examen_id IN (:...ids)', { ids })
            .groupBy('pe.examen_id')
            .getRawMany<{ examen_id: number; total: string }>();

        // Estudiantes elegidos uno por uno (modo "estudiantes específicos").
        const filasEspecificos = await this.dataSource
            .getRepository(ExamenEstudiante)
            .createQueryBuilder('ee')
            .select('ee.examen_id', 'examen_id')
            .addSelect('COUNT(*)', 'total')
            .where('ee.examen_id IN (:...ids)', { ids })
            .groupBy('ee.examen_id')
            .getRawMany<{ examen_id: number; total: string }>();

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
        const filasCriterios = await this.dataSource
            .getRepository(ExamenTema)
            .createQueryBuilder('et')
            .select('et.examen_id', 'examen_id')
            .addSelect('SUM(et.cantidad)', 'total')
            .where('et.examen_id IN (:...ids)', { ids })
            .groupBy('et.examen_id')
            .getRawMany<{ examen_id: number; total: string }>();

        const criteriosPorExamen = new Map(
            filasCriterios.map((fila) => [Number(fila.examen_id), Number(fila.total)]),
        );

        return examenes.map((examen) => ({
            examen_id: examen.examen_id,
            titulo: examen.titulo,
            instrucciones: examen.instrucciones,
            estado: examen.estado,
            fecha: examen.disponible_desde,
            modo_seleccion: examen.modo_seleccion,
            orden_preguntas: examen.orden_preguntas,
            duracion_min: examen.duracion_min,
            disponible_desde: examen.disponible_desde,
            disponible_hasta: examen.disponible_hasta,
            modo_entrega_nota: examen.modo_entrega_nota,
            modo_asignacion: examen.modo_asignacion,
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
            paralelos: (examen.paralelos ?? []).map((item) => ({
                paralelo_id: item.paralelo.paralelo_id,
                nombre_paralelo: item.paralelo.nombre_paralelo,
            })),
            total_preguntas:
                examen.modo_seleccion === 'aleatorio'
                    ? (criteriosPorExamen.get(examen.examen_id) ?? 0)
                    : (preguntasPorExamen.get(examen.examen_id) ?? 0),
            total_inscritos:
                examen.modo_asignacion === 'estudiantes'
                    ? (especificosPorExamen.get(examen.examen_id) ?? 0)
                    : (inscritosPorExamen.get(examen.examen_id) ?? 0),
        }));
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

        const [preguntas, temas] = await Promise.all([
            this.dataSource
                .getRepository(ExamenPregunta)
                .find({ where: { examen_id: examenId }, order: { orden: 'ASC' } }),
            this.dataSource
                .getRepository(ExamenTema)
                .find({ where: { examen_id: examenId } }),
        ]);

        return {
            ...examen,
            pregunta_ids: preguntas.map((fila) => fila.pregunta_id),
            criterios: temas.map((fila) => ({
                tema_id: fila.tema_id,
                cantidad: fila.cantidad,
            })),
        };
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
        const examen = await this.examenRepository.findOne({
            where: { examen_id: examenId, docente_id: docenteId },
        });

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

            await this.validarPreguntasManual(ids, docenteId);

            await this.dataSource.transaction(async (manager) => {
                await manager.delete(ExamenPregunta, { examen_id: examenId });
                await manager.delete(ExamenTema, { examen_id: examenId });

                if (ids.length > 0) {
                    await manager.insert(
                        ExamenPregunta,
                        ids.map((pregunta_id, indice) => ({
                            examen_id: examenId,
                            pregunta_id,
                            orden: indice + 1,
                        })),
                    );
                }

                await manager.update(
                    Examen,
                    { examen_id: examenId },
                    { modo_seleccion: 'manual' },
                );
            });

            return {
                modo_seleccion: 'manual',
                pregunta_ids: ids,
                criterios: [],
                total_preguntas: ids.length,
            };
        }

        const criterios = dto.criterios ?? [];

        await this.validarCriterios(criterios, examen);

        await this.dataSource.transaction(async (manager) => {
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

            await manager.update(
                Examen,
                { examen_id: examenId },
                { modo_seleccion: 'aleatorio' },
            );
        });

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
    }

    // Las preguntas deben existir, estar activas y ser del docente.
    private async validarPreguntasManual(ids: number[], docenteId: number) {
        if (ids.length === 0) return;

        const validas = await this.preguntaRepository
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

        const temas = await this.temaRepository.find({
            where: { tema_id: In(idsTemas), materia_id: examen.materia_id },
        });

        if (temas.length !== idsTemas.length) {
            throw new BadRequestException(
                'Algún tema no pertenece a la materia de la evaluación.',
            );
        }

        const filas = await this.preguntaRepository
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