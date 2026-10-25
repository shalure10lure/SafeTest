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
}