import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pregunta } from './entity/pregunta.entity';
import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';

@Injectable()
export class PreguntaService {
    constructor(
        @InjectRepository(Pregunta)
        private readonly preguntaRepository: Repository<Pregunta>,
        @InjectRepository(ExamenPregunta)
        private readonly examenPreguntaRepository: Repository<ExamenPregunta>,
    ) { }

    // Banco del docente: solo preguntas activas de temas de SUS materias
    async findAll(docenteId: number, materiaId?: number) {
        const consulta = this.preguntaRepository
            .createQueryBuilder('pregunta')
            .innerJoinAndSelect('pregunta.tema', 'tema')
            .innerJoinAndSelect('tema.materia', 'materia')
            .leftJoinAndSelect('pregunta.incisos', 'inciso')
            .where('materia.docente_id = :docenteId', { docenteId })
            .andWhere('pregunta.activo = true')
            .orderBy('pregunta.pregunta_id', 'DESC');

        if (materiaId !== undefined) {
            consulta.andWhere('materia.materia_id = :materiaId', { materiaId });
        }

        const preguntas = await consulta.getMany();

        if (preguntas.length === 0) {
            return [];
        }

        const ids = preguntas.map((pregunta) => pregunta.pregunta_id);

        const usos = await this.examenPreguntaRepository
            .createQueryBuilder('ep')
            .select('ep.pregunta_id', 'pregunta_id')
            .addSelect('COUNT(*)', 'total')
            .where('ep.pregunta_id IN (:...ids)', { ids })
            .groupBy('ep.pregunta_id')
            .getRawMany<{ pregunta_id: number; total: string }>();

        const usoPorPregunta = new Map(
            usos.map((uso) => [Number(uso.pregunta_id), Number(uso.total)]),
        );

        return preguntas.map((pregunta) => {
            const incisos = pregunta.incisos ?? [];
            const tipos = [...new Set(incisos.map((inciso) => inciso.tipo_respuesta))];

            return {
                pregunta_id: pregunta.pregunta_id,
                enunciado: pregunta.enunciado,
                dificultad: pregunta.dificultad,
                // un solo tipo => ese tipo; varios => 'mixta'
                tipo_respuesta:
                    tipos.length === 0 ? null : tipos.length === 1 ? tipos[0] : 'mixta',
                puntaje_total: incisos.reduce(
                    (suma, inciso) => suma + Number(inciso.puntaje_max),
                    0,
                ),
                tema: {
                    tema_id: pregunta.tema.tema_id,
                    nombre_tema: pregunta.tema.nombre_tema,
                },
                materia: {
                    materia_id: pregunta.tema.materia.materia_id,
                    nombre: pregunta.tema.materia.nombre,
                },
                usada_en: usoPorPregunta.get(pregunta.pregunta_id) ?? 0,
            };
        });
    }
}