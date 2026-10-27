import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Examen } from './entity/examen.entity';
import { Materia } from '../materia/entity/materia.entity';
import { Semestre } from '../semestre/entity/semestre.entity';
import { Paralelo } from '../paralelo/entity/paralelo.entity';
import { ParaleloExamen } from '../paraleloexamen/entity/paraleloexamen.entity';
import { Inscripcion } from '../inscripcion/entity/inscripcion.entity';
import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';

import { CreateExamenDto } from './dto/create-examen.dto';


import { In } from 'typeorm';
import { ExamenTema } from '../examentema/entity/examentema.entity';
import { Pregunta } from '../pregunta/entity/pregunta.entity';
import { Tema } from '../tema/entity/tema.entity';
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
            total_preguntas: preguntasPorExamen.get(examen.examen_id) ?? 0,
            total_inscritos: inscritosPorExamen.get(examen.examen_id) ?? 0,
        }));
    }

    async findAll(docenteId: number) {
        return this.consultar(docenteId);
    }

    async findOne(examenId: number, docenteId: number) {
        const [examen] = await this.consultar(docenteId, examenId);

        if (!examen) {
            throw new NotFoundException('La evaluación no existe.');
        }

        return examen;
    }

    // ---------- PASO 2: SELECCIÓN DE PREGUNTAS ----------

    // Solo se edita una evaluación propia y en borrador.
    private async obtenerBorrador(examenId: number, docenteId: number) {
        const examen = await this.examenRepository.findOneBy({
            examen_id: examenId,
            docente_id: docenteId,
        });

        if (!examen) {
            throw new NotFoundException('La evaluación no existe.');
        }

        if (examen.estado !== 'borrador') {
            throw new BadRequestException(
                'Solo se puede editar una evaluación en borrador.',
            );
        }

        if (examen.materia_id === null) {
            throw new BadRequestException('La evaluación no tiene materia.');
        }

        return examen as Examen & { materia_id: number };
    }

    async obtenerSeleccion(examenId: number, docenteId: number) {
        const examen = await this.examenRepository.findOneBy({
            examen_id: examenId,
            docente_id: docenteId,
        });

        if (!examen) {
            throw new NotFoundException('La evaluación no existe.');
        }

        const preguntas = await this.dataSource
            .getRepository(ExamenPregunta)
            .find({ where: { examen_id: examenId }, order: { orden: 'ASC' } });

        const temas = await this.dataSource
            .getRepository(ExamenTema)
            .find({ where: { examen_id: examenId } });

        return {
            examen_id: examenId,
            materia_id: examen.materia_id,
            modo_seleccion: examen.modo_seleccion,
            preguntaIds: preguntas.map((item) => item.pregunta_id),
            criterios: temas.map((item) => ({
                tema_id: item.tema_id,
                cantidad: item.cantidad,
            })),
        };
    }

    // Las preguntas deben existir, estar activas y ser de la materia del examen.
    private async validarPreguntas(ids: number[], materiaId: number) {
        const encontradas = await this.dataSource.getRepository(Pregunta).count({
            where: {
                pregunta_id: In(ids),
                activo: true,
                tema: { materia_id: materiaId },
            },
        });

        if (encontradas !== ids.length) {
            throw new BadRequestException(
                'Una o más preguntas no existen o no pertenecen a la materia de la evaluación.',
            );
        }
    }

    // Los temas deben ser de la materia y alcanzar las preguntas pedidas.
    private async validarCriterios(
        criterios: { tema_id: number; cantidad: number }[],
        materiaId: number,
    ) {
        const ids = criterios.map((criterio) => criterio.tema_id);

        if (new Set(ids).size !== ids.length) {
            throw new BadRequestException('No repitas el mismo tema en los criterios.');
        }

        const temas = await this.dataSource.getRepository(Tema).find({
            where: { tema_id: In(ids), materia_id: materiaId },
        });

        if (temas.length !== ids.length) {
            throw new BadRequestException(
                'Uno o más temas no pertenecen a la materia de la evaluación.',
            );
        }

        const filas = await this.dataSource
            .getRepository(Pregunta)
            .createQueryBuilder('p')
            .select('p.tema_id', 'tema_id')
            .addSelect('COUNT(*)', 'total')
            .where('p.tema_id IN (:...ids)', { ids })
            .andWhere('p.activo = true')
            .groupBy('p.tema_id')
            .getRawMany<{ tema_id: number; total: string }>();

        const disponibles = new Map(
            filas.map((fila) => [Number(fila.tema_id), Number(fila.total)]),
        );

        for (const criterio of criterios) {
            const total = disponibles.get(criterio.tema_id) ?? 0;

            if (criterio.cantidad > total) {
                const tema = temas.find((item) => item.tema_id === criterio.tema_id);

                throw new BadRequestException(
                    `El tema "${tema?.nombre_tema}" solo tiene ${total} preguntas disponibles.`,
                );
            }
        }
    }

    async guardarSeleccion(
        examenId: number,
        dto: GuardarSeleccionDto,
        docenteId: number,
    ) {
        const examen = await this.obtenerBorrador(examenId, docenteId);

        const preguntaIds = dto.preguntaIds ?? [];
        const criterios = dto.criterios ?? [];

        if (dto.modo_seleccion === 'manual') {
            await this.validarPreguntas(preguntaIds, examen.materia_id);
        } else {
            await this.validarCriterios(criterios, examen.materia_id);
        }

        // Se reemplaza la selección anterior completa, o no se guarda nada.
        return this.dataSource.transaction(async (manager) => {
            await manager.update(
                Examen,
                { examen_id: examenId },
                { modo_seleccion: dto.modo_seleccion },
            );

            await manager.delete(ExamenPregunta, { examen_id: examenId });
            await manager.delete(ExamenTema, { examen_id: examenId });

            if (dto.modo_seleccion === 'manual') {
                await manager.save(
                    ExamenPregunta,
                    preguntaIds.map((pregunta_id, indice) =>
                        manager.create(ExamenPregunta, {
                            examen_id: examenId,
                            pregunta_id,
                            orden: indice + 1,
                        }),
                    ),
                );
            } else {
                await manager.save(
                    ExamenTema,
                    criterios.map((criterio) =>
                        manager.create(ExamenTema, {
                            examen_id: examenId,
                            tema_id: criterio.tema_id,
                            cantidad: criterio.cantidad,
                        }),
                    ),
                );
            }

            return {
                examen_id: examenId,
                modo_seleccion: dto.modo_seleccion,
                total_preguntas:
                    dto.modo_seleccion === 'manual'
                        ? preguntaIds.length
                        : criterios.reduce((suma, item) => suma + item.cantidad, 0),
            };
        });
    }
}