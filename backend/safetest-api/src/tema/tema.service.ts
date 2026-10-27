import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Tema } from './entity/tema.entity';
import { Materia } from '../materia/entity/materia.entity';

@Injectable()
export class TemaService {
    constructor(
        @InjectRepository(Tema)
        private readonly temaRepository: Repository<Tema>,
        @InjectRepository(Materia)
        private readonly materiaRepository: Repository<Materia>,
    ) { }

    // Temas de una materia del docente, con cuántas preguntas activas tiene cada uno
    async findByMateria(materiaId: number, docenteId: number) {
        const esDelDocente = await this.materiaRepository.existsBy({
            materia_id: materiaId,
            docente_id: docenteId,
        });

        if (!esDelDocente) {
            throw new NotFoundException('Materia no encontrada');
        }

        const filas = await this.temaRepository
            .createQueryBuilder('tema')
            .leftJoin('tema.preguntas', 'pregunta', 'pregunta.activo = true')
            .select('tema.tema_id', 'tema_id')
            .addSelect('tema.nombre_tema', 'nombre_tema')
            .addSelect('COUNT(pregunta.pregunta_id)', 'total_preguntas')
            .where('tema.materia_id = :materiaId', { materiaId })
            .groupBy('tema.tema_id')
            .addGroupBy('tema.nombre_tema')
            .orderBy('tema.nombre_tema', 'ASC')
            .getRawMany<{
                tema_id: number;
                nombre_tema: string;
                total_preguntas: string;
            }>();

        return filas.map((fila) => ({
            tema_id: Number(fila.tema_id),
            nombre_tema: fila.nombre_tema,
            materia_id: materiaId,
            total_preguntas: Number(fila.total_preguntas),
        }));
    }
}