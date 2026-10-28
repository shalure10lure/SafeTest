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
import { Pregunta } from '../pregunta/entity/pregunta.entity';
import { Tema } from '../tema/entity/tema.entity';

import { CreateExamenDto } from './dto/create-examen.dto';
import { GuardarSeleccionDto } from './dto/guardar-seleccion.dto';

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
    private async validarRelaciones(dto: CreateExamenDto, docenteId: number) {
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

        const preguntasPorExamen = new Map(
            filasPreguntas.map((fila) => [Number(fila.examen_id), Number(fila.total)]),
        );

        const inscritosPorExamen = new Map(
            filasInscritos.map((fila) => [Number(fila.examen_id), Number(fila.total)]),
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
            total_inscritos: inscritosPorExamen.get(examen.examen_id) ?? 0,
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